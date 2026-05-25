import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';

/** Response shape from POST /files (matches the backend's UploadResponse record). */
export interface FileUploadResult {
  id: string;
  /** Relative URL ("/files/{uuid}") suitable for putting straight into `<img src>`. */
  url: string;
}

/**
 * Thin wrapper around POST /files. The backend handles validation and
 * storage; this service just orchestrates the multipart request and
 * surfaces per-byte upload progress to callers that want it.
 */
@Injectable({ providedIn: 'root' })
export class FilesService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/files`;

  /**
   * Upload a single file and resolve with the server-issued URL.
   *
   * @returns observable emitting one event:
   *   - `{ kind: 'progress', loaded, total }` while bytes are streaming
   *   - `{ kind: 'done', result }` on success
   */
  upload(file: File): Observable<UploadEvent> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<FileUploadResult>(this.base, form, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(map((ev) => this.mapEvent(ev)));
  }

  private mapEvent(ev: HttpEvent<FileUploadResult>): UploadEvent {
    if (ev.type === HttpEventType.UploadProgress) {
      return {
        kind: 'progress',
        loaded: ev.loaded,
        total: ev.total ?? 0,
      };
    }
    if (ev.type === HttpEventType.Response && ev.body) {
      return { kind: 'done', result: ev.body };
    }
    return { kind: 'progress', loaded: 0, total: 0 };
  }
}

export type UploadEvent =
  | { kind: 'progress'; loaded: number; total: number }
  | { kind: 'done'; result: FileUploadResult };
