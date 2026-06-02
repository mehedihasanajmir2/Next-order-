export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  productName: string;
  quantity: number;
  size: string;
  color: string;
  price: number; // Total order value or unit price (will display total order value)
  deliveryCharge?: number; // Delivery shipping charge
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  district?: string;
  thana?: string;
  images?: string[]; // Array of base64 compressed images
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  sku?: string;
  price: number;
  sizeOptions?: string[];
  colorOptions?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  isDemo: boolean;
}
