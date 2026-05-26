import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ActionsService, CharityAction, Registrant } from '../../core/actions.service';
import { AuthService } from '../../core/auth.service';
import { EventsService } from '../../core/events.service';
import { I18nService } from '../../core/i18n.service';
import { ActionMapComponent } from '../../shared/action-map.component';
import { ActionFeedComponent } from '../../shared/action-feed.component';
import { ActionChatComponent } from '../../shared/action-chat.component';
import { QrModalComponent } from '../../shared/qr-modal.component';

@Component({
  selector: 'app-action-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, ActionMapComponent, ActionFeedComponent, ActionChatComponent, QrModalComponent],
  template: `
    @if (loading()) {
      <div class="container">
        <div class="detail" aria-hidden="true">
          <div>
            <span class="skeleton skeleton--line is-short" style="width:120px; margin-top:16px;"></span>
            <span class="skeleton" style="height:36px; width:60%; margin:14px 0;"></span>
            <span class="skeleton skeleton--line"></span>
            <span class="skeleton skeleton--line"></span>
            <span class="skeleton" style="aspect-ratio:16/7; width:100%; margin:24px 0 32px; border-radius:16px;"></span>
            <span class="skeleton skeleton--line"></span>
            <span class="skeleton skeleton--line"></span>
            <span class="skeleton skeleton--line is-short"></span>
          </div>
          <aside class="aside">
            <div class="registration">
              <span class="skeleton skeleton--line is-short"></span>
              <span class="skeleton" style="height:32px; width:50%; margin:12px 0;"></span>
              <span class="skeleton" style="height:6px; width:100%; margin:8px 0 16px;"></span>
              <span class="skeleton" style="height:44px; width:100%; border-radius:12px;"></span>
            </div>
          </aside>
        </div>
      </div>
    } @else if (action(); as a) {
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <div class="breadcrumb__crumbs">
            <a routerLink="/actions">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              {{ i18n.t('detail.breadcrumb.actions') }}
            </a>
            <span class="breadcrumb__sep">/</span>
            <span class="current">{{ a.title }}</span>
          </div>
          <button type="button" class="btn btn--secondary btn--sm" (click)="qrOpen.set(true)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="18" y1="14" x2="18" y2="18"/><line x1="14" y1="18" x2="21" y2="18"/><line x1="18" y1="21" x2="21" y2="21"/></svg>
            {{ i18n.t('detail.share.qr') }}
          </button>
        </nav>

        <article class="detail">
          <div>
            <header class="detail__head">
              @if (a.oddTag) {
                <span class="sdg-tag">
                  <span class="sdg-num">{{ a.oddTag }}</span>
                </span>
              }
              <h1 class="detail__title">{{ a.title }}</h1>
              @if (a.description) {
                <p class="detail__lede">{{ firstSentence(a.description) }}</p>
              }
              <div class="detail__meta">
                <span class="row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {{ a.actionDate | date:'EEEE, MMMM d':'':i18n.locale() }} · {{ a.actionDate | date:'HH:mm':'':i18n.locale() }}
                </span>
                @if (a.location) {
                  <span class="row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ a.location }}
                  </span>
                }
              </div>
            </header>

            @if (a.imageUrl) {
              <img class="detail__cover detail__cover--image" [src]="a.imageUrl"
                   [alt]="'Cover for ' + a.title" />
            } @else {
              <div class="detail__cover cover-gradient--b" role="img" [attr.aria-label]="a.title">
                <span class="cover-tile"></span>
                <span class="cover-decor"></span>
              </div>
            }

            <section class="prose">
              @if (a.description) {
                <h2 class="section-title">{{ i18n.t('detail.section.about') }}</h2>
                @for (p of paragraphs(a.description); track $index) {
                  <p>{{ p }}</p>
                }
              }

              <h2 class="section-title">{{ i18n.t('detail.section.where') }}</h2>
              <dl class="dl">
                <div>
                  <dt>{{ i18n.t('detail.field.date') }}</dt>
                  <dd>{{ a.actionDate | date:'EEEE, MMMM d, y':'':i18n.locale() }}</dd>
                </div>
                <div>
                  <dt>{{ i18n.t('detail.field.time') }}</dt>
                  <dd>{{ a.actionDate | date:'HH:mm':'':i18n.locale() }}</dd>
                </div>
                @if (a.location) {
                  <div>
                    <dt>{{ i18n.t('detail.field.location') }}</dt>
                    <dd>{{ a.location }}</dd>
                  </div>
                }
                @if (a.oddTag) {
                  <div>
                    <dt>{{ i18n.t('detail.field.sdg') }}</dt>
                    <dd>{{ a.oddTag }}</dd>
                  </div>
                }
              </dl>

              @if (a.latitude !== null && a.longitude !== null) {
                <div class="detail__map">
                  <app-action-map [actions]="[a]" [height]="280" />
                </div>
              }

              @if (a.impactSummary) {
                <h2 class="section-title">{{ i18n.t('detail.section.impact') }}</h2>
                <p>{{ a.impactSummary }}</p>
              }
            </section>

            <app-action-feed [actionId]="a.id" />

            <app-action-chat
              [actionId]="a.id"
              [canChat]="a.currentUserRegistered || isAdmin()" />

            <app-qr-modal
              [actionId]="a.id"
              [actionTitle]="a.title"
              [open]="qrOpen()"
              (closed)="qrOpen.set(false)" />
          </div>

          <aside class="aside" [attr.aria-label]="i18n.t('detail.reg.label')">
            <div class="registration card">
              <div class="registration__head">
                <span class="label">{{ i18n.t('detail.reg.label') }}</span>
                @if (a.isClosed) {
                  <span class="pill pill--closed"><span class="dot"></span>{{ i18n.t('actions.card.closed') }}</span>
                } @else if (a.seatsRemaining === 0) {
                  <span class="pill pill--full"><span class="dot"></span>{{ i18n.t('actions.card.full') }}</span>
                } @else if (a.seatsRemaining <= 3) {
                  <span class="pill pill--almost">{{ i18n.t('actions.card.seatsLeft', { n: a.seatsRemaining }) }}</span>
                } @else {
                  <span class="pill pill--open"><span class="dot"></span>{{ i18n.t('actions.card.open') }}</span>
                }
              </div>

              <div class="registration__seats-block">
                <div class="registration__count">
                  <strong>{{ a.registeredCount }}</strong>
                  <span class="muted">{{ i18n.t('detail.reg.count.of', { n: a.capacity }) }}</span>
                </div>
                @if (!a.isClosed && a.seatsRemaining > 0) {
                  <div class="registration__left">{{ i18n.t('detail.reg.left', { n: a.seatsRemaining }) }}</div>
                }
                <div class="progress" [class.progress--urgent]="isUrgent(a)" style="margin-top: 10px;">
                  <div class="progress__bar" [style.width.%]="fillPercent(a)"></div>
                </div>
              </div>

              @if (a.currentUserRegistered) {
                <button class="btn btn--secondary btn--lg btn--block" type="button"
                        [disabled]="busy()" [class.btn--loading]="busy()"
                        (click)="unregister(a.id)">
                  {{ i18n.t('detail.reg.cancelMine') }}
                </button>
                <p class="registration__meta">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E9D6B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg>
                  {{ i18n.t('detail.reg.imIn') }}
                </p>
              } @else {
                <button class="btn btn--yellow btn--lg btn--block" type="button"
                        [disabled]="busy() || a.isClosed || a.seatsRemaining === 0"
                        [class.btn--loading]="busy()"
                        (click)="register(a.id)">
                  {{ i18n.t('detail.reg.signMeUp') }}
                </button>
                <p class="registration__meta">
                  {{ i18n.t('detail.reg.afterSignup') }}
                </p>
              }

              @if (errorMsg()) {
                <div class="banner banner--error" role="alert" style="margin-top: 12px;">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div class="banner__body">{{ errorMsg() }}</div>
                </div>
              }
            </div>

            @if (isAdmin() && registrants(); as rs) {
              <div class="registrants-card card">
                <div class="row--between" style="margin-bottom: 12px;">
                  <h3 class="card-title">{{ i18n.t('detail.registrants.title') }}</h3>
                  <span class="meta">{{ rs.length }} / {{ a.capacity }}</span>
                </div>
                <div class="registrants">
                  @for (r of rs; track r.userId) {
                    <div class="row">
                      <span class="avatar avatar--sm" [class]="avatarColor(r.email)">{{ initials(r.email) }}</span>
                      <span class="stack-2" style="flex:1; min-width:0;">
                        <span class="meta-name">{{ r.email }}</span>
                        <span class="meta-team muted">{{ i18n.t('detail.registrants.registeredAt', { date: (r.registeredAt | date:'MMM d, HH:mm':'':i18n.locale()) || '' }) }}</span>
                      </span>
                    </div>
                  } @empty {
                    <p class="muted">{{ i18n.t('detail.registrants.none') }}</p>
                  }
                </div>
                <p class="admin-only-note">{{ i18n.t('detail.registrants.note') }}</p>
              </div>
            }
          </aside>
        </article>
      </div>
    } @else {
      <div class="container" style="padding: 56px 0;">
        <p class="muted">{{ i18n.t('detail.notFound') }}</p>
      </div>
    }
  `,
  styles: [`
    .breadcrumb__crumbs {
      display: flex; align-items: center; gap: 8px;
      min-width: 0; overflow: hidden;
    }
    .breadcrumb__crumbs .current {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 60ch;
    }
    .breadcrumb__sep { color: var(--muted-2); }

    .detail {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 48px;
      padding: 24px 0 56px;
      align-items: start;
    }
    @media (max-width: 980px) { .detail { grid-template-columns: 1fr; } }

    .detail__head { margin-bottom: 24px; display: flex; flex-direction: column; gap: 14px; }
    .detail__head .sdg-tag { align-self: flex-start; }
    .detail__title {
      font-size: 2.25rem;
      line-height: 1.15;
      letter-spacing: -0.02em;
      font-weight: 700;
      color: var(--ink);
      margin: 0;
      max-width: 22ch;
    }
    .detail__lede {
      font-size: 1.0625rem;
      color: var(--muted);
      max-width: 60ch;
      margin: 0;
      line-height: 1.55;
    }
    .detail__meta {
      display: flex; flex-direction: column; gap: 8px;
      color: var(--muted); font-size: 0.9375rem;
    }
    .detail__meta .row { gap: 8px; }

    .detail__cover {
      aspect-ratio: 16 / 7;
      width: 100%;
      border-radius: var(--r-card);
      margin: 8px 0 32px;
      position: relative;
      overflow: hidden;
    }
    .detail__cover--image {
      object-fit: cover;
      display: block;
      background: var(--surface-2);
    }

    .section-title { margin: 32px 0 12px; }
    .section-title:first-child { margin-top: 0; }
    .prose p {
      margin: 0 0 14px;
      font-size: 1rem;
      line-height: 1.65;
      color: var(--ink);
      max-width: 64ch;
    }

    .detail__map {
      margin-top: 16px;
      border-radius: var(--r-card);
      overflow: hidden;
    }

    .aside {
      position: sticky;
      top: calc(var(--header-h) + 24px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .registration { padding: 20px 22px 22px; }
    .registration__head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px;
    }
    .registration__seats-block { margin-bottom: 20px; }
    .registration__count strong {
      font-size: 1.5rem; font-weight: 700; color: var(--ink); letter-spacing: -0.01em;
    }
    .registration__count .muted {
      font-size: 0.9375rem; font-weight: 400; margin-left: 6px;
    }
    .registration__left {
      font-size: 0.8125rem; color: var(--muted); margin-top: 4px;
    }
    .registration__meta {
      font-size: 0.8125rem;
      color: var(--muted);
      text-align: center;
      margin-top: 12px;
      line-height: 1.45;
    }

    .registrants-card { padding: 20px 22px; }
    .registrants {
      display: flex; flex-direction: column; gap: 10px;
      max-height: 320px; overflow-y: auto;
    }
    .registrants .row { gap: 10px; }
    .meta-name {
      color: var(--ink); font-size: 0.9375rem; font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .meta-team { font-size: 0.8125rem; }
    .admin-only-note {
      font-size: 0.6875rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted-2);
      margin: 12px 0 0;
    }
  `]
})
export class ActionDetailComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private actionsApi = inject(ActionsService);
  private auth = inject(AuthService);
  private events = inject(EventsService);

  private offEvents: Array<() => void> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private actionId = 0;

  readonly loading = signal(true);
  readonly action = signal<CharityAction | null>(null);
  readonly registrants = signal<Registrant[] | null>(null);
  readonly qrOpen = signal(false);
  readonly busy = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  ngOnInit(): void {
    this.actionId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAction(this.actionId);

    const relevant = (ev: { actionId: number | null }) => ev.actionId === this.actionId;

    this.offEvents.push(
      this.events.on('action.', (ev) => { if (relevant(ev)) this.scheduleRefresh(); }),
      this.events.on('registration.', (ev) => { if (relevant(ev)) this.scheduleRefresh(); }),
    );
  }

  ngOnDestroy(): void {
    this.offEvents.forEach((off) => off());
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.loadAction(this.actionId);
    }, 200);
  }

  private loadAction(id: number): void {
    this.loading.set(true);
    this.actionsApi.get(id).subscribe({
      next: (a) => {
        this.action.set(a);
        this.loading.set(false);
        if (this.isAdmin()) this.loadRegistrants(id);
      },
      error: () => { this.action.set(null); this.loading.set(false); }
    });
  }

  private loadRegistrants(id: number): void {
    this.actionsApi.listRegistrants(id).subscribe({
      next: (rs) => this.registrants.set(rs)
    });
  }

  register(id: number): void {
    this.busy.set(true);
    this.errorMsg.set(null);
    this.actionsApi.register(id).subscribe({
      next: () => { this.busy.set(false); this.loadAction(id); },
      error: (err) => this.handleErr(err)
    });
  }

  unregister(id: number): void {
    this.busy.set(true);
    this.errorMsg.set(null);
    this.actionsApi.unregister(id).subscribe({
      next: () => { this.busy.set(false); this.loadAction(id); },
      error: (err) => this.handleErr(err)
    });
  }

  private handleErr(err: any): void {
    this.busy.set(false);
    const code = err?.error?.code;
    const map: Record<string, string> = {
      action_full: this.i18n.t('detail.err.full'),
      action_closed: this.i18n.t('detail.err.closed'),
      already_registered: this.i18n.t('detail.err.already'),
      already_registered_this_year: this.i18n.t('detail.err.alreadyYear'),
      not_registered: this.i18n.t('detail.err.notReg'),
    };
    this.errorMsg.set(map[code] ?? err?.error?.message ?? this.i18n.t('detail.err.generic'));
  }

  fillPercent(a: CharityAction): number {
    if (!a.capacity) return 0;
    return Math.min(100, Math.round((a.registeredCount / a.capacity) * 100));
  }

  isUrgent(a: CharityAction): boolean {
    return this.fillPercent(a) >= 75 && !a.isClosed;
  }

  initials(email: string): string {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }

  avatarColor(email: string): string {
    const hash = Array.from(email).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    const i = Math.abs(hash) % 6 + 1;
    return `avatar--c${i}`;
  }

  firstSentence(text: string): string {
    const m = text.match(/^[^.!?]*[.!?]/);
    return m ? m[0] : text.slice(0, 160);
  }

  paragraphs(text: string): string[] {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }
}
