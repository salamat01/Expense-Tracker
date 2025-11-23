
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AppData } from '../types';

// Helper to get current month's start/end dates in YYYY-MM-DD format
const getDefaultDateRange = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
    };
};

// Custom Tooltip for Pie Chart
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <p className="font-bold" style={{ color: data.color }}>{data.name}</p>
                <p className="text-sm">{`Amount: ${data.value.toLocaleString()} BDT`}</p>
                <p className="text-sm">{`Percentage: ${(payload[0].percent * 100).toFixed(2)}%`}</p>
            </div>
        );
    }
    return null;
};


const DashboardPage: React.FC = () => {
    const { expenses, segments, incomes, isLoading, replaceAllData } = useData();
    const { startDate: initialStartDate, endDate: initialEndDate } = getDefaultDateRange();

    // State for filters
    const [filterType, setFilterType] = useState<'month' | 'dateRange'>('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Extracted date range logic
    const dateRange = useMemo(() => {
        let start: Date, end: Date;
        try {
            if (filterType === 'month') {
                start = new Date(selectedMonth + '-01T00:00:00');
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            } else {
                start = new Date(startDate);
                end = new Date(endDate);
            }
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } catch (e) {
            console.error("Date parsing error, using default range:", e);
            const range = getDefaultDateRange();
            start = new Date(range.startDate);
            end = new Date(range.endDate);
        }
        return { start, end };
    }, [filterType, selectedMonth, startDate, endDate]);

    // Robustly filter expenses based on the selected period
    const filteredExpenses = useMemo(() => {
        const { start, end } = dateRange;
        return (expenses || [])
            .filter(expense => {
                try {
                    const expenseDate = new Date(expense.dateTime);
                    return expenseDate >= start && expenseDate <= end;
                } catch { return false; }
            })
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [expenses, dateRange]);
    
    // Filter incomes for the same period
    const filteredIncomes = useMemo(() => {
        const { start, end } = dateRange;
        return (incomes || []).filter(income => {
            try {
                const incomeDate = new Date(income.date + "T00:00:00");
                return incomeDate >= start && incomeDate <= end;
            } catch { return false; }
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [incomes, dateRange]);

    // Calculate totals and segment spending
    const totalFilteredExpenses = useMemo(() => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0), [filteredExpenses]);
    const totalFilteredIncomes = useMemo(() => filteredIncomes.reduce((sum, income) => sum + income.amount, 0), [filteredIncomes]);
    const remainingBalance = totalFilteredIncomes - totalFilteredExpenses;

    const segmentSpending = useMemo(() => {
        const spendingMap = new Map<string, { name: string; value: number; color: string }>();
        (segments || []).forEach(segment => {
            spendingMap.set(segment.id, { name: segment.name, value: 0, color: segment.color });
        });
        filteredExpenses.forEach(expense => {
            const segmentData = spendingMap.get(expense.segmentId);
            if (segmentData) {
                segmentData.value += expense.amount;
            }
        });
        return Array.from(spendingMap.values()).filter(item => item.value > 0);
    }, [filteredExpenses, segments]);

    const summaryChartData = useMemo(() => [
        { name: 'Income', amount: totalFilteredIncomes, fill: '#10B981' },
        { name: 'Expenses', amount: totalFilteredExpenses, fill: '#EF4444' }
    ], [totalFilteredIncomes, totalFilteredExpenses]);


    const handleExportPDF = async () => {
        setIsGeneratingPdf(true);
    
        try {
            const doc = new jsPDF();
            
            // Use standard font to avoid encoding errors with custom fonts
            doc.setFont("helvetica", "normal");
    
            // Report Title and Date Range
            doc.setFontSize(18);
            doc.text("Financial Report", 14, 22);
            
            doc.setFontSize(11);
            doc.setTextColor(100);
            const dateRangeString = `Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
            doc.text(dateRangeString, 14, 29);
    
            let finalY = 35;

            // Financial Summary Section
            const summaryData = [
                ['Total Income:', `${totalFilteredIncomes.toLocaleString()} BDT`],
                ['Total Expenses:', `${totalFilteredExpenses.toLocaleString()} BDT`],
                ['Remaining Balance:', `${remainingBalance.toLocaleString()} BDT`]
            ];
    
            autoTable(doc, {
                startY: finalY,
                body: summaryData,
                theme: 'plain',
                styles: { fontSize: 11 },
                columnStyles: { 0: { fontStyle: 'bold', halign: 'right', cellWidth: 50 }, 1: { halign: 'left' } },
                margin: { left: 14 }
            });

            finalY = (doc as any).lastAutoTable.finalY + 10;

            // Segment Breakdown Table
            if (segments.length > 0) {
                const segmentRows = segments.map(segment => {
                    const spentInPeriod = filteredExpenses
                        .filter(e => e.segmentId === segment.id)
                        .reduce((sum, e) => sum + e.amount, 0);
                    
                    return [
                        segment.name,
                        segment.allocatedAmount.toLocaleString(),
                        spentInPeriod.toLocaleString(),
                        (segment.allocatedAmount - spentInPeriod).toLocaleString()
                    ];
                });

                // Sort by spent amount in descending order to show biggest expenses first
                segmentRows.sort((a, b) => {
                    const spentA = parseFloat(String(a[2]).replace(/,/g, ''));
                    const spentB = parseFloat(String(b[2]).replace(/,/g, ''));
                    return spentB - spentA;
                });

                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text("Budget Segments Breakdown", 14, finalY);
                finalY += 6;

                autoTable(doc, {
                    startY: finalY,
                    head: [['Segment', 'Allocated (BDT)', 'Spent (BDT)', 'Remaining (BDT)']],
                    body: segmentRows,
                    theme: 'striped',
                    headStyles: { fillColor: [56, 189, 248], textColor: 255, fontStyle: 'bold' },
                });

                finalY = (doc as any).lastAutoTable.finalY + 10;
            }
    
            // Expenses Table
            if (filteredExpenses.length > 0) {
                const expenseRows = filteredExpenses.map(exp => {
                    const segment = segments.find(s => s.id === exp.segmentId);
                    return [
                        new Date(exp.dateTime).toLocaleDateString(),
                        exp.title,
                        segment ? segment.name : 'N/A',
                        exp.amount.toLocaleString()
                    ];
                });

                // Check if we need a page break
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text("Expense Details", 14, finalY);
                finalY += 6;
    
                autoTable(doc, {
                    startY: finalY,
                    head: [['Date', 'Title', 'Segment', 'Amount (BDT)']],
                    body: expenseRows,
                    theme: 'striped',
                    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
                });

                finalY = (doc as any).lastAutoTable.finalY + 10;
            }
    
            // Incomes Table
            if (filteredIncomes.length > 0) {
                const incomeRows = filteredIncomes.map(inc => [
                    new Date(inc.date).toLocaleDateString(),
                    inc.title,
                    inc.amount.toLocaleString()
                ]);

                 // Check if we need a page break
                 if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setFontSize(14);
                doc.setTextColor(0);
                doc.text("Income Details", 14, finalY);
                finalY += 6;
    
                autoTable(doc, {
                    startY: finalY,
                    head: [['Date', 'Title', 'Amount (BDT)']],
                    body: incomeRows,
                    theme: 'striped',
                    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                });
            }
    
            const timestamp = new Date().toISOString().slice(0, 10);
            doc.save(`Shuvo-Expense-Report-${timestamp}.pdf`);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("An error occurred while generating the PDF report.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleExportExcel = () => {
        const worksheetName = 'Report';
        
        let tableHtml = `
            <thead>
                <tr><th colspan="4" style="font-weight:bold; font-size:18px; text-align:center;">Financial Report</th></tr>
                <tr><th colspan="4" style="text-align:center;">Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}</th></tr>
                <tr><th colspan="4">&nbsp;</th></tr>
            </thead>
            <tbody>
                <tr><td colspan="2" style="font-weight:bold; font-size:14px;">Financial Summary</td></tr>
                <tr><td>Total Income (BDT)</td><td>${totalFilteredIncomes.toLocaleString()}</td></tr>
                <tr><td>Total Expenses (BDT)</td><td>${totalFilteredExpenses.toLocaleString()}</td></tr>
                <tr><td style="font-weight:bold;">Remaining Balance (BDT)</td><td style="font-weight:bold;">${remainingBalance.toLocaleString()}</td></tr>
                <tr><td colspan="4">&nbsp;</td></tr>`;
    
        if (segments.length > 0) {
             tableHtml += `
                <tr><td colspan="4" style="font-weight:bold; font-size:14px;">Budget Segments Breakdown</td></tr>
                <tr style="background-color:#f2f2f2; font-weight:bold;">
                    <td>Segment</td>
                    <td>Allocated</td>
                    <td>Spent</td>
                    <td>Remaining</td>
                </tr>`;
            segments.forEach(seg => {
                const spent = filteredExpenses.filter(e => e.segmentId === seg.id).reduce((sum, e) => sum + e.amount, 0);
                tableHtml += `
                    <tr>
                        <td>${seg.name}</td>
                        <td>${seg.allocatedAmount.toLocaleString()}</td>
                        <td>${spent.toLocaleString()}</td>
                        <td>${(seg.allocatedAmount - spent).toLocaleString()}</td>
                    </tr>`;
            });
            tableHtml += `<tr><td colspan="4">&nbsp;</td></tr>`;
        }

        if (filteredExpenses.length > 0) {
            tableHtml += `
                <tr><td colspan="4" style="font-weight:bold; font-size:14px;">Expense Details</td></tr>
                <tr style="background-color:#f2f2f2; font-weight:bold;">
                    <td>Date</td>
                    <td>Title</td>
                    <td>Segment</td>
                    <td>Amount (BDT)</td>
                </tr>`;
            filteredExpenses.forEach(exp => {
                const segment = segments.find(s => s.id === exp.segmentId);
                tableHtml += `
                    <tr>
                        <td>${new Date(exp.dateTime).toLocaleDateString()}</td>
                        <td>${exp.title}</td>
                        <td>${segment ? segment.name : 'N/A'}</td>
                        <td>${exp.amount.toLocaleString()}</td>
                    </tr>`;
            });
            tableHtml += `<tr><td colspan="4">&nbsp;</td></tr>`;
        }
    
        if (filteredIncomes.length > 0) {
            tableHtml += `
                <tr><td colspan="3" style="font-weight:bold; font-size:14px;">Income Details</td></tr>
                <tr style="background-color:#f2f2f2; font-weight:bold;">
                    <td>Date</td>
                    <td>Title</td>
                    <td>Amount (BDT)</td>
                </tr>`;
            filteredIncomes.forEach(inc => {
                tableHtml += `
                    <tr>
                        <td>${new Date(inc.date + "T00:00:00").toLocaleDateString()}</td>
                        <td>${inc.title}</td>
                        <td>${inc.amount.toLocaleString()}</td>
                    </tr>`;
            });
        }
    
        tableHtml += `</tbody>`;
    
        const excelHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>${worksheetName}</x:Name>
                                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
            </head>
            <body>
                <table>${tableHtml}</table>
            </body>
            </html>`;
    
        try {
            const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const timestamp = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `Shuvo-Expense-Report-${timestamp}.xls`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error("Failed to export Excel:", error);
            alert("An error occurred while exporting the Excel file.");
        }
    };
    
    // Data Management
    const handleExportData = () => {
        try {
            const appData: AppData = { incomes, expenses, segments };
            const jsonString = JSON.stringify(appData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `shuvo-expense-tracker-backup-${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("An error occurred while exporting your data.");
        }
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            alert("Please select a valid JSON backup file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File could not be read.");
                const data = JSON.parse(text);
                if (window.confirm("Are you sure you want to import this data? This will overwrite all your current data.")) {
                    replaceAllData(data);
                }
            } catch (error) {
                console.error("Failed to import data:", error);
                alert("Failed to import data. The file might be corrupted or in the wrong format.");
            } finally {
                event.target.value = ''; 
            }
        };
        reader.readAsText(file);
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-200">Dashboard</h1>

            {/* Filter Controls */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Filter Data</h2>
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button onClick={() => setFilterType('month')} className={`px-4 py-2 font-medium text-sm transition-colors ${filterType === 'month' ? 'border-b-2 border-brand-primary text-brand-primary dark:text-sky-400 dark:border-sky-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        By Month
                    </button>
                    <button onClick={() => setFilterType('dateRange')} className={`px-4 py-2 font-medium text-sm transition-colors ${filterType === 'dateRange' ? 'border-b-2 border-brand-primary text-brand-primary dark:text-sky-400 dark:border-sky-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        By Date Range
                    </button>
                </div>
                {filterType === 'month' ? (
                    <div>
                        <label htmlFor="month-select" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Select Month</label>
                        <input id="month-select" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Start Date</label>
                            <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-gray-600 dark:text-gray-400">End Date</label>
                            <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                        </div>
                    </div>
                )}
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 dark:bg-green-900/40 p-4 rounded-xl shadow-md">
                <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Total Income</h3>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200 mt-1">{totalFilteredIncomes.toLocaleString()} BDT</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/40 p-4 rounded-xl shadow-md">
                <h3 className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses</h3>
                <p className="text-2xl font-bold text-red-800 dark:text-red-200 mt-1">{totalFilteredExpenses.toLocaleString()} BDT</p>
              </div>
              <div className={`p-4 rounded-xl shadow-md ${remainingBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-orange-50 dark:bg-orange-900/40'}`}>
                <h3 className={`text-sm font-medium ${remainingBalance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>Balance</h3>
                <p className={`text-2xl font-bold mt-1 ${remainingBalance >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}>{remainingBalance.toLocaleString()} BDT</p>
              </div>
            </div>

            {/* Income vs Expense Bar Chart */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Income vs. Expense</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summaryChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis width={80} tickFormatter={(value) => `${(value as number).toLocaleString()}`} />
                        <Tooltip
                            cursor={{fill: 'rgba(128, 128, 128, 0.1)'}}
                            contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                                backdropFilter: 'blur(5px)',
                                border: '1px solid #ccc',
                                borderRadius: '0.5rem'
                            }}
                            formatter={(value: number) => [`${value.toLocaleString()} BDT`, null]}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {summaryChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Expense Distribution Pie Chart */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Expense Distribution</h2>
                {segmentSpending.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={segmentSpending} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name">
                                {segmentSpending.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No expenses recorded for this period.</p>
                )}
            </div>
            
            {/* Expense Details List */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Expense Details (Total: {totalFilteredExpenses.toLocaleString()} BDT)
                </h2>
                {filteredExpenses.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                        {filteredExpenses.map(expense => {
                            const segment = segments.find(s => s.id === expense.segmentId);
                            return (
                                <li key={expense.id} className="py-3 flex justify-between items-center">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-base text-gray-800 dark:text-gray-200 truncate">{expense.title}</p>
                                            {segment && (
                                                <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: `${segment.color}20`, color: segment.color }}>
                                                    {segment.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(expense.dateTime).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <p className="font-bold text-base text-red-600">
                                        - {expense.amount.toLocaleString()} BDT
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No expenses recorded for this period.</p>
                )}
            </div>

            {/* Income Details List */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                    Income Details (Total: {totalFilteredIncomes.toLocaleString()} BDT)
                </h2>
                {filteredIncomes.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                        {filteredIncomes.map(income => (
                            <li key={income.id} className="py-3 flex justify-between items-center">
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-200 truncate">{income.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {new Date(income.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <p className="font-bold text-base text-green-600">
                                    + {income.amount.toLocaleString()} BDT
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No income recorded for this period.</p>
                )}
            </div>

             {/* Reports & Data */}
             <div className="bg-brand-surface dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Reports & Data</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Export your filtered data as a PDF or Excel file, or backup/restore all application data.
                </p>

                <div className="space-y-4">
                    {/* Report Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={handleExportPDF} disabled={isGeneratingPdf} className="w-full bg-gradient-to-r from-brand-primary to-blue-400 hover:from-blue-400 hover:to-brand-primary text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                            {isGeneratingPdf ? 'Generating...' : 'Download PDF Report'}
                        </button>
                        <button onClick={handleExportExcel} className="w-full bg-gradient-to-r from-green-600 to-teal-500 hover:from-teal-500 hover:to-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                            Export to Excel
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 uppercase">Data Backup</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    </div>

                    {/* Data Management Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={handleExportData} className="flex-1 bg-gradient-to-r from-gray-700 to-slate-600 hover:from-slate-600 hover:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                            Export Backup
                        </button>
                        <label htmlFor="import-file" className="flex-1 text-center bg-gradient-to-r from-gray-500 to-slate-500 hover:from-slate-500 hover:to-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 cursor-pointer flex items-center justify-center">
                            Import Backup
                        </label>
                        <input id="import-file" type="file" className="hidden" accept=".json,application/json" onChange={handleImportData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
