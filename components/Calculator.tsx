import React, { useState, useRef, useEffect } from 'react';

interface CalculatorProps {
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  // State for dragging
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 160, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const calculatorRef = useRef<HTMLDivElement>(null);
  
  // State for resizing
  const [size, setSize] = useState({ width: 320, height: 480 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  const inputDigit = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForSecondOperand) {
      setDisplayValue('0.');
      setWaitingForSecondOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const clearDisplay = () => {
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  const backspace = () => {
    if (waitingForSecondOperand) return;
    setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (operator && waitingForSecondOperand) {
      setOperator(nextOperator);
      return;
    }

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      setDisplayValue(String(result));
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };
  
  const handleEquals = () => {
    const inputValue = parseFloat(displayValue);
    if (operator && firstOperand !== null) {
      if (waitingForSecondOperand) return;
      const result = calculate(firstOperand, inputValue, operator);
      setDisplayValue(String(result));
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(true);
    }
  };

  const calculate = (first: number, second: number, op: string): number => {
    let result: number;
    switch (op) {
      case '+': result = first + second; break;
      case '-': result = first - second; break;
      case '*': result = first * second; break;
      case '/': result = second === 0 ? Infinity : first / second; break;
      default: result = second;
    }
    // Handle cases like 0.1 + 0.2
    return parseFloat(result.toPrecision(15));
  };

  // --- Dragging Logic ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, .resize-handle')) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // --- Resizing Logic ---
  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { width: size.width, height: size.height };
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const dx = e.clientX - resizeStartPos.current.x;
      const dy = e.clientY - resizeStartPos.current.y;
      const newWidth = resizeStartSize.current.width + dx;
      const newHeight = resizeStartSize.current.height + dy;
      setSize({
        width: Math.max(280, newWidth),
        height: Math.max(400, newHeight)
      });
    }
  };

  const handleResizeMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMouseMove);
      window.addEventListener('mouseup', handleResizeMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
    };
  }, [isResizing]);

  const CalcButton: React.FC<{ onClick: () => void; className?: string; children: React.ReactNode, style?: React.CSSProperties }> = ({ onClick, className = '', children, style }) => (
    <button
      onClick={onClick}
      className={`font-bold rounded-lg shadow-md transition-transform transform hover:scale-105 active:scale-95 text-gray-800 dark:text-gray-200 flex items-center justify-center ${className}`}
      style={style}
    >
      {children}
    </button>
  );

  const buttonFontSize = `${Math.max(16, size.width / 15)}px`;

  return (
    <div
      ref={calculatorRef}
      className="fixed z-50 bg-brand-surface dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 select-none flex flex-col"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      <div
        className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-t-2xl cursor-move flex justify-between items-center px-4 flex-shrink-0"
        onMouseDown={handleMouseDown}
      >
        <span className="font-semibold text-gray-600 dark:text-gray-300">Calculator</span>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-bold text-2xl leading-none">&times;</button>
      </div>
      <div className="p-4 flex flex-col flex-grow min-h-0">
        <div className="bg-gray-200 dark:bg-gray-900 text-right rounded-lg p-4 mb-4 font-mono text-gray-900 dark:text-white flex flex-col justify-end"
             style={{ minHeight: '80px' }}>
          <div className="text-gray-500 dark:text-gray-400 break-words truncate" style={{ fontSize: `${Math.max(16, size.width / 16)}px`, minHeight: '24px' }}>
            {firstOperand !== null && operator ? `${firstOperand} ${operator}` : ''}
          </div>
          <div className="break-all" style={{ fontSize: `${Math.max(20, size.width / 8)}px` }}>
            {displayValue}
          </div>
        </div>
        <div className="grid grid-cols-4 grid-rows-5 gap-2 flex-grow">
          <CalcButton onClick={clearDisplay} className="col-span-2 bg-red-400 hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-700 text-white" style={{ fontSize: buttonFontSize }}>C</CalcButton>
          <CalcButton onClick={backspace} className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500" style={{ fontSize: buttonFontSize }}>&#x232B;</CalcButton>
          <CalcButton onClick={() => performOperation('/')} className="bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white" style={{ fontSize: buttonFontSize }}>&divide;</CalcButton>

          <CalcButton onClick={() => inputDigit('7')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>7</CalcButton>
          <CalcButton onClick={() => inputDigit('8')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>8</CalcButton>
          <CalcButton onClick={() => inputDigit('9')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>9</CalcButton>
          <CalcButton onClick={() => performOperation('*')} className="bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white" style={{ fontSize: buttonFontSize }}>&times;</CalcButton>

          <CalcButton onClick={() => inputDigit('4')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>4</CalcButton>
          <CalcButton onClick={() => inputDigit('5')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>5</CalcButton>
          <CalcButton onClick={() => inputDigit('6')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>6</CalcButton>
          <CalcButton onClick={() => performOperation('-')} className="bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white" style={{ fontSize: buttonFontSize }}>&minus;</CalcButton>

          <CalcButton onClick={() => inputDigit('1')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>1</CalcButton>
          <CalcButton onClick={() => inputDigit('2')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>2</CalcButton>
          <CalcButton onClick={() => inputDigit('3')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>3</CalcButton>
          <CalcButton onClick={() => performOperation('+')} className="bg-yellow-400 hover:bg-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white" style={{ fontSize: buttonFontSize }}>+</CalcButton>
          
          <CalcButton onClick={() => inputDigit('0')} className="col-span-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>0</CalcButton>
          <CalcButton onClick={inputDecimal} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" style={{ fontSize: buttonFontSize }}>.</CalcButton>
          <CalcButton onClick={handleEquals} className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white" style={{ fontSize: buttonFontSize }}>=</CalcButton>
        </div>
      </div>
       <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeMouseDown}
        style={{ zIndex: 10 }}
      >
        <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0V16H0L16 0Z" fill="rgba(156, 163, 175, 0.5)"/>
        </svg>
      </div>
    </div>
  );
};

export default Calculator;