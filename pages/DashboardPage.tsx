
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, Tooltip as PieTooltip } from 'recharts';
import { useData } from '../contexts/DataContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const getMonthDateRange = () => {
  const start = new Date();
  start.setDate(1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const DashboardPage: React.FC = () => {
  const { incomes, expenses, segments } = useData();
  const { startDate: initialStartDate, endDate: initialEndDate } = getMonthDateRange();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  
  const totalIncome = useMemo(() => incomes.reduce((sum, i) => sum + i.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const barChartData = [
    { name: 'Summary', Income: totalIncome, Expenses: totalExpenses, Balance: totalIncome - totalExpenses },
  ];

  const segmentExpenseData = useMemo(() => {
    const segmentMap: { [key: string]: { name: string; value: number; color: string } } = {};
    segments.forEach(s => {
      segmentMap[s.id] = { name: s.name, value: 0, color: s.color };
    });

    expenses.forEach(e => {
      if (segmentMap[e.segmentId]) {
        segmentMap[e.segmentId].value += e.amount;
      }
    });

    const data = Object.values(segmentMap).filter(d => d.value > 0);
    return data;
  }, [expenses, segments]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
          <p className="font-bold text-gray-800 dark:text-gray-200">{`${label}`}</p>
          <p className="text-green-500">{`Income: ${payload[0].value.toLocaleString()} BDT`}</p>
          <p className="text-red-500">{`Expenses: ${payload[1].value.toLocaleString()} BDT`}</p>
           <p className="text-blue-500">{`Balance: ${payload[2].value.toLocaleString()} BDT`}</p>
        </div>
      );
    }
    return null;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);

    const filteredIncomes = incomes.filter(i => {
      const incomeDate = new Date(i.date);
      return incomeDate >= start && incomeDate <= end;
    });

    const filteredExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.dateTime);
      return expenseDate >= start && expenseDate <= end;
    });
    
    const reportTotalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
    const reportTotalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const reportBalance = reportTotalIncome - reportTotalExpenses;
    
    // Header
    doc.setFontSize(20);
    doc.text("Zenith Expense Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, 14, 30);

    // Summary
    doc.setFontSize(14);
    doc.text("Financial Summary", 14, 45);
    doc.setFontSize(12);
    (doc as any).autoTable({
        startY: 50,
        body: [
            ['Total Income', `${reportTotalIncome.toLocaleString()} BDT`],
            ['Total Expenses', `${reportTotalExpenses.toLocaleString()} BDT`],
            ['Balance', `${reportBalance.toLocaleString()} BDT`],
        ],
        theme: 'grid',
        styles: {
            cellPadding: 2,
            fontSize: 11,
            valign: 'middle',
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' }
        },
        didParseCell: function (data) {
            if (data.row.index === 0 && data.column.index === 1) data.cell.styles.textColor = '#28a745';
            if (data.row.index === 1 && data.column.index === 1) data.cell.styles.textColor = '#dc3545';
            if (data.row.index === 2 && data.column.index === 1) data.cell.styles.textColor = reportBalance >= 0 ? '#007bff' : '#dc3545';
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Income Table
    if (filteredIncomes.length > 0) {
      (doc as any).autoTable({
        startY: finalY + 15,
        head: [['Date', 'Title', 'Amount (BDT)']],
        body: filteredIncomes.map(i => [
          new Date(i.date).toLocaleDateString(),
          i.title,
          `+ ${i.amount.toLocaleString()}`,
        ]),
        headStyles: { fillColor: '#10B981' },
        columnStyles: { 2: { halign: 'right', textColor: '#166534', fontStyle: 'bold' } }
      });
    }

    const getSegmentName = (segmentId: string) => {
      const segment = segments.find(s => s.id === segmentId);
      return segment ? segment.name : 'Unknown';
    };

    // Expenses Table
    if(filteredExpenses.length > 0) {
        (doc as any).autoTable({
            startY: (doc as any).lastAutoTable.finalY + (filteredIncomes.length > 0 ? 10 : 15),
            head: [['Date', 'Title', 'Segment', 'Amount (BDT)']],
            body: filteredExpenses.map(e => [
                new Date(e.dateTime).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
                e.title,
                getSegmentName(e.segmentId),
                `- ${e.amount.toLocaleString()}`,
            ]),
            headStyles: { fillColor: '#EF4444' },
            columnStyles: { 3: { halign: 'right', textColor: '#B91C1C', fontStyle: 'bold' } }
        });
    }

    doc.save(`Zenith_Report_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">Dashboard</h1>
      
      <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-700 dark:text-gray-300">Financial Summary</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(156, 163, 175, 0.1)'}}/>
              <Legend wrapperStyle={{color: '#4b5563'}}/>
              <Bar dataKey="Income" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-brand-surface dark:bg-gray-800 p-4 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-700 dark:text-gray-300">Expense Distribution</h2>
        {segmentExpenseData.length > 0 ? (
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentExpenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="var(--brand-surface-dark)"
                >
                  {segmentExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <PieTooltip formatter={(value: number) => `${value.toLocaleString()} BDT`}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">No expenses recorded to display distribution.</p>
        )}
      </div>

      <div className="bg-brand-surface dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Generate PDF Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Start Date</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-600 dark:text-gray-400">End Date</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>
        </div>
        <button
          onClick={handleExportPDF}
          className="w-full bg-gradient-to-r from-brand-primary to-blue-400 hover:from-blue-400 hover:to-brand-primary text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
        >
          Generate & Download PDF
        </button>
      </div>

    </div>
  );
};

export default DashboardPage;