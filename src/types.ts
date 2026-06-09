export interface Order {
  id: string;
  userId: string;
  shopId?: string; // Optional for backward compatibility but required for new orders per shop
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
  shopId?: string; // Optional for backward compatibility but required for new products per shop
  name: string;
  sku?: string;
  price: number;
  sizeOptions?: string[];
  colorOptions?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface Shop {
  id: string;
  userId: string;
  name: string;
  createdAt: any;
  updatedAt: any;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  shopId: string;
  customerName: string;
  customerPhone: string;
  type: 'receive' | 'give'; // receive = pabo/baki nise (amount due from them), give = dibo/shodh (payment/received)
  amount: number;
  reason: string;
  entryDate: string; // Date of the credit or payment
  createdAt: any;
  updatedAt: any;
}

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  isDemo: boolean;
}

