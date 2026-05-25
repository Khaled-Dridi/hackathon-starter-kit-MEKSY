import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ActionsService, CharityAction } from '../../core/actions.service';
import { StatsService } from '../../core/stats.service';
import { EventsService } from '../../core/events.service';
import { ActionMapComponent } from '../../shared/action-map.component';

type Filter = 'all' | 'open' | 'month';
type ViewMode = 'grid' | 'map';
const VIEW_MODE_KEY = 'actions.viewMode';

@Component({
  selector: 'app-actions-list',
  standalone: true,
  imports: [DatePipe, RouterLink, ActionMapComponent],
  template: `
    <section class="section--hero">
      <div class="container">
        @if (engagement(); as e) {
          <div class="hero__counter">
            <span class="n">{{ e.distinctParticipants }}</span>
            <span>colleagues engaged since January 1, {{ seasonYear() }}</span>
          </div>
        }
        <h1 class="page-title">Find an action that fits.</h1>
        <p class="page-subtitle">
          Browse open volunteer actions across France. Pick one and register in a couple of clicks.
        </p>
      </div>
    </section>

    <section class="container">
      <div class="filter-row">
        <div class="filter-tabs" role="tablist" aria-label="Filter actions">
          <button type="button" role="tab" [attr.aria-pressed]="filter() === 'all'"
                  (click)="setFilter('all')">All · {{ actions().length }}</button>
          <button type="button" role="tab" [attr.aria-pressed]="filter() === 'open'"
                  (click)="setFilter('open')">Open · {{ openCount() }}</button>
          <button type="button" role="tab" [attr.aria-pressed]="filter() === 'month'"
                  (click)="setFilter('month')">This month</button>
        </div>

        <div class="view-toggle" role="tablist" aria-label="View mode">
          <button type="button" role="tab" [attr.aria-pressed]="view() === 'grid'"
                  (click)="setView('grid')" title="Grid view">
            <i class="pi pi-th-large"></i> Grid
          </button>
          <button type="button" role="tab" [attr.aria-pressed]="view() === 'map'"
                  (click)="setView('map')" title="Map view">
            <i class="pi pi-map-marker"></i> Map
            @if (mapPinCount() > 0) {
              <span class="view-toggle__count">{{ mapPinCount() }}</span>
            }
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="actions-grid" aria-hidden="true">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card action-card">
              <span class="skeleton skeleton--thumb"></span>
              <div class="action-card__body">
                <span class="skeleton skeleton--line is-short"></span>
                <span class="skeleton skeleton--title"></span>
                <span class="skeleton skeleton--line is-short"></span>
                <div class="action-card__foot">
                  <span class="skeleton skeleton--pill"></span>
                  <span class="skeleton skeleton--line is-short" style="width:80px;"></span>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (view() === 'map') {
        @if (mapPinCount() === 0) {
          <p class="empty-state">
            No actions on the map yet — admins need to set coordinates on
            actions before they show up here.
          </p>
        } @else {
          <app-action-map [actions]="filtered()" [height]="560" />
          @if (mapPinCount() < filtered().length) {
            <p class="map-hint">
              <i class="pi pi-info-circle"></i>
              Showing {{ mapPinCount() }} of {{ filtered().length }} actions —
              the rest have no coordinates set yet.
            </p>
          }
        }
      } @else if (filtered().length === 0) {
        <p class="empty-state">No actions match this filter yet.</p>
      } @else {
        <div class="actions-grid">
          @for (a of filtered(); track a.id) {
            <a class="card action-card" [routerLink]="['/actions', a.id]">
              @if (a.imageUrl) {
                <span class="thumb thumb--image" aria-hidden="true">
                  <img [src]="a.imageUrl" [alt]="" loading="lazy" />
                </span>
              } @else {
                <span class="thumb" [class]="thumbClass(a.id)" aria-hidden="true"></span>
              }
              <div class="action-card__body">
                <div class="action-card__date">
                  <span class="day">{{ a.actionDate | date:'EEE, MMM d' }}</span>
                  <span class="muted"> · {{ a.actionDate | date:'HH:mm' }}</span>
                </div>
                <h3 class="card-title">{{ a.title }}</h3>
                @if (a.location) {
                  <div class="action-card__location">
                    <i class="pi pi-map-marker"></i> {{ a.location }}
                  </div>
                }
                <div class="action-card__foot">
                  @if (a.isClosed) {
                    <span class="pill pill--full">Closed</span>
                  } @else if (a.seatsRemaining === 0) {
                    <span class="pill pill--full">Full</span>
                  } @else if (a.seatsRemaining <= 3) {
                    <span class="pill pill--soon">{{ a.seatsRemaining }} seats left</span>
                  } @else {
                    <span class="pill pill--open pill--dot">Open</span>
                  }
                  <span class="seats">{{ a.registeredCount }} / {{ a.capacity }} registered</span>
                </div>
                @if (a.currentUserRegistered) {
                  <div class="action-card__mine">
                    <i class="pi pi-check-circle"></i> You're registered
                  </div>
                }
              </div>
            </a>
          }
        </div>
      }
    </section>

    <section class="section" style="background: var(--surface); border-top: 1px solid var(--border); margin-top: 56px;">
      <div class="container">
        <div class="row--between" style="align-items: flex-start;">
          <div>
            <h2 class="section-title">Don't see what you're looking for?</h2>
            <p class="section-subtitle" style="max-width: 56ch;">
              Suggest an NGO, an action, or a cause that matters to you.
            </p>
          </div>
          <a class="btn btn--secondary" routerLink="/propose">Propose an idea</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero__counter {
      display: inline-flex;
      align-items: baseline;
      gap: 10px;
      padding: 6px 12px;
      background: var(--surface);
      border-radius: 999px;
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }
    .hero__counter .n {
      font-weight: 600;
      color: var(--navy);
      font-variant-numeric: tabular-nums;
    }

    .filter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 20px 0 24px;
      flex-wrap: wrap;
    }

    .view-toggle {
      display: flex;
      gap: 4px;
      padding: 3px;
      background: var(--surface);
      border-radius: 999px;
    }
    .view-toggle button {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .view-toggle button i { font-size: 12px; }
    .view-toggle button[aria-pressed="true"] {
      background: var(--white);
      color: var(--navy);
      box-shadow: 0 1px 2px rgba(32,44,80,0.08);
    }
    .view-toggle button:hover:not([aria-pressed="true"]) { color: var(--text); }
    .view-toggle__count {
      background: var(--navy);
      color: var(--white);
      font-size: 10.5px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 999px;
      margin-left: 2px;
    }

    .map-hint {
      margin-top: 12px;
      font-size: 12.5px;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .map-hint i { font-size: 12px; }
    .filter-tabs {
      display: flex;
      gap: 4px;
      padding: 3px;
      background: var(--surface);
      border-radius: 999px;
    }
    .filter-tabs button {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 7px 14px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 999px;
    }
    .filter-tabs button[aria-pressed="true"] {
      background: var(--white);
      color: var(--navy);
      box-shadow: 0 1px 2px rgba(32,44,80,0.08);
    }
    .filter-tabs button:hover:not([aria-pressed="true"]) { color: var(--text); }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      padding-bottom: 24px;
    }
    @media (max-width: 980px) { .actions-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .actions-grid { grid-template-columns: 1fr; } }

    .action-card { display: flex; flex-direction: column; }
    .action-card .thumb { aspect-ratio: 16 / 10; }
    /* When the action has an uploaded/external image, the thumb hosts an
       <img> instead of a gradient. The img fills the slot with object-fit. */
    .action-card .thumb--image {
      background: var(--surface-2);
      overflow: hidden;
      position: relative;
    }
    .action-card .thumb--image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .action-card__body {
      padding: 18px 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }
    .action-card__date {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .action-card__date .day {
      color: var(--navy);
      font-weight: 600;
    }
    .action-card__location {
      font-size: 13px;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .action-card__location i { font-size: 12px; }
    .action-card__foot {
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .action-card__mine {
      font-size: 12px;
      color: #1B7F4F;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }
    .seats { font-size: 12.5px; color: var(--text-muted); }

    .empty-state { padding: 48px 0; text-align: center; color: var(--text-muted); }
  `]
})
export class ActionsListComponent implements OnInit, OnDestroy {
  private actionsApi = inject(ActionsService);
  private statsApi = inject(StatsService);
  private events = inject(EventsService);

  /** SSE unsubscribe handles, called in ngOnDestroy. */
  private offEvents: Array<() => void> = [];
  /** Coalesces bursts of events into a single refresh. */
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(true);
  readonly actions = signal<CharityAction[]>([]);
  readonly engagement = signal<{ distinctParticipants: number; since: string } | null>(null);
  readonly filter = signal<Filter>('all');
  /** Persisted in localStorage so the user's choice survives reloads. */
  readonly view = signal<ViewMode>(
    (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) === 'map' ? 'map' : 'grid'
  );

  readonly openCount = computed(() =>
    this.actions().filter(a => !a.isClosed && a.seatsRemaining > 0).length);

  /** How many of the currently filtered actions can actually be plotted (have coords). */
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

    // Real-time: refresh whenever anything that affects the list happens.
    // `registration.*` events change seat counts and the "you're registered"
    // flag; `action.*` covers create/update/close/delete/seats.changed.
    this.offEvents.push(
      this.events.on('action.', () => this.scheduleRefresh()),
      this.events.on('registration.', () => this.scheduleRefresh()),
    );
  }

  ngOnDestroy(): void {
    this.offEvents.forEach((off) => off());
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  /** Debounced refresh — 200 ms is long enough to coalesce bursts and short enough to feel live. */
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

  setFilter(f: Filter): void {
    this.filter.set(f);
  }

  setView(v: ViewMode): void {
    this.view.set(v);
    localStorage.setItem(VIEW_MODE_KEY, v);
  }

  thumbClass(id: number): string {
    const variants = ['thumb--a','thumb--b','thumb--c','thumb--d','thumb--e','thumb--f'];
    return variants[id % variants.length];
  }
}
