export interface AdminDashboardSalesSummaryResponse {
  totalAmount: number;
  totalSales: number;
}

export interface AdminDashboardSalesByBranchItemResponse {
  branchId: number;
  branchName: string;
  totalAmount: number;
  totalSales: number;
}

export type AdminDashboardApiGranularity = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type AdminDashboardUiGranularity = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface AdminDashboardSalesByBranchTimeSeriesQuery {
  granularity?: AdminDashboardApiGranularity;
  fromDate?: string;
  toDate?: string;
  branchIds?: number[];
}

export interface AdminDashboardSalesByBranchTimePointResponse {
  bucketStart: string;
  totalAmount: number;
  totalSales: number;
}

export interface AdminDashboardBranchTimeSeriesResponse {
  branchId: number;
  branchName: string;
  points: AdminDashboardSalesByBranchTimePointResponse[];
}

export interface AdminDashboardSalesByBranchTimeSeriesResponse {
  granularity: AdminDashboardApiGranularity;
  fromDate: string;
  toDate: string;
  branches: AdminDashboardBranchTimeSeriesResponse[];
}

export interface AdminDashboardProductOptionResponse {
  id: number;
  name: string;
}

export interface AdminDashboardBranchOptionResponse {
  id: number;
  name: string;
}

export interface AdminDashboardProductTopBranchResponse {
  productId: number;
  productName: string;
  branchId: number | null;
  branchName: string | null;
  unitsSold: number;
  totalAmount: number;
}

export interface AdminDashboardProductSalesByBranchItemResponse {
  branchId: number;
  branchName: string;
  unitsSold: number;
  totalAmount: number;
}

export interface AdminDashboardBranchTopProductItemResponse {
  productId: number;
  productName: string;
  unitsSold: number;
  totalAmount: number;
}

export interface AdminDashboardTransferBranchRef {
  id: number;
  name: string;
}

export interface AdminDashboardTransferProductRef {
  id: number;
  name: string;
}

export interface AdminDashboardTransferResponse {
  id: number;
  sourceBranch: AdminDashboardTransferBranchRef;
  destBranch: AdminDashboardTransferBranchRef;
  product: AdminDashboardTransferProductRef;
  quantity: number;
  status: string;
  createdAt?: string;
  justification?: string;
  trackingCode?: string;
}

export interface AdminDashboardInventoryCategoryResponse {
  id: number;
  name: string;
}

export interface AdminDashboardInventoryProductResponse {
  id: number;
  name: string;
  description?: string;
  category?: AdminDashboardInventoryCategoryResponse;
}

export interface AdminDashboardInventoryBranchResponse {
  id: number;
  name: string;
}

export interface AdminDashboardInventoryItemResponse {
  id: number;
  quantity: number;
  product: AdminDashboardInventoryProductResponse;
  branch?: AdminDashboardInventoryBranchResponse;
  branchId?: number;
}
