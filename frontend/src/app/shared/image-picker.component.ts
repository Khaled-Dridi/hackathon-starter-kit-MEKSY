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

/**
 * Two-mode image picker used by both the admin action form and the propose
 * form. Lets the user either upload a file (sent to {@code POST /files})
 * OR paste an external image URL. Either way the final value is a single
 * string that the parent stores in its form state.
 *
 * <h3>Why one component for two surfaces</h3>
 * Both call sites need the exact same UX (upload OR URL + live preview +
 * clear button + size/type errors). Duplicating the logic across the
 * admin form and the propose form would mean drift. Keeping them in one
 * place also means we can swap the underlying storage (S3, signed URLs,
 * etc.) without touching either form.
 */
@Component({
  selector: 'app-image-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="picker">
      <div class="picker__tabs" role="tablist">
        <button type="button" role="tab" [attr.aria-pressed]="mode() === 'upload'"
                (click)="setMode('upload')">
          <i class="pi pi-upload"></i> Upload
        </button>
        <button type="button" role="tab" [attr.aria-pressed]="mode() === 'url'"
                (click)="setMode('url')">
          <i class="pi pi-link"></i> Paste URL
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
            <div class="dropzone__msg">
              <i class="pi pi-image" style="font-size: 22px;"></i>
              <span>Drop a file here, or <button type="button" class="link" (click)="fileInput.click()">browse</button></span>
              <span class="dropzone__hint">JPEG / PNG / WebP / GIF · up to 5 MB</span>
            </div>
          }
        </label>
      } @else {
        <input class="input" type="url" name="imageUrl"
               placeholder="https://example.org/photo.jpg"
               [ngModel]="value"
               (ngModelChange)="onUrlChange($event)" />
        <p class="hint">
          Paste any image URL. The original site can see who's loading the
          image — for sensitive content, prefer uploading.
        </p>
      }

      @if (errorMsg()) {
        <p class="err" role="alert">{{ errorMsg() }}</p>
      }

      @if (value) {
        <div class="preview">
          <img [src]="value" alt="Preview" (error)="onImgError()" />
          <button type="button" class="preview__remove" (click)="clear()" aria-label="Remove image">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .picker { display: flex; flex-direction: column; gap: 10px; }

    .picker__tabs {
      display: inline-flex;
      gap: 4px;
      padding: 3px;
      background: var(--surface);
      border-radius: 999px;
      align-self: flex-start;
    }
    .picker__tabs button {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 6px 12px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .picker__tabs button i { font-size: 11px; }
    .picker__tabs button[aria-pressed="true"] {
      background: var(--white);
      color: var(--navy);
      box-shadow: 0 1px 2px rgba(32,44,80,0.08);
    }

    .dropzone {
      display: block;
      border: 1.5px dashed var(--border-strong);
      border-radius: var(--radius);
      background: var(--white);
      padding: 22px 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .dropzone:hover:not(.is-busy) {
      border-color: var(--navy);
      background: var(--surface);
    }
    .dropzone.is-busy { cursor: progress; }
    .dropzone__msg {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      font-size: 13.5px;
    }
    .dropzone__msg i { color: var(--text-subtle); }
    .dropzone__hint { color: var(--text-subtle); font-size: 12px; }
    .dropzone .link {
      appearance: none;
      background: transparent;
      border: 0;
      color: var(--navy);
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font: inherit;
    }

    .spin {
      width: 16px;
      height: 16px;
      border: 2px solid var(--surface-2);
      border-top-color: var(--navy);
      border-radius: 50%;
      animation: pickerSpin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes pickerSpin { to { transform: rotate(360deg); } }

    .hint {
      margin: 0;
      font-size: 12px;
      color: var(--text-subtle);
    }
    .err {
      margin: 0;
      padding: 8px 12px;
      background: #FBEDED;
      color: #8B1F1F;
      border-radius: var(--radius);
      font-size: 12.5px;
    }

    .preview {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--surface-2);
    }
    .preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .preview__remove {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 0;
      background: rgba(32,44,80,0.85);
      color: white;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .preview__remove:hover { background: var(--navy); }
    .preview__remove i { font-size: 11px; }
  `]
})
export class ImagePickerComponent {
  private files = inject(FilesService);

  /** Current image URL (external or "/files/{uuid}"). Two-way via {@link valueChange}. */
  @Input() value: string | null = null;

  @Output() valueChange = new EventEmitter<string | null>();

  /** Which input mode is showing — upload or URL. Persists per session. */
  readonly mode = signal<'upload' | 'url'>('upload');
  readonly uploading = signal(false);
  readonly progressPercent = signal(0);
  readonly errorMsg = signal<string | null>(null);

  setMode(m: 'upload' | 'url'): void {
    this.mode.set(m);
    this.errorMsg.set(null);
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) this.uploadFile(file);
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
    // Reset the input so picking the same file again retriggers the change.
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
    // Lightweight client-side guard so we don't even POST oversized files.
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
