import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface CharityAction {
  id: number;
  title: string;
  description: string;
  actionDate: string;
  location: string | null;
  /** Map coordinates — both present together or both null. */
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  oddTag: string | null;
  isClosed: boolean;
  impactSummary: string | null;
  /** External URL or "/files/{uuid}". May be null. */
  imageUrl: string | null;
  registeredCount: number;
  seatsRemaining: number;
  currentUserRegistered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CharityActionInput {
  title: string;
  description?: string;
  actionDate: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity: number;
  oddTag?: string | null;
  impactSummary?: string | null;
  imageUrl?: string | null;
}

export interface Registrant {
  userId: number;
  email: string;
  registeredAt: string;
}

@Injectable({ providedIn: 'root' })
export class ActionsService {
  private readonly base = `${environment.apiUrl}/actions`;

  constructor(private http: HttpClient) {}

  list(openOnly = false): Observable<CharityAction[]> {
    let params = new HttpParams();
    if (openOnly) params = params.set('open', 'true');
    return this.http.get<CharityAction[]>(this.base, { params });
  }

  get(id: number): Observable<CharityAction> {
    return this.http.get<CharityAction>(`${this.base}/${id}`);
  }

  create(input: CharityActionInput): Observable<CharityAction> {
    return this.http.post<CharityAction>(this.base, input);
  }

  update(id: number, input: CharityActionInput): Observable<CharityAction> {
    return this.http.put<CharityAction>(`${this.base}/${id}`, input);
  }

  close(id: number): Observable<CharityAction> {
    return this.http.post<CharityAction>(`${this.base}/${id}/close`, {});
  }

  duplicate(id: number): Observable<CharityAction> {
    return this.http.post<CharityAction>(`${this.base}/${id}/duplicate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  register(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/register`, {});
  }

  unregister(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/register`);
  }

  listRegistrants(id: number): Observable<Registrant[]> {
    return this.http.get<Registrant[]>(`${this.base}/${id}/registrations`);
  }
}
