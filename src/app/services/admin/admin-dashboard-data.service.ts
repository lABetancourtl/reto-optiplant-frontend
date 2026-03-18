import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminDashboardBranchOptionResponse,
  AdminDashboardBranchTopProductItemResponse,
  AdminDashboardInventoryItemResponse,
  AdminDashboardProductOptionResponse,
  AdminDashboardProductSalesByBranchItemResponse,
  AdminDashboardProductTopBranchResponse,
  AdminDashboardSalesByBranchItemResponse,
  AdminDashboardSalesByBranchTimeSeriesQuery,
  AdminDashboardSalesByBranchTimeSeriesResponse,
  AdminDashboardSalesSummaryResponse,
  AdminDashboardTransferResponse
} from '../../models/admin-dashboard.models';

@Injectable({ providedIn: 'root' })
export class AdminDashboardDataService {
  private readonly baseUrl = 'http://localhost:8080/admin/analytics';
  private readonly productsUrl = 'http://localhost:8080/products';
  private readonly branchesUrl = 'http://localhost:8080/branches';
  private readonly transfersUrl = 'http://localhost:8080/transfers';
  private readonly inventoriesUrl = 'http://localhost:8080/inventories';

  constructor(private readonly http: HttpClient) {}

  getSalesSummary(): Observable<AdminDashboardSalesSummaryResponse> {
    return this.http.get<AdminDashboardSalesSummaryResponse>(`${this.baseUrl}/sales/summary`);
  }

  getSalesByBranch(): Observable<AdminDashboardSalesByBranchItemResponse[]> {
    return this.http.get<AdminDashboardSalesByBranchItemResponse[]>(`${this.baseUrl}/sales/by-branch`);
  }

  getSalesByBranchTimeSeries(query?: AdminDashboardSalesByBranchTimeSeriesQuery): Observable<AdminDashboardSalesByBranchTimeSeriesResponse> {
    let params = new HttpParams();

    if (query?.granularity) {
      params = params.set('granularity', query.granularity);
    }

    if (query?.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }

    if (query?.toDate) {
      params = params.set('toDate', query.toDate);
    }

    if (query?.branchIds && query.branchIds.length > 0) {
      params = params.set('branchIds', query.branchIds.join(','));
    }

    return this.http.get<AdminDashboardSalesByBranchTimeSeriesResponse>(`${this.baseUrl}/sales/by-branch/time-series`, { params });
  }

  getProducts(): Observable<AdminDashboardProductOptionResponse[]> {
    return this.http.get<AdminDashboardProductOptionResponse[]>(this.productsUrl);
  }

  getBranches(): Observable<AdminDashboardBranchOptionResponse[]> {
    return this.http.get<AdminDashboardBranchOptionResponse[]>(this.branchesUrl);
  }

  getProductTopBranch(productId: number): Observable<AdminDashboardProductTopBranchResponse> {
    return this.http.get<AdminDashboardProductTopBranchResponse>(`${this.baseUrl}/products/${productId}/top-branch`);
  }

  getProductSalesByBranch(productId: number): Observable<AdminDashboardProductSalesByBranchItemResponse[]> {
    return this.http.get<AdminDashboardProductSalesByBranchItemResponse[]>(`${this.baseUrl}/products/${productId}/sales-by-branch`);
  }

  getBranchTopProducts(branchId: number, limit?: number): Observable<AdminDashboardBranchTopProductItemResponse[]> {
    let params = new HttpParams();

    if (typeof limit === 'number') {
      params = params.set('limit', limit);
    }

    return this.http.get<AdminDashboardBranchTopProductItemResponse[]>(`${this.baseUrl}/branches/${branchId}/top-products`, { params });
  }

  getAllTransfers(): Observable<AdminDashboardTransferResponse[]> {
    return this.http.get<AdminDashboardTransferResponse[]>(this.transfersUrl);
  }

  getAllInventories(): Observable<AdminDashboardInventoryItemResponse[]> {
    return this.http.get<AdminDashboardInventoryItemResponse[]>(this.inventoriesUrl);
  }
}
