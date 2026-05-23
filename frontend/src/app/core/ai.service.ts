import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface GeneratedDescription {
  description: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly base = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  describeAction(title: string): Observable<GeneratedDescription> {
    return this.http.post<GeneratedDescription>(`${this.base}/actions/describe`, { title });
  }
}
