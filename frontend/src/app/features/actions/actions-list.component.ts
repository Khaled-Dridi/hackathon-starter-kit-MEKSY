import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ActionsService, CharityAction } from '../../core/actions.service';
import { StatsService } from '../../core/stats.service';

type Filter = 'all' | 'open' | 'month';

@Component({
  selector: 'app-actions-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
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
      </div>

      @if (loading()) {
        <p class="empty-state">Loading actions…</p>
      } @else if (filtered().length === 0) {
        <p class="empty-state">No actions match this filter yet.</p>
      } @else {
        <div class="actions-grid">
          @for (a of filtered(); track a.id) {
            <a class="card action-card" [routerLink]="['/actions', a.id]">
              <span class="thumb" [class]="thumbClass(a.id)" aria-hidden="true"></span>
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
      gap: 12px;
      padding: 20px 0 24px;
      flex-wrap: wrap;
    }
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
export class ActionsListComponent implements OnInit {
  private actionsApi = inject(ActionsService);
  private statsApi = inject(StatsService);

  readonly loading = signal(true);
  readonly actions = signal<CharityAction[]>([]);
  readonly engagement = signal<{ distinctParticipants: number; since: string } | null>(null);
  readonly filter = signal<Filter>('all');

  readonly openCount = computed(() =>
    this.actions().filter(a => !a.isClosed && a.seatsRemaining > 0).length);

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
    this.actionsApi.list().subscribe({
      next: (data) => { this.actions.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.statsApi.engagement().subscribe({
      next: (s) => this.engagement.set(s)
    });
  }

  setFilter(f: Filter): void {
    this.filter.set(f);
  }

  thumbClass(id: number): string {
    const variants = ['thumb--a','thumb--b','thumb--c','thumb--d','thumb--e','thumb--f'];
    return variants[id % variants.length];
  }
}
