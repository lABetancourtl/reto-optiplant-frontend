import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
}

export interface BranchRequest {
  name: string;
  address: string;
  phone: string;
}

/**
 * Servicio para gestionar sucursales.
 * Permite crear, consultar, actualizar y eliminar sucursales.
 */
@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly apiUrl = 'http://localhost:8080/branches';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las sucursales registradas.
   */
  getAll(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.apiUrl);
  }

  /**
   * Obtiene una sucursal por su ID.
   * @param id ID de la sucursal.
   */
  getById(id: number): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea una nueva sucursal.
   * @param request Datos de la sucursal a crear.
   */
  create(request: BranchRequest): Observable<Branch> {
    return this.http.post<Branch>(this.apiUrl, request);
  }

  /**
   * Actualiza una sucursal existente.
   * @param id ID de la sucursal.
   * @param request Datos actualizados.
   */
  update(id: number, request: BranchRequest): Observable<Branch> {
    return this.http.put<Branch>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Elimina una sucursal por su ID.
   * @param id ID de la sucursal.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}