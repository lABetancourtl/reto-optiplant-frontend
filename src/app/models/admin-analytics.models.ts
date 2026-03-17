export interface AdminSalesSummary {
  totalAmount: number;
  totalSales: number;
}

export interface AdminSalesByBranchItem {
  branchId: number;
  branchName: string;
  totalAmount: number;
  totalSales: number;
}

export type SalesGranularity = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface SalesByBranchTimeSeriesRequest {
  granularity?: SalesGranularity;
  fromDate?: string;
  toDate?: string;
  branchIds?: number[];
}

export interface SalesByBranchTimePointResponse {
  bucketStart: string;
  totalAmount: number;
  totalSales: number;
}

export interface BranchSalesTimeSeriesResponse {
  branchId: number;
  branchName: string;
  points: SalesByBranchTimePointResponse[];
}

export interface SalesByBranchTimeSeriesResponse {
  granularity: SalesGranularity;
  fromDate: string;
  toDate: string;
  branches: BranchSalesTimeSeriesResponse[];
}

export interface AdminProductTopBranch {
  productId: number;
  productName: string;
  branchId: number | null;
  branchName: string | null;
  unitsSold: number;
  totalAmount: number;
}

export interface AdminProductSalesByBranchItem {
  branchId: number;
  branchName: string;
  unitsSold: number;
  totalAmount: number;
}

export interface AdminBranchTopProductItem {
  productId: number;
  productName: string;
  unitsSold: number;
  totalAmount: number;
}
