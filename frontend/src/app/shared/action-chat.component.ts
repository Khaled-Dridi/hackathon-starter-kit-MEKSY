import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ActionChatService, ChatMessage } from '../core/action-chat.service';
import { AuthService } from '../core/auth.service';
import { EventsService, DomainEvent } from '../core/events.service';
import { I18nService } from '../core/i18n.service';

/**
 * Per-action chat panel. Renders a WhatsApp-style bubble list with my
 * messages right-aligned and others' left-aligned with author avatar.
 * Auto-scrolls to the latest message after each refresh.
 *
 * <h3>Access</h3>
 * The parent component passes {@link canChat} (true if the current user
 * is registered for the action, or admin). When false, the component
 * shows a "register first" placeholder instead of the chat UI and skips
 * the initial list fetch.
 *
 * <h3>Real-time</h3>
 * Listens to {@code chat.message.sent} SSE events scoped to this
 * action and refetches. The event payload deliberately doesn't carry
 * the message body — privacy gate stays at the API level.
 */
@Component({
  selector: 'app-action-chat',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <section class="chat">
      <header class="chat__head">
        <h2>{{ i18n.t('chat.title') }}</h2>
        <span class="meta">
          @if (canChat) { {{ i18n.t('chat.meta.canChat') }} }
          @else         { {{ i18n.t('chat.meta.locked') }} }
        </span>
      </header>

      @if (!canChat) {
        <div class="chat__locked">
          <i class="pi pi-lock"></i>
          <p [innerHTML]="i18n.t('chat.locked.body')"></p>
        </div>
      } @else {
        <div #scroll class="chat__scroll" role="log" aria-live="polite">
          @if (loading()) {
            <p class="empty">{{ i18n.t('chat.loading') }}</p>
          } @else if (messages().length === 0) {
            <p class="empty">{{ i18n.t('chat.empty') }}</p>
          } @else {
            @for (m of messages(); track m.id) {
              <div class="msg" [class.msg--mine]="m.authorId === myUserId()">
                @if (m.authorId !== myUserId()) {
                  <span class="avatar" [style.background]="navy">{{ initials(m.authorEmail) }}</span>
                }
                <div class="bubble">
                  @if (m.authorId !== myUserId()) {
                    <span class="bubble__name">{{ m.authorEmail }}</span>
                  }
                  <p class="bubble__text">{{ m.body }}</p>
                  <span class="bubble__time">{{ m.createdAt | date:'HH:mm':'':i18n.locale() }}</span>
                </div>
              </div>
            }
          }
        </div>

        <form class="chat__composer" (ngSubmit)="send()" #f="ngForm">
          <input type="text" class="chat__input" name="body"
                 [(ngModel)]="draft"
                 [placeholder]="i18n.t('chat.input.placeholder')"
                 autocomplete="off"
                 [disabled]="sending()" />
          <button class="btn btn--primary btn--sm" type="submit"
                  [disabled]="!draft.trim() || sending()">
            @if (sending()) { {{ i18n.t('chat.sending') }} } @else { {{ i18n.t('chat.send') }} }
          </button>
        </form>

        @if (errorMsg()) {
          <p class="err">{{ errorMsg() }}</p>
        }
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .chat {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
      border-top: 1px solid var(--border);
      padding-top: 24px;
    }
    .chat__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    .chat__head h2 {
      font-size: 20px;
      letter-spacing: -0.01em;
      font-weight: 600;
      color: var(--navy);
      margin: 0;
    }
    .meta { color: var(--text-muted); font-size: 13px; }

    .chat__locked {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px 22px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: var(--text-muted);
    }
    .chat__locked i { font-size: 24px; color: var(--text-subtle); }
    .chat__locked p { margin: 0; font-size: 14px; line-height: 1.5; }
    .chat__locked strong { color: var(--navy); font-weight: 600; }

    .chat__scroll {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 16px;
      max-height: 420px;
      min-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .msg {
      display: flex;
      gap: 8px;
      max-width: 80%;
      align-self: flex-start;
    }
    .msg--mine {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .bubble {
      background: var(--white);
      border-radius: 14px;
      padding: 8px 12px 6px;
      box-shadow: 0 1px 2px rgba(32,44,80,0.06);
      min-width: 60px;
    }
    .msg--mine .bubble {
      background: var(--yellow-soft);
      border: 1px solid rgba(244, 228, 67, 0.6);
    }
    .bubble__name {
      display: block;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--navy);
      margin-bottom: 2px;
    }
    .bubble__text {
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
      color: var(--text);
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .bubble__time {
      display: block;
      font-size: 10.5px;
      color: var(--text-subtle);
      margin-top: 2px;
      text-align: right;
    }

    .empty {
      margin: auto;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    .chat__composer {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .chat__input {
      flex: 1;
      height: 40px;
      padding: 0 14px;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      background: var(--white);
      font: 14px 'Inter', system-ui, sans-serif;
      color: var(--text);
    }
    .chat__input:focus {
      outline: 0;
      border-color: var(--navy);
      box-shadow: 0 0 0 3px rgba(32,44,80,0.08);
    }
    .chat__input:disabled { background: var(--surface); cursor: progress; }

    .err {
      margin: 0;
      padding: 8px 12px;
      background: #FBEDED;
      color: #8B1F1F;
      border-radius: var(--radius);
      font-size: 12.5px;
    }
  `]
})
export class ActionChatComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input({ required: true }) actionId!: number;
  /** True when the current user can chat (registered or admin). */
  @Input() canChat = false;

  @ViewChild('scroll') scrollEl?: ElementRef<HTMLDivElement>;

  readonly i18n = inject(I18nService);
  private chat = inject(ActionChatService);
  private auth = inject(AuthService);
  private events = inject(EventsService);

  readonly navy = '#202C50';

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly errorMsg = signal<string | null>(null);

  draft = '';

  readonly myUserId = computed(() => {
    const sub = this.auth.payload()?.sub;
    return sub ? Number(sub) : null;
  });

  private offEvents: Array<() => void> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** Set on each refresh to nudge the scrollEl down after the view updates. */
  private shouldAutoScroll = false;

  ngOnInit(): void {
    if (this.canChat) this.refresh();

    this.offEvents.push(
      this.events.on('chat.message.sent', (ev: DomainEvent) => {
        if (ev.actionId === this.actionId && this.canChat) this.scheduleRefresh();
      })
    );
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['canChat'] && this.canChat && !c['canChat'].firstChange) {
      // User just registered → load chat
      this.refresh();
    }
    if (c['actionId'] && !c['actionId'].firstChange && this.canChat) {
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.offEvents.forEach((off) => off());
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  ngAfterViewChecked(): void {
    // Scroll to the bottom after the message list updates.
    if (this.shouldAutoScroll && this.scrollEl) {
      this.shouldAutoScroll = false;
      const el = this.scrollEl.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refresh();
    }, 150);
  }

  private refresh(): void {
    this.loading.set(this.messages().length === 0);  // only show "Loading…" the first time
    this.chat.list(this.actionId).subscribe({
      next: (data) => {
        this.messages.set(data);
        this.loading.set(false);
        this.shouldAutoScroll = true;
      },
      error: (err) => {
        this.loading.set(false);
        // 403 means the user lost access (e.g., unregistered just now).
        if (err.status !== 403) {
          this.errorMsg.set(this.i18n.t('chat.err.load'));
        }
      },
    });
  }

  send(): void {
    const body = this.draft.trim();
    if (!body || this.sending()) return;
    this.sending.set(true);
    this.errorMsg.set(null);
    this.chat.send(this.actionId, body).subscribe({
      next: () => {
        this.sending.set(false);
        this.draft = '';
        // Optimistic: refresh now so the message shows up immediately for
        // the sender; SSE will also fire shortly for everyone else.
        this.refresh();
      },
      error: (err) => {
        this.sending.set(false);
        this.errorMsg.set(err?.error?.message ?? this.i18n.t('chat.err.send'));
      },
    });
  }

  initials(email: string | null | undefined): string {
    if (!email) return '??';
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }
}
