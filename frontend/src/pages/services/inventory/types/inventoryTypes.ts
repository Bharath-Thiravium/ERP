export interface Category {
  id: number;
  name: string;
  code: string;
  description: string;
  parent_category?: number;
  ai_suggested_attributes: string[];
  demand_pattern: 'seasonal' | 'trending' | 'stable' | 'declining';
  is_active: boolean;
  subcategories_count: number;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  supplier_code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  gst_number: string;
  pan_number: string;
  performance_score: number;
  reliability_score: number;
  quality_score: number;
  payment_terms: string;
  credit_limit: number;
  is_active: boolean;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  total_capacity: number;
  used_capacity: number;
  capacity_utilization: number;
  manager?: number;
  manager_name?: string;
  is_active: boolean;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface StockLevel {
  id: number;
  warehouse: number;
  warehouse_name: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_on_order: number;
  available_stock: number;
  bin_location: string;
  batch_number: string;
  serial_numbers: string[];
  expiry_date?: string;
  last_updated: string;
}

export interface ProductVariant {
  id: number;
  variant_name: string;
  variant_code: string;
  attributes: Record<string, any>;
  cost_price?: number;
  selling_price?: number;
  sku: string;
  barcode: string;
  variant_image?: string;
  is_active: boolean;
  current_stock: number;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  product_code: string;
  sku: string;
  category: number;
  category_name: string;
  product_type: 'finished_good' | 'raw_material' | 'semi_finished' | 'consumable' | 'service' | 'digital';
  description: string;
  has_variants: boolean;
  variant_attributes: string[];
  cost_price: number;
  selling_price: number;
  mrp: number;
  hsn_code: string;
  tax_rate: number;
  tracking_method: 'none' | 'serial' | 'batch' | 'expiry' | 'fifo' | 'lifo';
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  reorder_quantity: number;
  weight: number;
  dimensions: Record<string, any>;
  demand_forecast: number;
  seasonality_factor: number;
  abc_classification: 'A' | 'B' | 'C';
  primary_supplier?: number;
  supplier_name?: string;
  primary_image?: string;
  additional_images: string[];
  barcode: string;
  qr_code: string;
  is_active: boolean;
  is_discontinued: boolean;
  current_stock: number;
  stock_value: number;
  is_low_stock: boolean;
  needs_reorder: boolean;
  stock_levels: StockLevel[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  warehouse: number;
  warehouse_name: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment' | 'return' | 'damage' | 'production' | 'sale' | 'purchase';
  quantity: number;
  unit_cost: number;
  reference_number: string;
  quantity_before: number;
  quantity_after: number;
  notes: string;
  batch_number: string;
  expiry_date?: string;
  destination_warehouse?: number;
  created_by_name: string;
  created_at: string;
}

export interface StockAlert {
  id: number;
  product: number;
  product_name: string;
  warehouse?: number;
  warehouse_name?: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiry_warning' | 'reorder_suggestion' | 'demand_spike' | 'slow_moving';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  current_stock: number;
  suggested_action: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by_name?: string;
  is_ai_generated: boolean;
  ai_confidence: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryDashboardStats {
  company: {
    name: string;
    logo?: string;
  };
  user: {
    username: string;
    email: string;
  };
  inventory_stats: {
    total_products: number;
    total_categories: number;
    total_suppliers: number;
    total_warehouses: number;
    total_stock_value: number;
    low_stock_products: number;
    out_of_stock_products: number;
    pending_alerts: number;
  };
  recent_movements: Array<{
    id: number;
    product_name: string;
    warehouse_name: string;
    movement_type: string;
    quantity: number;
    created_at: string;
  }>;
  top_products: Array<{
    id: number;
    name: string;
    product_code: string;
    current_stock: number;
    stock_value: number;
    abc_classification: string;
  }>;
  warehouse_utilization: Array<{
    id: number;
    name: string;
    utilization: number;
    total_capacity: number;
    used_capacity: number;
  }>;
  ai_insights: {
    reorder_suggestions: number;
    demand_trend: string;
    inventory_turnover: number;
    optimization_score: number;
  };
}

export interface ProductBundle {
  id: number;
  bundle_name: string;
  bundle_code: string;
  description: string;
  bundle_price: number;
  discount_percentage: number;
  bundle_image?: string;
  is_active: boolean;
  bundle_items: ProductBundleItem[];
  total_cost: number;
  profit_margin: number;
  created_at: string;
  updated_at: string;
}

export interface ProductBundleItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price_override?: number;
  effective_price: number;
  line_total: number;
  created_at: string;
}

export interface CycleCount {
  id: number;
  count_name: string;
  count_number: string;
  warehouse: number;
  warehouse_name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  next_count_date: string;
  last_count_date?: string;
  abc_classes: string[];
  categories: number[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  items_counted: number;
  discrepancies_found: number;
  accuracy_percentage: number;
  count_items: CycleCountItem[];
  created_at: string;
  completed_at?: string;
}

export interface CycleCountItem {
  id: number;
  product: number;
  product_name: string;
  expected_quantity: number;
  counted_quantity: number;
  variance: number;
  is_counted: boolean;
  notes: string;
  counted_by?: number;
  counted_by_name?: string;
  counted_at?: string;
}

export interface AgingAnalysisItem {
  product_id: number;
  product_name: string;
  product_code: string;
  category: string;
  current_stock: number;
  stock_value: number;
  last_movement_date: string;
  days_old: number;
  aging_category: string;
  is_dead_stock: boolean;
  turnover_rate: number;
}

export interface InventoryFormData {
  category?: Partial<Category>;
  supplier?: Partial<Supplier>;
  warehouse?: Partial<Warehouse>;
  product?: Partial<Product>;
  stockMovement?: Partial<StockMovement>;
  productBundle?: Partial<ProductBundle>;
  cycleCount?: Partial<CycleCount>;
}