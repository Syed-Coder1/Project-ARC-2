export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'employee';
  createdAt: Date;
  lastLogin?: Date;
}

export interface Client {
  id: string;
  name: string;
  cnic: string;
  password: string;
  type: 'IRIS' | 'SECP' | 'PRA' | 'Other';
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receipt {
  id: string;
  clientName: string;
  clientCnic: string;
  amount: number;
  natureOfWork: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'online';
  date: Date;
  createdAt: Date;
  createdBy: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'office' | 'utilities' | 'supplies' | 'maintenance' | 'food' | 'rent' | 'salary' | 'other';
  date: Date;
  createdAt: Date;
  createdBy: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: Date;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  activeClients: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentReceipts: Receipt[];
}

export interface Whiteboard {
  id: string;
  name: string;
  location: string;
  content: WhiteboardContent;
  template?: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt: Date;
  createdBy: string;
}

export interface WhiteboardContent {
  elements: WhiteboardElement[];
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
}

export interface WhiteboardElement {
  id: string;
  type: 'text' | 'shape' | 'arrow' | 'sticky' | 'image' | 'drawing' | 'rectangle' | 'circle' | 'triangle';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  style: {
    color: string;
    backgroundColor: string;
    fontSize?: number;
    strokeWidth?: number;
    opacity?: number;
  };
  rotation?: number;
  zIndex: number;
}

export interface WhiteboardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  content: WhiteboardContent;
}