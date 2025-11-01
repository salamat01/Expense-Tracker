import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    const { expenses, segments, incomes, isLoading } = useData();
    const { startDate: initialStartDate, endDate: initialEndDate } = getDefaultDateRange();

    // State for filters
    const [filterType, setFilterType] = useState<'month' | 'dateRange'>('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    
    // Extracted date range logic
    const dateRange = useMemo(() => {
        let start: Date, end: Date;
        try {
            if (filterType === 'month') {
                if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
                    throw new Error("Invalid month format");
                }
                start = new Date(selectedMonth + '-01T00:00:00');
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            } else {
                start = new Date(startDate);
                end = new Date(endDate);
            }
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                 throw new Error("Invalid date range created");
            }
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
                if (!expense || !expense.dateTime || typeof expense.amount !== 'number') return false;
                try {
                    const expenseDate = new Date(expense.dateTime);
                    return !isNaN(expenseDate.getTime()) && expenseDate >= start && expenseDate <= end;
                } catch { return false; }
            })
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [expenses, dateRange]);
    
    // Filter incomes for the same period
    const filteredIncomes = useMemo(() => {
        const { start, end } = dateRange;
        return (incomes || []).filter(income => {
            if (!income || !income.date || typeof income.amount !== 'number') return false;
            try {
                // income.date is YYYY-MM-DD. Treat as local time to match filters.
                const incomeDate = new Date(income.date + "T00:00:00");
                return !isNaN(incomeDate.getTime()) && incomeDate >= start && incomeDate <= end;
            } catch { return false; }
        });
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
            if (!expense.segmentId) return;
            const segmentData = spendingMap.get(expense.segmentId);
            if (segmentData) {
                segmentData.value += expense.amount;
            }
        });
        return Array.from(spendingMap.values()).filter(item => item.value > 0);
    }, [filteredExpenses, segments]);

    // PDF Generation
    const handleExportPDF = () => {
        const doc = new jsPDF();
        const { start: reportStartDate, end: reportEndDate } = dateRange;
    
        doc.setFontSize(20);
        doc.text("Expense Report", 14, 22);
        doc.setFontSize(12);
        doc.text(`Period: ${reportStartDate.toLocaleDateString()} to ${reportEndDate.toLocaleDateString()}`, 14, 30);

        (doc as any).autoTable({
            startY: 40,
            head: [['Summary', 'Amount (BDT)']],
            body: [
                ['Total Income', `+ ${totalFilteredIncomes.toLocaleString()}`],
                ['Total Expenses', `- ${totalFilteredExpenses.toLocaleString()}`],
                ['Remaining Balance', `${remainingBalance.toLocaleString()}`]
            ],
            headStyles: { fillColor: '#4A5568' },
            bodyStyles: { fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' } },
            didParseCell: (data: any) => {
                if(data.row.index === 0) data.cell.styles.textColor = '#10B981';
                if(data.row.index === 1) data.cell.styles.textColor = '#EF4444';
                if(data.row.index === 2) data.cell.styles.textColor = remainingBalance >= 0 ? '#3B82F6' : '#EF4444';
            }
        });

        if (segmentSpending.length > 0) {
            (doc as any).autoTable({
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Spending by Segment', 'Amount (BDT)']],
                body: segmentSpending.map(s => [s.name, s.value.toLocaleString()]),
                headStyles: { fillColor: '#3B82F6' },
                columnStyles: { 1: { halign: 'right' } }
            });
        }
        
        const finalY = (doc as any).lastAutoTable.finalY;

        if (filteredExpenses.length > 0) {
            const getSegmentName = (segmentId: string) => (segments || []).find(s => s.id === segmentId)?.name || 'N/A';
            (doc as any).autoTable({
                startY: finalY + 10,
                head: [['Date', 'Title', 'Segment', 'Amount (BDT)']],
                body: filteredExpenses.map(e => [
                    new Date(e.dateTime).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
                    e.title,
                    getSegmentName(e.segmentId),
                    `- ${e.amount.toLocaleString()}`,
                ]),
                headStyles: { fillColor: '#4A5568' },
                columnStyles: { 3: { halign: 'right', textColor: '#E53E3E', fontStyle: 'bold' } }
            });
        } else {
            doc.text("No expenses recorded for this period.", 14, finalY + 10);
        }

        doc.save(`Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-200">Dashboard</h1>

            {/* Filter Controls */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Filter Expenses</h2>
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

            {/* Expense Distribution Pie Chart */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Expense Distribution</h2>
                {segmentSpending.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={segmentSpending}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {segmentSpending.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No expenses with segments recorded for this period.</p>
                )}
            </div>
            
            {/* Expense Details & Total */}
            <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Filtered Expenses</h2>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Period Total</p>
                        <p className="font-bold text-xl text-red-600">{totalFilteredExpenses.toLocaleString()} BDT</p>
                    </div>
                </div>
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
                                            {new Date(expense.dateTime).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-base text-red-600">- {expense.amount.toLocaleString()} <span className="text-xs text-red-500/80">BDT</span></p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No expenses recorded for this period.</p>
                )}
            </div>

             {/* PDF Export */}
            <div className="bg-brand-surface dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Generate Report</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">A PDF report will be generated for the selected filter period.</p>
                <button onClick={handleExportPDF} className="w-full bg-gradient-to-r from-brand-primary to-blue-400 hover:from-blue-400 hover:to-brand-primary text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                    Download PDF
                </button>
            </div>
        </div>
    );
};

export default DashboardPage;
