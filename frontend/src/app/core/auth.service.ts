import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

interface LoginResponse {
  token: string;
  expiresInSeconds: number;
}

interface JwtPayload {
  upn?: string;
  sub?: string;
  groups?: string[];
  exp?: number;
}

const TOKEN_KEY = 'starter.jwt';

function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)) as JwtPayload;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly payload = computed(() => decodeJwt(this.token()));
  readonly roles = computed<readonly string[]>(() => this.payload()?.groups ?? []);
  readonly email = computed(() => this.payload()?.upn ?? null);

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          this.token.set(res.token);
        })
      );
  }

  signup(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/signup`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          this.token.set(res.token);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  isAuthenticated(): boolean {
    const p = this.payload();
    if (!p) return false;
    if (p.exp && p.exp * 1000 < Date.now()) {
      this.logout();
      return false;
    }
    return true;
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(roles: readonly string[]): boolean {
    const owned = this.roles();
    return roles.some((r) => owned.includes(r));
  }

  getToken(): string | null {
    return this.token();
  }
}
