import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: number;
  actionId: number;
  authorId: number;
  authorEmail: string;
  body: string;
  createdAt: string;
}

/**
 * REST client for the per-action private chat. Both endpoints 403 if
 * the user isn't registered for the action (admins bypass the check).
 *
 * <pre>
 *   GET  /actions/{id}/chat
 *   POST /actions/{id}/chat { body: "…" }
 * </pre>
 */
@Injectable({ providedIn: 'root' })
export class ActionChatService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(actionId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.api}/actions/${actionId}/chat`);
  }

  send(actionId: number, body: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.api}/actions/${actionId}/chat`, { body });
  }
}
