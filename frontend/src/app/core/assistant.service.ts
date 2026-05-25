import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/** Compact view of an action returned alongside an assistant reply. */
export interface RelatedAction {
  id: number;
  title: string;
  location: string | null;
  actionDate: string;
  isClosed: boolean;
  seatsRemaining: number;
  currentUserRegistered: boolean;
}

export interface AssistantReply {
  reply: string;
  relatedActions: RelatedAction[];
}

/**
 * REST client for the conversational Charity Day assistant.
 * Multi-turn memory is keyed by a {@code sessionId} the widget
 * generates once per browser session and reuses for every turn.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ai/assistant`;

  chat(sessionId: string, message: string): Observable<AssistantReply> {
    return this.http.post<AssistantReply>(`${this.base}/chat`, { sessionId, message });
  }
}
