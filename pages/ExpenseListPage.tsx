
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';

const ExpenseListPage: React.FC = () => {
  const navigate = useNavigate();
  const { expenses, segments, deleteExpense } = useData();

  const getSegment = (segmentId: string) => {
    return segments.find(s => s.id === segmentId);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(id);
    }
  };
  
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-500 text-transparent bg-clip-text">Expense History</h1>
        <button
          onClick={() => navigate('/')}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors"
        >
          &larr; Back
        </button>
      </div>

      <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-4">
        {sortedExpenses.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">No expenses have been recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedExpenses.map(expense => {
              const segment = getSegment(expense.segmentId);
              return (
                <li key={expense.id} className="py-3 flex justify-between items-center">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base text-gray-800 dark:text-gray-200 truncate">{expense.title}</p>
                      {segment ? (
                         <span 
                           className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                           style={{ backgroundColor: `${segment.color}20`, color: segment.color }}
                         >
                           {segment.name}
                         </span>
                      ) : (
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                          Unknown
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {`${new Date(expense.dateTime).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })} BST`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-baseline gap-1 text-right">
                        <p className="font-bold text-base text-red-600">
                        - {expense.amount.toLocaleString()}
                        </p>
                        <span className="text-xs text-red-500/80">BDT</span>
                    </div>
                    <button onClick={() => navigate(`/edit-expense/${expense.id}`)} className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0" aria-label="Edit expense">
                      <EditIcon />
                    </button>
                    <button onClick={() => handleDelete(expense.id)} className="text-gray-500 dark:text-gray-400 hover:text-brand-secondary transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0" aria-label="Delete expense">
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ExpenseListPage;
