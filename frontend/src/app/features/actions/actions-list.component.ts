import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ActionsService, CharityAction } from '../../core/actions.service';
import { StatsService } from '../../core/stats.service';
import { EventsService } from '../../core/events.service';
import { I18nService } from '../../core/i18n.service';
import { ActionMapComponent } from '../../shared/action-map.component';

type Filter = 'all' | 'open' | 'month';
type ViewMode = 'grid' | 'map';
const VIEW_MODE_KEY = 'actions.viewMode';

@Component({
  selector: 'app-actions-list',
  standalone: true,
  imports: [DatePipe, RouterLink, ActionMapComponent],
  template: `
    <!-- Hero band -->
    <section class="hero-band">
      <div class="container">
        <div>
          <div class="page-title-row">
            <h1 class="page-title has-dot">{{ i18n.t('actions.title') }}</h1>
          </div>
          <p class="page-subtitle">{{ i18n.t('actions.subtitle') }}</p>
        </div>
        @if (engagement(); as e) {
          <span class="pill--count" [innerHTML]="i18n.t('actions.engagement', { count: e.distinctParticipants, year: seasonYear() })"></span>
        }
      </div>
    </section>

    <section class="container" style="padding-top: 24px;">
      <!-- Filter row -->
      <div class="filter-row">
        <div class="filter-row__left">
          <div class="chip-group" role="tablist" [attr.aria-label]="i18n.t('actions.filter.aria')">
            <button class="chip" type="button" role="tab"
                    [class.is-active]="filter() === 'all'"
                    [attr.aria-selected]="filter() === 'all'"
                    (click)="setFilter('all')">{{ i18n.t('actions.filter.all', { count: actions().length }) }}</button>
            <button class="chip" type="button" role="tab"
                    [class.is-active]="filter() === 'open'"
                    [attr.aria-selected]="filter() === 'open'"
                    (click)="setFilter('open')">{{ i18n.t('actions.filter.open', { count: openCount() }) }}</button>
            <button class="chip" type="button" role="tab"
                    [class.is-active]="filter() === 'month'"
                    [attr.aria-selected]="filter() === 'month'"
                    (click)="setFilter('month')">{{ i18n.t('actions.filter.month') }}</button>
          </div>
        </div>

        <div class="seg" role="tablist" [attr.aria-label]="i18n.t('actions.view.aria')">
          <button type="button" role="tab"
                  [class.is-active]="view() === 'grid'"
                  [attr.aria-selected]="view() === 'grid'"
                  (click)="setView('grid')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            {{ i18n.t('actions.view.grid') }}
          </button>
          <button type="button" role="tab"
                  [class.is-active]="view() === 'map'"
                  [attr.aria-selected]="view() === 'map'"
                  (click)="setView('map')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21"/><line x1="8" y1="3" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="21"/></svg>
            {{ i18n.t('actions.view.map') }}
            @if (mapPinCount() > 0) {
              <span class="seg__count">{{ mapPinCount() }}</span>
            }
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="actions-grid" aria-hidden="true">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="action-card card--flat">
              <span class="skeleton" style="height:140px; border-radius: 0;"></span>
              <div class="action-card__body">
                <span class="skeleton skeleton--title"></span>
                <span class="skeleton skeleton--line"></span>
                <span class="skeleton skeleton--line is-short"></span>
                <div class="action-card__footer">
                  <span class="skeleton skeleton--pill"></span>
                  <span class="skeleton" style="width:80px; height:12px;"></span>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (view() === 'map') {
        @if (mapPinCount() === 0) {
          <div class="empty">
            <svg class="illo" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
              <circle cx="120" cy="180" rx="60" ry="10" fill="rgba(32,44,80,0.06)"/>
              <path d="M120 60 C 90 60 70 80 70 110 C 70 140 120 180 120 180 C 120 180 170 140 170 110 C 170 80 150 60 120 60 Z" fill="#2C3A66"/>
              <circle cx="120" cy="105" r="14" fill="#F4E443"/>
            </svg>
            <h3>{{ i18n.t('actions.empty.map.title') }}</h3>
            <p>{{ i18n.t('actions.empty.map.body') }}</p>
          </div>
        } @else {
          <app-action-map [actions]="filtered()" [height]="560" />
          @if (mapPinCount() < filtered().length) {
            <p class="map-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              {{ i18n.t('actions.map.hint', { shown: mapPinCount(), total: filtered().length }) }}
            </p>
          }
        }
      } @else if (filtered().length === 0) {
        <div class="empty">
          <svg class="illo" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="figBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3A4A7E"/><stop offset="100%" stop-color="#202C50"/>
              </linearGradient>
            </defs>
            <ellipse cx="120" cy="200" rx="80" ry="10" fill="rgba(32,44,80,0.08)"/>
            <circle cx="90" cy="120" r="38" fill="url(#figBase)"/>
            <circle cx="150" cy="120" r="38" fill="#4A5C92"/>
            <path d="M120 130 C 110 122, 110 138, 120 150 C 130 138, 130 122, 120 130 Z" fill="#F4E443"/>
            <circle cx="90" cy="92" r="14" fill="#2C3A66"/>
            <circle cx="150" cy="92" r="14" fill="#3A4A7E"/>
          </svg>
          <h3>{{ i18n.t('actions.empty.filter.title') }}</h3>
          <p>{{ i18n.t('actions.empty.filter.body') }}</p>
        </div>
      } @else {
        <div class="actions-grid">
          @for (a of filtered(); track a.id) {
            <a class="action-card" [routerLink]="['/actions', a.id]">
              <div class="action-card__cover" [class]="!a.imageUrl ? coverClass(a.id) : ''">
                @if (a.imageUrl) {
                  <img [src]="a.imageUrl" [alt]="" loading="lazy" />
                } @else {
                  <span class="cover-tile"></span>
                  <span class="cover-decor"></span>
                }
                @if (a.isClosed) {
                  <span class="pill pill--closed"><span class="dot"></span>{{ i18n.t('actions.card.closed') }}</span>
                } @else if (isPast(a)) {
                  <span class="pill pill--closed"><span class="dot"></span>{{ i18n.t('actions.card.past') }}</span>
                } @else if (a.seatsRemaining === 0) {
                  <span class="pill pill--full"><span class="dot"></span>{{ i18n.t('actions.card.full') }}</span>
                } @else if (a.seatsRemaining <= 3) {
                  <span class="pill pill--almost">{{ i18n.t('actions.card.seatsLeft', { n: a.seatsRemaining }) }}</span>
                } @else {
                  <span class="pill pill--open"><span class="dot"></span>{{ i18n.t('actions.card.open') }}</span>
                }
                @if (a.currentUserRegistered) {
                  <span class="pill pill--reg">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {{ i18n.t('actions.card.registered') }}
                  </span>
                }
              </div>
              <div class="action-card__body">
                <h3 class="action-card__title">{{ a.title }}</h3>
                <div class="action-card__meta">
                  <div class="row">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>{{ a.actionDate | date:'EEE d MMM':'':i18n.locale() }} · {{ a.actionDate | date:'HH:mm':'':i18n.locale() }}</span>
                  </div>
                  @if (a.location) {
                    <div class="row">
                      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span>{{ a.location }}</span>
                    </div>
                  }
                </div>
                <div class="action-card__seats">
                  <span class="action-card__seats-label">
                    {{ i18n.t('actions.card.seats', { filled: a.registeredCount, capacity: a.capacity }) }}
                    @if (!a.isClosed && a.seatsRemaining > 0) {
                      {{ i18n.t('actions.card.left', { n: a.seatsRemaining }) }}
                    }
                  </span>
                  <div class="progress" [class.progress--urgent]="isUrgent(a)">
                    <div class="progress__bar" [style.width.%]="fillPct(a)"></div>
                  </div>
                </div>
                <div class="action-card__footer">
                  <span class="action-card__sdg muted">{{ a.actionDate | date:'yyyy' }}</span>
                  <span class="action-card__arrow" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </div>
              </div>
            </a>
          }
        </div>
      }
    </section>

    <!-- Footer CTA banner -->
    <section class="propose-banner">
      <div class="container">
        <div>
          <div class="propose-banner__eyebrow">{{ i18n.t('actions.banner.eyebrow') }}</div>
          <div class="propose-banner__title">{{ i18n.t('actions.banner.title.before') }} <span class="accent">{{ i18n.t('actions.banner.title.accent') }}</span>{{ i18n.t('actions.banner.title.after') }}</div>
        </div>
        <a class="btn btn--yellow" routerLink="/propose">
          {{ i18n.t('actions.banner.cta') }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>
    </section>
  `,
  styles: [`
    .filter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 0 24px;
      flex-wrap: wrap;
    }
    .filter-row__left { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; flex: 1; }
    .chip-group { display: flex; gap: 8px; flex-wrap: wrap; }
    .seg__count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; padding: 0 5px;
      background: var(--ink); color: var(--accent);
      font-size: 11px; font-weight: 600;
      border-radius: 999px;
      margin-left: 2px;
    }

    .map-hint {
      margin-top: 14px;
      font-size: 0.8125rem;
      color: var(--muted);
      display: inline-flex; align-items: center; gap: 6px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding-bottom: 24px;
    }
    @media (max-width: 980px) { .actions-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .actions-grid { grid-template-columns: 1fr; } }

    .propose-banner {
      margin-top: 56px;
      background: var(--ink);
      color: #fff;
    }
    .propose-banner .container {
      display: flex; align-items: center; justify-content: space-between; gap: 32px;
      padding-block: 36px;
      flex-wrap: wrap;
    }
    .propose-banner__eyebrow {
      font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em;
      text-transform: uppercase; color: rgba(255,255,255,.55);
      margin-bottom: 8px;
    }
    .propose-banner__title {
      font-size: 1.375rem; font-weight: 600; letter-spacing: -0.01em;
      max-width: 50ch;
    }
    .propose-banner .accent { color: var(--accent); }
  `]
})
export class ActionsListComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private actionsApi = inject(ActionsService);
  private statsApi = inject(StatsService);
  private events = inject(EventsService);

  private offEvents: Array<() => void> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(true);
  readonly actions = signal<CharityAction[]>([]);
  readonly engagement = signal<{ distinctParticipants: number; since: string } | null>(null);
  readonly filter = signal<Filter>('all');
  readonly view = signal<ViewMode>(
    (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) === 'map' ? 'map' : 'grid'
  );

  readonly openCount = computed(() =>
    this.actions().filter(a => !a.isClosed && a.seatsRemaining > 0).length);

  readonly mapPinCount = computed(() =>
    this.filtered().filter(a => a.latitude !== null && a.longitude !== null).length);

  readonly seasonYear = computed(() => {
    const s = this.engagement()?.since;
    return s ? new Date(s).getFullYear() : new Date().getFullYear();
  });

  readonly filtered = computed(() => {
    const f = this.filter();
    const list = this.actions();
    if (f === 'open') return list.filter(a => !a.isClosed && a.seatsRemaining > 0);
    if (f === 'month') {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      return list.filter(a => {
        const d = new Date(a.actionDate);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    return list;
  });

  ngOnInit(): void {
    this.refresh();
    this.refreshEngagement();
    this.offEvents.push(
      this.events.on('action.', () => this.scheduleRefresh()),
      this.events.on('registration.', () => this.scheduleRefresh()),
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
      this.refresh();
      this.refreshEngagement();
    }, 200);
  }

  private refresh(): void {
    this.actionsApi.list().subscribe({
      next: (data) => { this.actions.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private refreshEngagement(): void {
    this.statsApi.engagement().subscribe({
      next: (s) => this.engagement.set(s)
    });
  }

  setFilter(f: Filter): void { this.filter.set(f); }

  setView(v: ViewMode): void {
    this.view.set(v);
    localStorage.setItem(VIEW_MODE_KEY, v);
  }

  coverClass(id: number): string {
    const variants = ['cover-gradient--a','cover-gradient--b','cover-gradient--c','cover-gradient--d','cover-gradient--e','cover-gradient--f'];
    return variants[id % variants.length];
  }

  fillPct(a: CharityAction): number {
    if (a.capacity <= 0) return 0;
    return Math.min(100, Math.round((a.registeredCount / a.capacity) * 100));
  }

  isUrgent(a: CharityAction): boolean {
    return this.fillPct(a) >= 75 && !a.isClosed;
  }

  /** True once the action's start time has passed. */
  isPast(a: CharityAction): boolean {
    return !!a.actionDate && new Date(a.actionDate).getTime() < Date.now();
  }
}
