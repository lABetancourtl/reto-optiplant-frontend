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
  category?: Category;         
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

/**
 * Servicio para gestionar inventarios de productos en sucursales.
 * Permite crear, consultar, actualizar y eliminar inventarios.
 */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly apiUrl = 'http://localhost:8080/inventories';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los inventarios registrados.
   */
  getAll(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(this.apiUrl);
  }

  /**
   * Obtiene inventarios por sucursal.
   * @param branchId ID de la sucursal.
   */
  getByBranch(branchId: number): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/branch/${branchId}`);
  }

  /**
   * Obtiene un inventario por su ID.
   * @param id ID del inventario.
   */
  getById(id: number): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo inventario.
   * @param request Datos del inventario a crear.
   */
  create(request: CreateInventoryRequest): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(this.apiUrl, request);
  }

  /**
   * Actualiza un inventario existente.
   * @param id ID del inventario.
   * @param request Datos actualizados.
   */
  update(id: number, request: UpdateInventoryRequest): Observable<InventoryItem> {
    return this.http.put<InventoryItem>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Elimina un inventario por su ID.
   * @param id ID del inventario.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}