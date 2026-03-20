// src/app/services/category.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviroments } from '../../../enviroments/enviroments';

export interface Category {
  id: number;
  name: string;
}

/**
 * Servicio para gestionar categorías de productos.
 * Permite crear, consultar, actualizar y eliminar categorías.
 */
@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = enviroments.apiUrl + '/categories';  

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las categorías registradas.
   */
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  /**
   * Obtiene una categoría por su ID.
   * @param id ID de la categoría.
   */
  getCategoryById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea una nueva categoría.
   * @param name Nombre de la categoría.
   */
  createCategory(name: string): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, { name });
  }

  /**
   * Actualiza una categoría existente.
   * @param id ID de la categoría.
   * @param name Nombre actualizado.
   */
  updateCategory(id: number, name: string): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, { name });
  }

  /**
   * Elimina una categoría por su ID.
   * @param id ID de la categoría.
   */
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}