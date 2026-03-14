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

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly apiUrl = 'http://localhost:8080/branches';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.apiUrl);
  }

  getById(id: number): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/${id}`);
  }

  create(request: BranchRequest): Observable<Branch> {
    return this.http.post<Branch>(this.apiUrl, request);
  }

  update(id: number, request: BranchRequest): Observable<Branch> {
    return this.http.put<Branch>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}