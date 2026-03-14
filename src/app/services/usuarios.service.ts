import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface SucursalUser {
  id: number;
  username: string;
  name: string;
  role: string;
  branchId: number | null;
  branchName: string | null;
}

export interface CreateSucursalUserRequest {
  userName: string;
  name: string;
  password: string;
  branchId: number | null;
}

export interface UpdateSucursalUserRequest {
  userName: string;
  name: string;
  password?: string;
  branchId: number | null;
}

export interface Branch {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly apiUrl = 'http://localhost:8080/admin/users';
  private readonly branchesUrl = 'http://localhost:8080/branches';

  constructor(private http: HttpClient) {}

  getAll(): Observable<SucursalUser[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(users => users.map(u => ({
        id: u.id,
        username: u.username ?? u.userName ?? '',
        name: u.name ?? '',
        role: u.role ?? '',
        branchId: u.branchId ?? null,
        branchName: u.branchName ?? null,
      })))
    );
  }

  create(request: CreateSucursalUserRequest): Observable<SucursalUser> {
    return this.http.post<SucursalUser>(this.apiUrl, request);
  }

  update(id: number, request: UpdateSucursalUserRequest): Observable<SucursalUser> {
    return this.http.put<SucursalUser>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.branchesUrl);
  }
}