import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface EngagementStats {
  distinctParticipants: number;
  since: string;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly base = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  engagement(): Observable<EngagementStats> {
    return this.http.get<EngagementStats>(`${this.base}/engagement`);
  }
}
