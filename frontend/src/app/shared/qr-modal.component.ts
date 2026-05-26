import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="closeBackdrop($event)">
        <div class="modal modal--sm" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <header class="modal__header">
            <h2 class="modal__title" id="qr-title">Share this action</h2>
            <button type="button" class="modal__close" (click)="close()" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <div class="modal__body" style="text-align: center;">
            <p class="muted" style="font-size: 0.875rem; margin: 0 0 16px; text-align: left;">
              {{ actionTitle }}
            </p>

            @if (qrDataUrl()) {
              <div class="qr-frame">
                <img [src]="qrDataUrl()" alt="QR code linking to this action" />
              </div>
            } @else {
              <div class="qr-frame qr-frame--loading">Generating…</div>
            }

            <div class="qr-url" role="group" aria-label="Action URL">
              {{ url() }}
            </div>
            @if (copied()) {
              <p class="qr-copied" role="status">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                URL copied
              </p>
            }
          </div>

          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" (click)="copyUrl()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy URL
            </button>
            <button type="button" class="btn btn--primary"
                    [disabled]="!qrDataUrl()"
                    (click)="download()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download PNG
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .qr-frame {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      margin: 0 auto 14px;
      width: fit-content;
      box-shadow: var(--sh-card);
    }
    .qr-frame img { display: block; width: 256px; height: 256px; image-rendering: pixelated; }
    .qr-frame--loading {
      width: 286px; height: 286px;
      display: flex; align-items: center; justify-content: center;
      color: var(--muted-2); font-size: 0.875rem;
      background: var(--surface-2);
    }

    .qr-url {
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      color: var(--muted);
      word-break: break-all;
      margin: 0;
      padding: 10px 12px;
      background: var(--bg);
      border-radius: 10px;
      text-align: left;
    }
    .qr-copied {
      font-size: 0.8125rem;
      color: var(--success);
      margin: 8px 0 0;
      display: inline-flex; align-items: center; gap: 4px;
    }
  `]
})
export class QrModalComponent implements OnChanges {
  @Input({ required: true }) actionId!: number;
  @Input({ required: true }) actionTitle!: string;
  @Input() open = false;

  @Output() closed = new EventEmitter<void>();

  readonly qrDataUrl = signal<string | null>(null);
  readonly url = signal<string>('');
  readonly copied = signal(false);

  ngOnChanges(c: SimpleChanges): void {
    if ((c['open'] && this.open) || c['actionId']) {
      if (this.open) this.generate();
      else this.qrDataUrl.set(null);
    }
  }

  close(): void { this.closed.emit(); }

  closeBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close();
  }

  private generate(): void {
    this.copied.set(false);
    const u = `${window.location.origin}/actions/${this.actionId}`;
    this.url.set(u);
    QRCode.toDataURL(u, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#202C50', light: '#FFFFFF' },
    })
      .then((dataUrl) => this.qrDataUrl.set(dataUrl))
      .catch(() => this.qrDataUrl.set(null));
  }

  download(): void {
    const dataUrl = this.qrDataUrl();
    if (!dataUrl) return;
    const safeName = this.actionTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50) || `action-${this.actionId}`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = this.url();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    }
  }
}
