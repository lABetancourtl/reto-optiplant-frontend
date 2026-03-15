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

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = enviroments.apiUrl + '/auth';

  constructor(private http: HttpClient) { }

  login(request: LoginRequest): Observable<LoginResponse> {
    console.log('Enviando login request:', request);
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request);
  }

  saveToken(token: string): void {
    sessionStorage.setItem('authToken', token);
  }

  getToken(): string | null {
    return sessionStorage.getItem('authToken');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    sessionStorage.removeItem('authToken');
  }

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

  getUserRole(): string {
    const decoded = this.getDecodedToken();
    return decoded?.role || '';
  }

  getUserName(): string {
    const decoded = this.getDecodedToken();
    // JWT estándar usa 'sub' para el subject (username)
    return decoded?.sub || decoded?.username || decoded?.userName || '';
  }

  getUserInitials(): string {
    const name = this.getUserName();
    if (!name) return '?';
    const parts = name.trim().split(/[\s._-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getUserBranch(): string {
    const decoded = this.getDecodedToken();
    return decoded?.branch || decoded?.branchName || '';
  }

  getUserBranchId(): number | null {
    const decoded = this.getDecodedToken();
    // Intenta leer branchId directamente, o parsear branch si es número
    const raw = decoded?.branchId ?? decoded?.branch_id ?? decoded?.branch ?? null;
    const parsed = Number(raw);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }
}