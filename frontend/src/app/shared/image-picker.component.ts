import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FilesService } from '../core/files.service';

@Component({
  selector: 'app-image-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="picker">
      <div class="seg" role="tablist">
        <button type="button" role="tab"
                [class.is-active]="mode() === 'upload'"
                (click)="setMode('upload')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload
        </button>
        <button type="button" role="tab"
                [class.is-active]="mode() === 'url'"
                (click)="setMode('url')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></svg>
          Paste URL
        </button>
      </div>

      @if (mode() === 'upload') {
        <label class="dropzone" [class.is-busy]="uploading()"
               (dragover)="onDragOver($event)" (drop)="onDrop($event)">
          <input #fileInput type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                 (change)="onFileChange($event)" hidden />
          @if (uploading()) {
            <div class="dropzone__msg">
              <span class="spin"></span>
              <span>Uploading… {{ progressPercent() }}%</span>
            </div>
          } @else {
            <svg class="icon" style="width:32px; height:32px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <div class="dropzone__msg">
              Drop a file here, or
              <button type="button" class="link" (click)="fileInput.click()">browse</button>
            </div>
            <span class="dropzone__hint">JPEG / PNG / WebP / GIF · up to 5 MB</span>
          }
        </label>
      } @else {
        <input class="input" type="url" name="imageUrl"
               placeholder="https://example.org/photo.jpg"
               [ngModel]="value"
               (ngModelChange)="onUrlChange($event)" />
        <p class="help">
          Paste any image URL. For sensitive content, prefer uploading.
        </p>
      }

      @if (errorMsg()) {
        <div class="banner banner--error" role="alert">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="banner__body">{{ errorMsg() }}</div>
        </div>
      }

      @if (value) {
        <div class="preview">
          <img [src]="value" alt="Preview" (error)="onImgError()" />
          <button type="button" class="preview__remove" (click)="clear()" aria-label="Remove image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .picker { display: flex; flex-direction: column; gap: 12px; }

    .seg { align-self: flex-start; }

    .dropzone { padding: 28px 18px; }
    .dropzone .dropzone__msg {
      color: var(--ink); font-size: 0.9375rem; font-weight: 500;
      display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center;
    }
    .dropzone .dropzone__hint { color: var(--muted-2); font-size: 0.8125rem; }
    .dropzone .link {
      background: transparent; border: 0;
      color: var(--ink); text-decoration: underline; cursor: pointer;
      padding: 0; font: inherit; font-weight: 600;
    }
    .dropzone.is-busy { cursor: progress; }

    .spin {
      width: 18px; height: 18px;
      border: 2px solid var(--line);
      border-top-color: var(--ink);
      border-radius: 50%;
      animation: pickerSpin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes pickerSpin { to { transform: rotate(360deg); } }

    .preview {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface-2);
      border: 1px solid var(--line);
    }
    .preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .preview__remove {
      position: absolute;
      top: 10px; right: 10px;
      width: 32px; height: 32px;
      border-radius: 999px;
      border: 0;
      background: rgba(32,44,80,0.85);
      color: white;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background var(--t-hover) var(--ease);
    }
    .preview__remove:hover { background: var(--ink); }
  `]
})
export class ImagePickerComponent {
  private files = inject(FilesService);

  @Input() value: string | null = null;
  @Output() valueChange = new EventEmitter<string | null>();

  readonly mode = signal<'upload' | 'url'>('upload');
  readonly uploading = signal(false);
  readonly progressPercent = signal(0);
  readonly errorMsg = signal<string | null>(null);

  setMode(m: 'upload' | 'url'): void {
    this.mode.set(m);
    this.errorMsg.set(null);
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) this.uploadFile(file);
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
    (e.target as HTMLInputElement).value = '';
  }

  onUrlChange(v: string): void {
    this.errorMsg.set(null);
    this.emit(v.trim() || null);
  }

  onImgError(): void {
    this.errorMsg.set("Couldn't load this image — check the URL or try uploading instead.");
  }

  clear(): void {
    this.errorMsg.set(null);
    this.emit(null);
  }

  private uploadFile(file: File): void {
    this.errorMsg.set(null);
    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg.set('File too large — limit is 5 MB.');
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      this.errorMsg.set('Only JPEG, PNG, WebP and GIF images are accepted.');
      return;
    }
    this.uploading.set(true);
    this.progressPercent.set(0);
    this.files.upload(file).subscribe({
      next: (ev) => {
        if (ev.kind === 'progress' && ev.total > 0) {
          this.progressPercent.set(Math.round((ev.loaded / ev.total) * 100));
        } else if (ev.kind === 'done') {
          this.uploading.set(false);
          this.progressPercent.set(100);
          this.emit(ev.result.url);
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Upload failed. Try again.');
      },
    });
  }

  private emit(v: string | null): void {
    this.value = v;
    this.valueChange.emit(v);
  }
}
