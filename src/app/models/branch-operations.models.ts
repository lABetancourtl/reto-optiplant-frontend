export interface SaleItemRequest {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleRequest {
  customerName: string;
  paymentMethod?: string;
  items: SaleItemRequest[];
}

export interface SaleSummary {
  id: number;
  customerName?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
}

export interface SaleItemDetail {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
}

export interface CreateReturnRequest {
  saleId: number;
  saleItemId: number;
  quantity: number;
  reason: string;
}

export interface ReturnRecord {
  id: number;
  saleId?: number;
  status?: string;
  createdAt?: string;
  message?: string;
}

export interface CreateExchangeRequest {
  saleId: number;
  soldProductId: number;
  newProductId: number;
  quantity: number;
  exactDifferencePaid: number;
  reason?: string;
}

export interface ExchangeRecord {
  id: number;
  saleId?: number;
  status?: string;
  createdAt?: string;
  message?: string;
}
