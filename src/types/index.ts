export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'staff';
  status: 'active' | 'archived';
  branch_id?: number | null;
  created_at: string;
}

export interface Branch {
  id: number;
  branch_name: string;
  address?: string;
  status: 'active' | 'inactive';
}

export interface MenuItem {
  id: number;
  emoji?: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  status: 'available' | 'unavailable' | 'archived';
  created_at?: string;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  unit_price: number;
  status: 'available' | 'unavailable';
  created_at?: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  emoji: string;
}

export interface Order {
  id?: number;
  order_number?: string;
  table: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  customer_type: string;
  discount_percent: number;
  discount_label: string;
  cash: number;
  change: number;
  payment_method: string;
  payment_reference: string;
  customer_name: string;
  time: string;
}

export interface SalesSummary {
  total_orders: number;
  total_revenue: number;
  total_discounts: number;
  avg_order_value: number;
  cash_sales: number;
  ewallet_sales: number;
  online_sales: number;
}

export interface BranchSales {
  branch_id: number;
  branch_name: string;
  total_orders: number;
  total_revenue: number;
  total_discounts: number;
  avg_order_value: number;
  cash_sales: number;
  ewallet_sales: number;
  online_sales: number;
}

export interface DailySale {
  sale_date: string;
  branch_name?: string;
  orders: number;
  revenue: number;
}

export interface TopItem {
  item_name: string;
  emoji?: string;
  qty_sold: number;
  revenue: number;
}

export interface RecentTransaction {
  id: number;
  order_number: string;
  table_name: string;
  username?: string;
  branch_name?: string;
  total: number;
  discount_amount: number;
  payment_method: string;
  customer_name?: string;
  created_at: string;
}
