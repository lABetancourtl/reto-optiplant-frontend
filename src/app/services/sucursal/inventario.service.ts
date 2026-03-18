import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviroments } from '../../../enviroments/enviroments';

export interface InventarioItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price?: number;
    category: {
      id: number;
      name: string;
    };
  };
  branch: {
    id: number;
    name: string;
  };
}

export interface ProductAvailability {
  branchId: number;
  branchName: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class SucursalInventarioService {

  private apiUrl = enviroments.apiUrl + '/inventories';

  constructor(private http: HttpClient) {}

  getMyBranchInventory(): Observable<InventarioItem[]> {
    return this.http.get<InventarioItem[]>(`${this.apiUrl}/my-branch`);
  }

  getProductAvailability(productId: number): Observable<ProductAvailability[]> {
    return this.http.get<ProductAvailability[]>(`${this.apiUrl}/product/${productId}/availability`);
  }
}