import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Proposal {
  id: number;
  userId: number;
  authorEmail: string;
  title: string;
  description: string;
  status: ProposalStatus;
  /** Optional cover image — external URL or "/files/{uuid}". */
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalInput {
  title: string;
  description?: string;
  imageUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProposalsService {
  private readonly base = `${environment.apiUrl}/proposals`;

  constructor(private http: HttpClient) {}

  listMine(): Observable<Proposal[]> {
    return this.http.get<Proposal[]>(`${this.base}/mine`);
  }

  listAll(status?: ProposalStatus): Observable<Proposal[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Proposal[]>(this.base, { params });
  }

  create(input: ProposalInput): Observable<Proposal> {
    return this.http.post<Proposal>(this.base, input);
  }

  setStatus(id: number, status: ProposalStatus): Observable<Proposal> {
    return this.http.put<Proposal>(`${this.base}/${id}/status`, { status });
  }
}
