
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