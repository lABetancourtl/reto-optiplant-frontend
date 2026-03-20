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

/**
 * Servicio para gestión de inventario de sucursal.
 * Permite consultar inventario propio y disponibilidad de productos en sucursales.
 */
@Injectable({ providedIn: 'root' })
export class SucursalInventarioService {

  private apiUrl = enviroments.apiUrl + '/inventories';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el inventario de la sucursal actual.
   */
  getMyBranchInventory(): Observable<InventarioItem[]> {
    return this.http.get<InventarioItem[]>(`${this.apiUrl}/my-branch`);
  }

  /**
   * Obtiene la disponibilidad de un producto en todas las sucursales.
   * @param productId ID del producto.
   */
  getProductAvailability(productId: number): Observable<ProductAvailability[]> {
    return this.http.get<ProductAvailability[]>(`${this.apiUrl}/product/${productId}/availability`);
  }
}