
export interface Income {
  id: string;
  title: string;
  amount: number;
  date: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  dateTime: string;
  segmentId: string;
}

export interface Segment {
  id: string;
  name: string;
  allocatedAmount: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

// New types for sync queue
export type SyncActionType = 'add' | 'update' | 'delete';
export type DataType = 'income' | 'expense' | 'segment';

export interface SyncAction {
  id: string; // Unique ID for the action itself
  type: SyncActionType;
  dataType: DataType;
  payload: any; // The actual data (Income, Expense, Segment) or just an ID for delete
}
