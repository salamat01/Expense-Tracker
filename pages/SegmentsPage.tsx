
import React, { useState, useMemo, useEffect } from 'react';
import type { Segment } from '../types';
import { useData } from '../contexts/DataContext';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import CalculatorIcon from '../components/icons/CalculatorIcon';
import Calculator from '../components/Calculator';

const SegmentsPage: React.FC = () => {
  const { segments, expenses, incomes, addSegment, updateSegment, deleteSegment } = useData();
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

  const [name, setName] = useState('');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);

  const totalAllocated = useMemo(() => segments.reduce((sum, s) => sum + s.allocatedAmount, 0), [segments]);
  const unallocatedIncome = totalIncome - totalAllocated;
  
  const segmentExpenses = useMemo(() => {
    const map: { [key: string]: number } = {};
    segments.forEach(s => map[s.id] = 0);
    expenses.forEach(e => {
      if (e.segmentId && map[e.segmentId] !== undefined) {
        map[e.segmentId] += e.amount;
      }
    });
    return map;
  }, [segments, expenses]);

  useEffect(() => {
    if (!allocatedAmount) {
      setValidationError(null);
      return;
    }

    const newAmount = parseFloat(allocatedAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      setValidationError("Please enter a valid positive amount.");
      return;
    }

    let potentialTotalAllocated: number;
    if (editingSegment) {
      const oldAmount = editingSegment.allocatedAmount;
      potentialTotalAllocated = totalAllocated - oldAmount + newAmount;
    } else {
      potentialTotalAllocated = totalAllocated + newAmount;
    }

    if (potentialTotalAllocated > totalIncome) {
      setValidationError(
        `This would cause total allocation (${potentialTotalAllocated.toLocaleString()} BDT) to exceed total income (${totalIncome.toLocaleString()} BDT).`
      );
    } else {
      setValidationError(null);
    }
  }, [allocatedAmount, editingSegment, totalAllocated, totalIncome]);

  useEffect(() => {
    if (editingSegment) {
      setName(editingSegment.name);
      setAllocatedAmount(String(editingSegment.allocatedAmount));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingSegment]);

  const handleCancelEdit = () => {
    setEditingSegment(null);
    setName('');
    setAllocatedAmount('');
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) {
      return; // Prevent submission if there's a validation error
    }
    if (name && allocatedAmount) {
      const segmentData = { name, allocatedAmount: parseFloat(allocatedAmount) };
      if (editingSegment) {
        updateSegment(editingSegment.id, segmentData);
        handleCancelEdit();
      } else {
        addSegment(segmentData);
        setName('');
        setAllocatedAmount('');
      }
    }
  };

  const handleDelete = (id: string) => {
    if(window.confirm('Are you sure you want to delete this segment? This is only possible if no expenses are assigned to it.')) {
      deleteSegment(id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSegmentId(prev => prev === id ? null : id);
  }

  return (
    <>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-sky-500 to-cyan-500 text-transparent bg-clip-text">Budget Segments</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 hidden lg:block">Financial Overview</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-brand-surface dark:bg-gray-800 p-3 rounded-xl shadow-md flex flex-col items-center justify-center aspect-square">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Total Income</h3>
                <p className="text-xl font-bold text-green-600 mt-1">{totalIncome.toLocaleString()} BDT</p>
              </div>
              <div className="bg-brand-surface dark:bg-gray-800 p-3 rounded-xl shadow-md flex flex-col items-center justify-center aspect-square">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Total Allocated</h3>
                <p className="text-xl font-bold text-yellow-600 mt-1">{totalAllocated.toLocaleString()} BDT</p>
              </div>
              <div className="bg-brand-surface dark:bg-gray-800 p-3 rounded-xl shadow-md flex flex-col items-center justify-center aspect-square">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Unallocated</h3>
                <p className={`text-xl font-bold ${unallocatedIncome >= 0 ? 'text-blue-600 dark:text-sky-400' : 'text-red-600'} mt-1`}>{unallocatedIncome.toLocaleString()} BDT</p>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-surface dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">{editingSegment ? 'Edit Segment' : 'Create New Segment'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="segment-name" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Segment Name</label>
                <input
                  id="segment-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Groceries"
                  required
                  className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-segment focus:border-brand-segment"
                />
              </div>
              <div>
                <label htmlFor="segment-amount" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Allocated Amount (BDT)</label>
                <input
                  id="segment-amount"
                  type="number"
                  value={allocatedAmount}
                  onChange={(e) => setAllocatedAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  min="0"
                  className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-segment focus:border-brand-segment"
                />
                {validationError && <p className="mt-2 text-sm text-red-600">{validationError}</p>}
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={!!validationError}
                  className="w-full bg-gradient-to-r from-brand-segment to-sky-400 hover:from-sky-400 hover:to-brand-segment text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {editingSegment ? 'Update Segment' : 'Create Segment'}
                </button>
                {editingSegment && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Your Segments</h2>
          {segments.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8 bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md">No segments created yet.</p>
          ) : segments.map(segment => {
            const spent = segmentExpenses[segment.id] || 0;
            const remaining = segment.allocatedAmount - spent;
            const percentage = segment.allocatedAmount > 0 ? (spent / segment.allocatedAmount) * 100 : 0;
            const relatedExpenses = expenses.filter(e => e.segmentId === segment.id).sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
            const isExpanded = expandedSegmentId === segment.id;

            return (
              <div key={segment.id} className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md transition-all duration-300">
                <div className="p-4 cursor-pointer" onClick={() => toggleExpand(segment.id)}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{segment.name}</h3>
                    <div className="flex items-center space-x-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditingSegment(segment); }} className="text-gray-500 dark:text-gray-400 hover:text-brand-segment p-1" aria-label="Edit segment"><EditIcon /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(segment.id); }} className="text-gray-500 dark:text-gray-400 hover:text-brand-secondary p-1" aria-label="Delete segment"><TrashIcon/></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allocated: {segment.allocatedAmount.toLocaleString()} BDT</p>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 my-2">
                      <div className="bg-gradient-to-r from-brand-segment to-cyan-400 h-2.5 rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                  </div>

                  <div className="flex justify-between text-sm mt-2 font-medium">
                      <span className="text-red-600">Spent: {spent.toLocaleString()} BDT</span>
                      <span className={`${remaining >= 0 ? 'text-green-600' : 'text-orange-500'}`}>
                        Remaining: {remaining.toLocaleString()} BDT
                      </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-2">Related Expenses</h4>
                    {relatedExpenses.length > 0 ? (
                      <ul className="space-y-2">
                        {relatedExpenses.map(exp => (
                          <li key={exp.id} className="flex justify-between items-center text-sm">
                            <div>
                              <p className="text-gray-700 dark:text-gray-300">{exp.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(exp.dateTime).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'short', timeStyle: 'short' })}</p>
                            </div>
                            <p className="font-mono text-red-600">- {exp.amount.toLocaleString()} BDT</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No expenses for this segment yet.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <button
        onClick={() => setIsCalculatorVisible(true)}
        className="fixed bottom-20 right-4 bg-brand-primary text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-transform transform hover:scale-110 z-30"
        aria-label="Open calculator"
      >
        <CalculatorIcon />
      </button>
      {isCalculatorVisible && <Calculator onClose={() => setIsCalculatorVisible(false)} />}
    </>
  );
};

export default SegmentsPage;
