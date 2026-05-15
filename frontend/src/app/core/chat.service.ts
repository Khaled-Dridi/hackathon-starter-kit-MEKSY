import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly base = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  listSessions(): Observable<ChatSession[]> {
    return this.http.get<ChatSession[]>(`${this.base}/sessions`);
  }

  createSession(title?: string): Observable<ChatSession> {
    return this.http.post<ChatSession>(`${this.base}/sessions`, { title: title ?? '' });
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`);
  }

  listMessages(sessionId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/sessions/${sessionId}/messages`);
  }

  sendMessage(sessionId: number, message: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(
      `${this.base}/sessions/${sessionId}/messages`,
      { message }
    );
  }
}
