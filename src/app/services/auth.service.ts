import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviroments } from '../../enviroments/enviroments';

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

/**
 * Servicio para autenticación y gestión de sesión de usuario.
 * Permite login, logout, manejo de token y obtención de datos del usuario autenticado.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = enviroments.apiUrl + '/auth';

  constructor(private http: HttpClient) { }

  /**
   * Realiza el login del usuario.
   * @param request Credenciales de usuario.
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    console.log('Enviando login request:', request);
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request);
  }

  /**
   * Guarda el token JWT en sessionStorage.
   * @param token Token JWT.
   */
  saveToken(token: string): void {
    sessionStorage.setItem('authToken', token);
  }

  /**
   * Obtiene el token JWT almacenado.
   */
  getToken(): string | null {
    return sessionStorage.getItem('authToken');
  }

  /**
   * Indica si el usuario está autenticado.
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Elimina el token JWT y cierra la sesión.
   */
  logout(): void {
    sessionStorage.removeItem('authToken');
  }

  /**
   * Decodifica el token JWT y devuelve el payload.
   */
  getDecodedToken(): any {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  }

  /**
   * Obtiene el rol del usuario autenticado.
   */
  getUserRole(): string {
    const decoded = this.getDecodedToken();
    return decoded?.role || decoded?.authorities?.[0] || '';
  }

  /**
   * Obtiene el rol normalizado del usuario (sin prefijo ROLE_ y en mayúsculas).
   */
  getNormalizedUserRole(): string {
    const rawRole = this.getUserRole();
    if (!rawRole) return '';
    return rawRole.replace('ROLE_', '').toUpperCase();
  }

  /**
   * Verifica si el usuario tiene alguno de los roles esperados.
   * @param expectedRoles Lista de roles.
   */
  hasAnyRole(expectedRoles: string[]): boolean {
    const role = this.getNormalizedUserRole();
    if (!role) return false;
    return expectedRoles.map((item) => item.toUpperCase()).includes(role);
  }

  /**
   * Obtiene el nombre de usuario autenticado.
   */
  getUserName(): string {
    const decoded = this.getDecodedToken();
    // JWT estándar usa 'sub' para el subject (username)
    return decoded?.sub || decoded?.username || decoded?.userName || '';
  }

  /**
   * Obtiene las iniciales del usuario autenticado.
   */
  getUserInitials(): string {
    const name = this.getUserName();
    if (!name) return '?';
    const parts = name.trim().split(/[\s._-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Obtiene el nombre de la sucursal del usuario autenticado.
   */
  getUserBranch(): string {
    const decoded = this.getDecodedToken();
    return decoded?.branch || decoded?.branchName || '';
  }

  /**
   * Obtiene el ID de la sucursal del usuario autenticado.
   */
  getUserBranchId(): number | null {
    const decoded = this.getDecodedToken();
    // Intenta leer branchId directamente, o parsear branch si es número
    const raw = decoded?.branchId ?? decoded?.branch_id ?? decoded?.branch ?? null;
    const parsed = Number(raw);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }
}