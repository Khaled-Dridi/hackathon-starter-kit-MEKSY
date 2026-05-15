import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content: string;
}

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly base = `${environment.apiUrl}/notes`;

  constructor(private http: HttpClient) {}

  list(): Observable<Note[]> {
    return this.http.get<Note[]>(this.base);
  }

  create(input: NoteInput): Observable<Note> {
    return this.http.post<Note>(this.base, input);
  }

  update(id: number, input: NoteInput): Observable<Note> {
    return this.http.put<Note>(`${this.base}/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
