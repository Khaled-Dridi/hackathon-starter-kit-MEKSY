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
import { I18nService } from '../core/i18n.service';

interface ChatTurn {
  who: 'me' | 'assistant';
  text: string;
  at: Date;
  related?: RelatedAction[];
}

@Component({
  selector: 'app-ai-assistant-widget',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    @if (visible()) {
      @if (open()) {
        <div class="ai-panel" role="dialog" aria-labelledby="aw-title">
          <header class="ai-panel__head">
            <span class="aw-sparkle" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/></svg>
            </span>
            <div style="flex:1; min-width:0;">
              <div class="ai-panel__title" id="aw-title">{{ i18n.t('ai.title') }}</div>
              <div class="ai-panel__status">
                <span class="dot"></span> {{ i18n.t('ai.status') }}
              </div>
            </div>
            <button type="button" class="modal__close" (click)="toggle()" [attr.aria-label]="i18n.t('ai.close.aria')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <div #scroll class="ai-panel__body" role="log" aria-live="polite">
            @for (m of turns(); track $index) {
              <div class="ai-msg" [class.ai-msg--user]="m.who === 'me'">
                @if (m.who === 'assistant') {
                  <span class="ai-msg__avatar aw-sparkle aw-sparkle--sm" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/></svg>
                  </span>
                }
                <div style="display:flex; flex-direction:column; gap:8px; min-width:0; flex:1;">
                  <div class="ai-msg__bubble">{{ m.text }}</div>
                  @if (m.who === 'assistant' && m.related && m.related.length > 0) {
                    <div class="ai-chips">
                      @for (a of m.related; track a.id) {
                        <div class="ai-chip" [class.is-closed]="a.isClosed">
                          <div class="ai-chip__head">
                            <span class="ai-chip__title">{{ a.title }}</span>
                            @if (a.isClosed) {
                              <span class="pill pill--closed"><span class="dot"></span>{{ i18n.t('ai.chip.closed') }}</span>
                            } @else if (a.seatsRemaining === 0) {
                              <span class="pill pill--full"><span class="dot"></span>{{ i18n.t('ai.chip.full') }}</span>
                            } @else if (a.currentUserRegistered) {
                              <span class="pill pill--reg">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                {{ i18n.t('ai.chip.registered') }}
                              </span>
                            } @else if (a.seatsRemaining <= 3) {
                              <span class="pill pill--almost">{{ i18n.t('ai.chip.left', { n: a.seatsRemaining }) }}</span>
                            } @else {
                              <span class="pill pill--open"><span class="dot"></span>{{ i18n.t('ai.chip.open.pill') }}</span>
                            }
                          </div>
                          <div class="ai-chip__meta">
                            <span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {{ a.actionDate | date:'EEE, MMM d · HH:mm':'':i18n.locale() }}
                            </span>
                            @if (a.location) {
                              <span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {{ a.location }}
                              </span>
                            }
                          </div>
                          <div class="ai-chip__row">
                            <button type="button" class="btn btn--secondary btn--sm" (click)="openAction(a)">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              {{ i18n.t('ai.chip.open') }}
                            </button>
                            @if (!a.isClosed) {
                              @if (a.currentUserRegistered) {
                                <button type="button" class="btn btn--danger-ghost btn--sm"
                                        [disabled]="actionBusy() === a.id"
                                        [class.btn--loading]="actionBusy() === a.id"
                                        (click)="cancel(a)">
                                  {{ i18n.t('ai.chip.cancel') }}
                                </button>
                              } @else if (a.seatsRemaining > 0) {
                                <button type="button" class="btn btn--yellow btn--sm"
                                        [disabled]="actionBusy() === a.id"
                                        [class.btn--loading]="actionBusy() === a.id"
                                        (click)="register(a)">
                                  {{ i18n.t('ai.chip.signMeUp') }}
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
              <div class="ai-msg">
                <span class="ai-msg__avatar aw-sparkle aw-sparkle--sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/></svg>
                </span>
                <div class="ai-msg__bubble">
                  <span class="ai-typing"><span></span><span></span><span></span></span>
                </div>
              </div>
            }
            @if (errorMsg()) {
              <div class="banner banner--error" style="font-size: 0.8125rem;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div class="banner__body">{{ errorMsg() }}</div>
              </div>
            }
          </div>

          <div class="ai-panel__footer">
            <form class="ai-input-row" (ngSubmit)="send()">
              <input type="text" name="draft"
                     [(ngModel)]="draft"
                     [placeholder]="i18n.t('ai.input.placeholder')"
                     autocomplete="off"
                     [disabled]="waiting()" />
              <button class="send" type="submit"
                      [disabled]="!draft.trim() || waiting()"
                      [attr.aria-label]="i18n.t('ai.send.aria')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
            @if (turns().length > 1) {
              <button type="button" class="aw-reset" (click)="reset()">
                {{ i18n.t('ai.reset') }}
              </button>
            }
          </div>
        </div>
      }

      <button type="button" class="ai-bubble"
              (click)="toggle()"
              [attr.aria-label]="open() ? i18n.t('ai.close.aria') : i18n.t('ai.open.aria')"
              [title]="i18n.t('ai.bubble.title')">
        @if (open()) {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;color:#fff;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        } @else {
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/></svg>
        }
      </button>
    }
  `,
  styles: [`
    :host { display: contents; }

    .aw-sparkle {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FCEC5C 0%, #E4D32A 100%);
      color: var(--accent-ink);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(244,228,67,0.4);
    }
    .aw-sparkle svg { width: 14px; height: 14px; }
    .aw-sparkle--sm { width: 26px; height: 26px; }

    .ai-panel { bottom: 92px; }

    .ai-chip__title {
      font-weight: 600; font-size: 0.9375rem;
      flex: 1; min-width: 0;
      line-height: 1.3;
    }
    .ai-chip__head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
    }
    .ai-chip__meta {
      display: flex; flex-direction: column; gap: 4px;
      font-size: 0.8125rem; color: var(--muted);
    }
    .ai-chip__meta span { display: inline-flex; align-items: center; gap: 6px; }

    .ai-chip.is-closed { opacity: 0.65; }

    .aw-reset {
      background: transparent;
      border: 0;
      padding: 4px 8px;
      color: var(--muted);
      font-size: 0.75rem;
      cursor: pointer;
      align-self: center;
      transition: color var(--t-hover) var(--ease);
    }
    .aw-reset:hover { color: var(--ink); text-decoration: underline; }

    @media (max-width: 480px) {
      .ai-panel {
        right: 12px; left: 12px; bottom: 88px;
        width: auto; height: 75vh;
      }
      .ai-bubble { right: 16px; bottom: 16px; }
    }
  `]
})
export class AiAssistantWidgetComponent implements AfterViewChecked {
  @ViewChild('scroll') scrollEl?: ElementRef<HTMLDivElement>;

  readonly i18n = inject(I18nService);
  private api = inject(AssistantService);
  private actionsApi = inject(ActionsService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly open = signal(false);
  // Intro turn refreshes whenever the language changes — computed pulls i18n.lang().
  readonly turns = signal<ChatTurn[]>([
    { who: 'assistant', text: '', at: new Date() }
  ]);
  readonly waiting = signal(false);
  readonly errorMsg = signal<string | null>(null);
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

    // Set initial intro using current language.
    this.turns.set([{ who: 'assistant', text: this.i18n.t('ai.intro'), at: new Date() }]);
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
        const msg = err?.error?.message ?? this.i18n.t('ai.err.unavailable');
        this.errorMsg.set(msg);
        this.shouldAutoScroll = true;
      },
    });
  }

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
        this.errorMsg.set(this.friendlyError(err) ?? this.i18n.t('ai.err.register'));
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
        this.errorMsg.set(this.friendlyError(err) ?? this.i18n.t('ai.err.cancel'));
      },
    });
  }

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
      action_full: this.i18n.t('detail.err.full'),
      action_closed: this.i18n.t('detail.err.closed'),
      already_registered: this.i18n.t('detail.err.already'),
      already_registered_this_year: this.i18n.t('ai.err.alreadyYear'),
      not_registered: this.i18n.t('detail.err.notReg'),
    };
    return code ? map[code] ?? err?.error?.message ?? null : null;
  }

  reset(): void {
    this.sessionId = crypto.randomUUID();
    this.errorMsg.set(null);
    this.turns.set([{
      who: 'assistant',
      text: this.i18n.t('ai.reset.greeting'),
      at: new Date(),
    }]);
    this.shouldAutoScroll = true;
  }
}
