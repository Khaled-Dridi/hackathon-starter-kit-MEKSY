import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { FilesService } from '../core/files.service';

/**
 * Like the image picker but accepts <b>both</b> images and short videos,
 * AND can embed YouTube / Vimeo URLs. Emits a {@link MediaSelection}
 * carrying the URL plus a hint of whether it's an image or video so the
 * parent can store both on the entity (posts use {@code mediaType}).
 *
 * <h3>Why a separate component, not a toggle on the image picker</h3>
 * The image picker is used for action and proposal <i>cover images</i>
 * where videos don't make sense (we don't want admins putting a 20 MB
 * MP4 as an action thumbnail). Keeping a second component lets each
 * surface declare what it accepts.
 */
@Component({
  selector: 'app-media-picker',
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
          <i class="pi pi-link"></i> Paste URL or YouTube link
        </button>
      </div>

      @if (mode() === 'upload') {
        <label class="dropzone" [class.is-busy]="uploading()"
               (dragover)="onDragOver($event)" (drop)="onDrop($event)">
          <input #fileInput type="file"
                 accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
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
              <span class="dropzone__hint">Images up to 5 MB · Videos up to 20 MB</span>
            </div>
          }
        </label>
      } @else {
        <input class="input" type="url" name="mediaUrl"
               placeholder="https://… or a YouTube/Vimeo link"
               [ngModel]="value?.url ?? ''"
               (ngModelChange)="onUrlChange($event)" />
        <p class="hint">
          Paste an image/video URL, or a YouTube/Vimeo link — we'll embed it inline.
        </p>
      }

      @if (errorMsg()) {
        <p class="err" role="alert">{{ errorMsg() }}</p>
      }

      @if (value?.url) {
        <div class="preview">
          @if (value!.kind === 'video' && isYoutube(value!.url)) {
            <iframe [src]="youtubeEmbedSafe(value!.url)" frameborder="0"
                    allow="encrypted-media; picture-in-picture"
                    allowfullscreen></iframe>
          } @else if (value!.kind === 'video') {
            <video [src]="value!.url" controls (error)="onMediaError()"></video>
          } @else {
            <img [src]="value!.url" alt="Preview" (error)="onMediaError()" />
          }
          <button type="button" class="preview__remove" (click)="clear()" aria-label="Remove media">
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
      flex-wrap: wrap;
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
    .dropzone:hover:not(.is-busy) { border-color: var(--navy); background: var(--surface); }
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

    .hint { margin: 0; font-size: 12px; color: var(--text-subtle); }
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
    .preview img, .preview video, .preview iframe {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border: 0;
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
      z-index: 2;
    }
    .preview__remove:hover { background: var(--navy); }
    .preview__remove i { font-size: 11px; }
  `]
})
export class MediaPickerComponent {
  private files = inject(FilesService);
  private sanitizer = inject(DomSanitizer);

  @Input() value: MediaSelection | null = null;
  @Output() valueChange = new EventEmitter<MediaSelection | null>();

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
    const url = v.trim();
    if (!url) { this.emit(null); return; }
    // Lightweight kind detection from the URL itself. YouTube/Vimeo →
    // video; ending in image/video extensions → that; otherwise assume image.
    const kind: 'image' | 'video' =
      this.isYoutube(url) || this.isVimeo(url) || /\.(mp4|webm|mov)(\?|$)/i.test(url)
        ? 'video'
        : 'image';
    this.emit({ url, kind });
  }

  onMediaError(): void {
    this.errorMsg.set("Couldn't load this media — check the URL or try uploading instead.");
  }

  clear(): void {
    this.errorMsg.set(null);
    this.emit(null);
  }

  isYoutube(url: string): boolean {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
  }

  isVimeo(url: string): boolean {
    return /vimeo\.com\//.test(url);
  }

  /**
   * Turns a YouTube watch URL into a sanitizer-trusted embed URL.
   * Angular sanitizes iframe src by default — without bypassing, the
   * iframe stays blank.
   */
  youtubeEmbedSafe(url: string): SafeResourceUrl {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
    const embed = m ? `https://www.youtube.com/embed/${m[1]}` : url;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  private uploadFile(file: File): void {
    this.errorMsg.set(null);
    const isImage = /^image\/(jpeg|png|webp|gif)$/.test(file.type);
    const isVideo = /^video\/(mp4|webm|quicktime)$/.test(file.type);
    if (!isImage && !isVideo) {
      this.errorMsg.set('Only JPEG/PNG/WebP/GIF images and MP4/WebM/MOV videos are accepted.');
      return;
    }
    const cap = isImage ? 5 : 20;
    if (file.size > cap * 1024 * 1024) {
      this.errorMsg.set(`File too large — ${isImage ? 'images' : 'videos'} are capped at ${cap} MB.`);
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
          this.emit({ url: ev.result.url, kind: isImage ? 'image' : 'video' });
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Upload failed. Try again.');
      },
    });
  }

  private emit(v: MediaSelection | null): void {
    this.value = v;
    this.valueChange.emit(v);
  }
}

/** Carries both the URL and a hint of what to render. */
export interface MediaSelection {
  url: string;
  kind: 'image' | 'video';
}
