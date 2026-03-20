import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: Category | null;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: number | null;
}

export interface UpdateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: number | null;
}

/**
 * Servicio para gestionar productos y categorías.
 * Permite crear, consultar, actualizar y eliminar productos,
 * así como obtener categorías.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:8080/products';
  private categoryUrl = 'http://localhost:8080/categories';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los productos registrados.
   */
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  /**
   * Obtiene un producto por su ID.
   * @param id ID del producto.
   */
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtiene productos por categoría.
   * @param categoryId ID de la categoría.
   */
  getProductsByCategory(categoryId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/category/${categoryId}`);
  }

  /**
   * Crea un nuevo producto.
   * @param request Datos del producto a crear.
   */
  createProduct(request: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, request);
  }

  /**
   * Actualiza un producto existente.
   * @param id ID del producto.
   * @param request Datos actualizados.
   */
  updateProduct(id: number, request: UpdateProductRequest): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Elimina un producto por su ID.
   * @param id ID del producto.
   */
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtiene todas las categorías disponibles.
   */
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.categoryUrl);
  }
}