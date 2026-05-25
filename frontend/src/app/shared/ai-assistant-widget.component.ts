import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { AssistantService, RelatedAction } from '../core/assistant.service';
import { ActionsService } from '../core/actions.service';
import { AuthService } from '../core/auth.service';

interface ChatTurn {
  who: 'me' | 'assistant';
  text: string;
  at: Date;
  /** Only set on assistant turns. Drives the action chips below the bubble. */
  related?: RelatedAction[];
}

/**
 * Floating AI assistant — a small navy circle anchored to the bottom-right
 * of every authenticated page. Clicking it pops up a Slack-style chat panel
 * that talks to the Charity Day assistant on the backend.
 *
 * <h3>Action chips</h3>
 * The backend may include a list of related actions with each assistant
 * reply (parsed from {@code [[action:N]]} markers the LLM emits). We
 * render each as a compact card with three buttons:
 * <ul>
 *   <li><b>Open</b> — closes the widget and routes to the action page.</li>
 *   <li><b>Register</b> — calls the register endpoint and re-fetches.</li>
 *   <li><b>Cancel registration</b> — same, in reverse.</li>
 * </ul>
 * The user always confirms by clicking — the AI never performs an
 * action autonomously.
 *
 * <h3>Lifecycle</h3>
 * <ul>
 *   <li>Singleton, mounted in {@code main-layout} so conversation persists
 *       across routes.</li>
 *   <li>Hidden on {@code /login} via router events.</li>
 *   <li>Memory keyed by a per-browser UUID, rotated by "Start new conversation".</li>
 * </ul>
 */
@Component({
  selector: 'app-ai-assistant-widget',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    @if (visible()) {
      @if (open()) {
        <div class="aw-panel" role="dialog" aria-labelledby="aw-title">
          <header class="aw-head">
            <div class="aw-title-row">
              <span class="aw-avatar"><i class="pi pi-sparkles"></i></span>
              <div>
                <h3 id="aw-title">Charity Day assistant</h3>
                <p class="aw-sub">Ask me to help you pick an action</p>
              </div>
            </div>
            <button type="button" class="aw-close" (click)="toggle()" aria-label="Close assistant">
              <i class="pi pi-times"></i>
            </button>
          </header>

          <div #scroll class="aw-scroll" role="log" aria-live="polite">
            @for (m of turns(); track $index) {
              <div class="aw-msg" [class.aw-msg--mine]="m.who === 'me'">
                @if (m.who === 'assistant') {
                  <span class="aw-avatar aw-avatar--sm"><i class="pi pi-sparkles"></i></span>
                }
                <div class="aw-bubble-wrap">
                  <div class="aw-bubble">
                    <p>{{ m.text }}</p>
                    <span class="aw-time">{{ m.at | date:'HH:mm' }}</span>
                  </div>
                  @if (m.who === 'assistant' && m.related && m.related.length > 0) {
                    <div class="aw-chips">
                      @for (a of m.related; track a.id) {
                        <div class="aw-chip" [class.aw-chip--closed]="a.isClosed">
                          <div class="aw-chip__head">
                            <span class="aw-chip__title">{{ a.title }}</span>
                            @if (a.isClosed) {
                              <span class="aw-pill aw-pill--off">Closed</span>
                            } @else if (a.seatsRemaining === 0) {
                              <span class="aw-pill aw-pill--off">Full</span>
                            } @else if (a.currentUserRegistered) {
                              <span class="aw-pill aw-pill--ok">Registered</span>
                            } @else {
                              <span class="aw-pill aw-pill--neutral">{{ a.seatsRemaining }} left</span>
                            }
                          </div>
                          <div class="aw-chip__meta">
                            <span><i class="pi pi-calendar"></i> {{ a.actionDate | date:'EEE, MMM d · HH:mm' }}</span>
                            @if (a.location) {
                              <span><i class="pi pi-map-marker"></i> {{ a.location }}</span>
                            }
                          </div>
                          <div class="aw-chip__actions">
                            <button type="button" class="aw-cbtn aw-cbtn--ghost" (click)="openAction(a)">
                              <i class="pi pi-external-link"></i> Open
                            </button>
                            @if (!a.isClosed) {
                              @if (a.currentUserRegistered) {
                                <button type="button" class="aw-cbtn aw-cbtn--danger"
                                        [disabled]="actionBusy() === a.id"
                                        (click)="cancel(a)">
                                  @if (actionBusy() === a.id) { Working… } @else { Cancel }
                                </button>
                              } @else if (a.seatsRemaining > 0) {
                                <button type="button" class="aw-cbtn aw-cbtn--primary"
                                        [disabled]="actionBusy() === a.id"
                                        (click)="register(a)">
                                  @if (actionBusy() === a.id) { Working… } @else { Register }
                                </button>
                              }
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            @if (waiting()) {
              <div class="aw-msg">
                <span class="aw-avatar aw-avatar--sm"><i class="pi pi-sparkles"></i></span>
                <div class="aw-bubble">
                  <span class="aw-typing">
                    <span></span><span></span><span></span>
                  </span>
                </div>
              </div>
            }
            @if (errorMsg()) {
              <p class="aw-err">{{ errorMsg() }}</p>
            }
          </div>

          <form class="aw-composer" (ngSubmit)="send()">
            <input type="text" class="aw-input" name="draft"
                   [(ngModel)]="draft"
                   placeholder="Ask me anything about the actions…"
                   autocomplete="off"
                   [disabled]="waiting()" />
            <button class="aw-send" type="submit"
                    [disabled]="!draft.trim() || waiting()"
                    aria-label="Send">
              <i class="pi pi-send"></i>
            </button>
          </form>

          @if (turns().length > 1) {
            <button type="button" class="aw-reset" (click)="reset()">
              Start a new conversation
            </button>
          }
        </div>
      }

      <button type="button" class="aw-bubble-btn"
              [class.aw-bubble-btn--open]="open()"
              (click)="toggle()"
              [attr.aria-label]="open() ? 'Close assistant' : 'Open assistant'"
              title="Charity Day assistant">
        @if (open()) {
          <i class="pi pi-times"></i>
        } @else {
          <i class="pi pi-sparkles"></i>
        }
      </button>
    }
  `,
  styles: [`
    :host { display: contents; }

    /* Floating bubble button */
    .aw-bubble-btn {
      position: fixed;
      right: 22px;
      bottom: 22px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 0;
      background: var(--navy);
      color: white;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(22, 31, 58, 0.32);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      transition: background 0.15s, transform 0.15s;
    }
    .aw-bubble-btn:hover { background: var(--navy-hover); transform: translateY(-1px); }
    .aw-bubble-btn i { font-size: 20px; }
    .aw-bubble-btn--open i { font-size: 14px; }

    /* Panel */
    .aw-panel {
      position: fixed;
      right: 22px;
      bottom: 92px;
      width: 400px;
      max-width: calc(100vw - 32px);
      height: 600px;
      max-height: calc(100vh - 130px);
      background: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 64px rgba(22, 31, 58, 0.28);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 1099;
      border: 1px solid var(--border);
    }

    .aw-head {
      padding: 14px 16px;
      background: var(--navy);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .aw-title-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .aw-head h3 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -0.005em; }
    .aw-sub { margin: 0; font-size: 11.5px; color: rgba(255, 255, 255, 0.65); }
    .aw-close {
      appearance: none;
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.75);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
    }
    .aw-close:hover { background: rgba(255,255,255,0.1); color: white; }
    .aw-close i { font-size: 12px; }

    /* Avatar — yellow sparkles bubble */
    .aw-avatar {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: var(--yellow);
      color: var(--navy-deep);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .aw-avatar i { font-size: 13px; }
    .aw-avatar--sm { width: 24px; height: 24px; }
    .aw-avatar--sm i { font-size: 11px; }

    /* Messages */
    .aw-scroll {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: var(--surface);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .aw-msg {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      max-width: 88%;
      align-self: flex-start;
    }
    .aw-msg--mine { align-self: flex-end; flex-direction: row-reverse; }
    .aw-bubble-wrap { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .aw-bubble {
      background: var(--white);
      border-radius: 14px;
      padding: 8px 12px 6px;
      box-shadow: 0 1px 2px rgba(32,44,80,0.06);
      min-width: 50px;
    }
    .aw-msg--mine .aw-bubble {
      background: var(--yellow-soft);
      border: 1px solid rgba(244, 228, 67, 0.6);
    }
    .aw-bubble p {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.45;
      color: var(--text);
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .aw-time {
      display: block;
      font-size: 10.5px;
      color: var(--text-subtle);
      margin-top: 3px;
      text-align: right;
    }

    /* Action chips */
    .aw-chips { display: flex; flex-direction: column; gap: 6px; }
    .aw-chip {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .aw-chip--closed { opacity: 0.65; }
    .aw-chip__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .aw-chip__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--navy);
      line-height: 1.3;
    }
    .aw-pill {
      font-size: 10.5px;
      font-weight: 500;
      padding: 2px 7px;
      border-radius: 999px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .aw-pill--ok      { background: #E8F4ED; color: #1B7F4F; }
    .aw-pill--off     { background: #EEF0F5; color: #6B7592; }
    .aw-pill--neutral { background: var(--yellow); color: var(--navy-deep); }

    .aw-chip__meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .aw-chip__meta span { display: inline-flex; align-items: center; gap: 5px; }
    .aw-chip__meta i { font-size: 10px; color: var(--text-subtle); }

    .aw-chip__actions { display: flex; gap: 6px; margin-top: 4px; }
    .aw-cbtn {
      appearance: none;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 5px 11px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .aw-cbtn i { font-size: 10px; }
    .aw-cbtn:disabled { opacity: 0.55; cursor: progress; }
    .aw-cbtn--ghost {
      background: var(--surface);
      color: var(--navy);
      border-color: var(--border);
    }
    .aw-cbtn--ghost:hover:not(:disabled) { background: var(--surface-2); }
    .aw-cbtn--primary {
      background: var(--navy);
      color: white;
      border-color: var(--navy);
    }
    .aw-cbtn--primary:hover:not(:disabled) { background: var(--navy-hover); }
    .aw-cbtn--danger {
      background: var(--white);
      color: #8B1F1F;
      border-color: #DBA5A5;
    }
    .aw-cbtn--danger:hover:not(:disabled) { background: #FBEDED; }

    /* Typing indicator */
    .aw-typing { display: inline-flex; gap: 4px; padding: 4px 0; }
    .aw-typing span {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--text-subtle);
      animation: awTyping 1s infinite ease-in-out;
    }
    .aw-typing span:nth-child(2) { animation-delay: 0.15s; }
    .aw-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes awTyping {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-3px); opacity: 1; }
    }

    .aw-err {
      margin: 6px 0 0;
      padding: 6px 10px;
      background: #FBEDED;
      color: #8B1F1F;
      border-radius: var(--radius-sm);
      font-size: 12px;
    }

    /* Composer */
    .aw-composer {
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      background: var(--white);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .aw-input {
      flex: 1;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      font: 13px 'Inter', system-ui, sans-serif;
      color: var(--text);
    }
    .aw-input:focus {
      outline: 0;
      background: var(--white);
      border-color: var(--navy);
    }
    .aw-input:disabled { cursor: progress; }
    .aw-send {
      appearance: none;
      width: 36px; height: 36px;
      border-radius: 50%;
      border: 0;
      background: var(--navy);
      color: white;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .aw-send:hover:not(:disabled) { background: var(--navy-hover); }
    .aw-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .aw-send i { font-size: 12px; margin-left: 1px; }

    .aw-reset {
      appearance: none;
      background: transparent;
      border: 0;
      border-top: 1px solid var(--border);
      padding: 8px 12px;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
    }
    .aw-reset:hover { color: var(--navy); background: var(--surface); }

    @media (max-width: 480px) {
      .aw-panel {
        right: 12px; left: 12px; bottom: 82px;
        width: auto; height: 75vh;
      }
    }
  `]
})
export class AiAssistantWidgetComponent implements AfterViewChecked {
  @ViewChild('scroll') scrollEl?: ElementRef<HTMLDivElement>;

  private api = inject(AssistantService);
  private actionsApi = inject(ActionsService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly open = signal(false);
  readonly turns = signal<ChatTurn[]>([
    {
      who: 'assistant',
      text: "Hi! I'm here to help you find a Charity Day action that fits you. " +
            "Tell me what kind of cause, location, or schedule works for you — " +
            "or ask me to compare any two actions.",
      at: new Date(),
    },
  ]);
  readonly waiting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  /** Action id currently being registered/cancelled, so its button shows "Working…". */
  readonly actionBusy = signal<number | null>(null);

  private sessionId = crypto.randomUUID();
  draft = '';

  private readonly routeIsLogin = signal(this.router.url.startsWith('/login'));
  readonly visible = computed(() => {
    if (!this.auth.token() || !this.auth.isAuthenticated()) return false;
    return !this.routeIsLogin();
  });

  private shouldAutoScroll = false;

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.routeIsLogin.set((e.url as string).startsWith('/login')));
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.scrollEl) {
      this.shouldAutoScroll = false;
      const el = this.scrollEl.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) this.shouldAutoScroll = true;
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.waiting()) return;
    this.errorMsg.set(null);
    this.turns.update((t) => [...t, { who: 'me', text, at: new Date() }]);
    this.draft = '';
    this.shouldAutoScroll = true;
    this.waiting.set(true);

    this.api.chat(this.sessionId, text).subscribe({
      next: (resp) => {
        this.waiting.set(false);
        this.turns.update((t) => [...t, {
          who: 'assistant',
          text: resp.reply,
          at: new Date(),
          related: resp.relatedActions,
        }]);
        this.shouldAutoScroll = true;
      },
      error: (err) => {
        this.waiting.set(false);
        const msg = err?.error?.message ?? 'Sorry, the assistant is unavailable right now.';
        this.errorMsg.set(msg);
        this.shouldAutoScroll = true;
      },
    });
  }

  /** Open the action's detail page (closes the widget so the page is visible). */
  openAction(a: RelatedAction): void {
    this.open.set(false);
    this.router.navigate(['/actions', a.id]);
  }

  register(a: RelatedAction): void {
    this.actionBusy.set(a.id);
    this.errorMsg.set(null);
    this.actionsApi.register(a.id).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.markRegistered(a.id, true);
      },
      error: (err) => {
        this.actionBusy.set(null);
        this.errorMsg.set(this.friendlyError(err) ?? 'Could not register.');
      },
    });
  }

  cancel(a: RelatedAction): void {
    this.actionBusy.set(a.id);
    this.errorMsg.set(null);
    this.actionsApi.unregister(a.id).subscribe({
      next: () => {
        this.actionBusy.set(null);
        this.markRegistered(a.id, false);
      },
      error: (err) => {
        this.actionBusy.set(null);
        this.errorMsg.set(this.friendlyError(err) ?? 'Could not cancel.');
      },
    });
  }

  /** Update every chip referencing this action across the whole transcript. */
  private markRegistered(actionId: number, registered: boolean): void {
    this.turns.update((turns) =>
      turns.map((t) => {
        if (!t.related?.length) return t;
        const updatedRelated = t.related.map((a) =>
          a.id === actionId
            ? {
                ...a,
                currentUserRegistered: registered,
                seatsRemaining: registered
                  ? Math.max(0, a.seatsRemaining - 1)
                  : a.seatsRemaining + 1,
              }
            : a
        );
        return { ...t, related: updatedRelated };
      })
    );
  }

  private friendlyError(err: any): string | null {
    const code = err?.error?.code;
    const map: Record<string, string> = {
      action_full: 'This action is already full.',
      action_closed: 'Registrations are closed for this action.',
      already_registered: 'You are already registered for this action.',
      already_registered_this_year:
        "You're already registered for another action this year. Cancel it first if you want to switch.",
      not_registered: 'You are not registered for this action.',
    };
    return code ? map[code] ?? err?.error?.message ?? null : null;
  }

  reset(): void {
    this.sessionId = crypto.randomUUID();
    this.errorMsg.set(null);
    this.turns.set([{
      who: 'assistant',
      text: 'New conversation. What kind of action are you looking for this time?',
      at: new Date(),
    }]);
    this.shouldAutoScroll = true;
  }
}
