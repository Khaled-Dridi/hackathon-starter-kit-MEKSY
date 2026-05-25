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

/**
 * Centered modal that shows a QR code linking to an action's detail
 * page, with download and copy-URL actions. Generation happens entirely
 * client-side via the {@code qrcode} package — no backend round trip.
 *
 * <h3>Why client-side</h3>
 * The URL is computable from {@code window.location.origin + '/actions/'
 * + actionId}, so we don't need the backend to know about it. Avoids
 * adding a Maven dep and an endpoint for what amounts to "draw a square
 * of pixels from a string".
 *
 * <h3>Usage</h3>
 * <pre>
 *   &lt;app-qr-modal
 *     [actionId]="a.id"
 *     [actionTitle]="a.title"
 *     [open]="qrOpen()"
 *     (closed)="qrOpen.set(false)" /&gt;
 * </pre>
 */
@Component({
  selector: 'app-qr-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="qr-backdrop" (click)="closeBackdrop($event)">
        <div class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title">
          <header class="qr-modal__head">
            <h2 id="qr-title">Share this action</h2>
            <button type="button" class="qr-close" (click)="close()" aria-label="Close">
              <i class="pi pi-times"></i>
            </button>
          </header>

          <p class="qr-action">{{ actionTitle }}</p>

          @if (qrDataUrl()) {
            <div class="qr-frame">
              <img [src]="qrDataUrl()" alt="QR code linking to this action" />
            </div>
          } @else {
            <div class="qr-frame qr-frame--loading">Generating…</div>
          }

          <p class="qr-url">{{ url() }}</p>
          @if (copied()) {
            <p class="qr-copied"><i class="pi pi-check"></i> URL copied to clipboard</p>
          }

          <div class="qr-actions">
            <button type="button" class="btn btn--ghost btn--sm" (click)="copyUrl()">
              <i class="pi pi-copy"></i> Copy URL
            </button>
            <button type="button" class="btn btn--primary btn--sm"
                    [disabled]="!qrDataUrl()"
                    (click)="download()">
              <i class="pi pi-download"></i> Download QR
            </button>
          </div>

          <p class="qr-hint">
            Print this on a poster or share the URL. Scanning takes people
            straight to this action's page.
          </p>
        </div>
      </div>
    }
  `,
  styles: [`
    .qr-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(22, 31, 58, 0.45);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 16px;
    }
    .qr-modal {
      background: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 64px rgba(22, 31, 58, 0.28);
      width: 100%;
      max-width: 420px;
      padding: 22px 24px 24px;
      text-align: center;
    }
    .qr-modal__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      text-align: left;
    }
    .qr-modal__head h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--navy);
      margin: 0;
      letter-spacing: -0.01em;
    }
    .qr-close {
      appearance: none;
      background: transparent;
      border: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      color: var(--text-subtle);
    }
    .qr-close:hover { background: var(--surface); color: var(--navy); }
    .qr-close i { font-size: 12px; }

    .qr-action {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0 0 14px;
      text-align: left;
    }

    .qr-frame {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      margin: 0 auto 14px;
      width: fit-content;
    }
    .qr-frame img { display: block; width: 256px; height: 256px; image-rendering: pixelated; }
    .qr-frame--loading {
      width: 256px;
      height: 256px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-subtle);
      font-size: 13px;
      background: var(--surface-2);
    }

    .qr-url {
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      color: var(--text-muted);
      word-break: break-all;
      margin: 0 0 8px;
      padding: 8px 10px;
      background: var(--surface);
      border-radius: var(--radius-sm);
    }
    .qr-copied {
      font-size: 12px;
      color: #1B7F4F;
      margin: 0 0 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .qr-copied i { font-size: 10px; }

    .qr-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin: 14px 0 10px;
    }
    .qr-actions i { font-size: 11px; margin-right: 4px; }

    .qr-hint {
      font-size: 12px;
      color: var(--text-subtle);
      margin: 0;
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
    // Regenerate whenever the modal opens for a (potentially different) action.
    if ((c['open'] && this.open) || c['actionId']) {
      if (this.open) this.generate();
      else this.qrDataUrl.set(null);
    }
  }

  close(): void { this.closed.emit(); }

  closeBackdrop(e: MouseEvent): void {
    // Only close when clicking the dim layer itself, not the modal contents.
    if (e.target === e.currentTarget) this.close();
  }

  private generate(): void {
    this.copied.set(false);
    const u = `${window.location.origin}/actions/${this.actionId}`;
    this.url.set(u);
    // Larger margin + medium error-correction → still scannable when printed
    // on a poster even with a small smudge.
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
      // Fallback for browsers without clipboard API access (rare in practice).
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
