import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  category?: Category;          // objeto anidado del backend
}

export interface InventoryBranch {
  id: number;
  name: string;
}

export interface InventoryItem {
  id: number;
  quantity: number;
  product: Product;
  branch?: InventoryBranch;
  branchId?: number;
}

export interface CreateInventoryRequest {
  branchId: number;
  productId: number;
  quantity: number;
}

export interface UpdateInventoryRequest {
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly apiUrl = 'http://localhost:8080/inventories';

  constructor(private http: HttpClient) {}

  getAll(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(this.apiUrl);
  }

  getByBranch(branchId: number): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/branch/${branchId}`);
  }

  getById(id: number): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.apiUrl}/${id}`);
  }

  create(request: CreateInventoryRequest): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(this.apiUrl, request);
  }

  update(id: number, request: UpdateInventoryRequest): Observable<InventoryItem> {
    return this.http.put<InventoryItem>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}