import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Proposal, ProposalStatus, ProposalsService } from '../../core/proposals.service';
import { EventsService } from '../../core/events.service';
import { I18nService } from '../../core/i18n.service';

type Filter = 'all' | ProposalStatus;

@Component({
  selector: 'app-admin-proposals',
  standalone: true,
  imports: [DatePipe, RouterLink, RouterLinkActive],
  template: `
    <div class="subnav">
      <div class="container">
        <a class="tab" routerLink="/admin/actions" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: false }">{{ i18n.t('admin.subnav.actions') }}</a>
        <a class="tab" routerLink="/admin/proposals" routerLinkActive="is-active">
          {{ i18n.t('admin.subnav.proposals') }}
          @if (countOf('PENDING') > 0) {
            <span class="badge">{{ countOf('PENDING') }}</span>
          }
        </a>
      </div>
    </div>

    <div class="container container--narrow" style="padding: 32px 0 64px;">
      <div class="admin-head">
        <div>
          <div class="page-title-row"><h1 class="page-title has-dot">{{ i18n.t('adminProp.title') }}</h1></div>
          <p class="page-subtitle">{{ i18n.t('adminProp.subtitle') }}</p>
        </div>
      </div>

      <nav class="tabs" [attr.aria-label]="i18n.t('adminProp.tabs.aria')">
        <button class="tab" type="button" [class.is-active]="filter() === 'all'" (click)="filter.set('all')">
          {{ i18n.t('adminProp.tabs.all') }} <span class="badge">{{ proposals().length }}</span>
        </button>
        <button class="tab" type="button" [class.is-active]="filter() === 'PENDING'" (click)="filter.set('PENDING')">
          {{ i18n.t('adminProp.tabs.pending') }} <span class="badge">{{ countOf('PENDING') }}</span>
        </button>
        <button class="tab" type="button" [class.is-active]="filter() === 'ACCEPTED'" (click)="filter.set('ACCEPTED')">
          {{ i18n.t('adminProp.tabs.accepted') }} <span class="badge">{{ countOf('ACCEPTED') }}</span>
        </button>
        <button class="tab" type="button" [class.is-active]="filter() === 'REJECTED'" (click)="filter.set('REJECTED')">
          {{ i18n.t('adminProp.tabs.rejected') }} <span class="badge">{{ countOf('REJECTED') }}</span>
        </button>
      </nav>

      @if (loading()) {
        <div class="stack-4" aria-hidden="true" style="margin-top: 24px;">
          @for (i of [1,2,3]; track i) {
            <span class="skeleton skeleton--card"></span>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="empty card" style="margin-top: 24px; padding: 56px 24px;">
          @if (filter() === 'PENDING') {
            <svg class="illo" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="envBase" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3A4A7E"/>
                  <stop offset="100%" stop-color="#202C50"/>
                </linearGradient>
              </defs>
              <ellipse cx="120" cy="210" rx="80" ry="10" fill="rgba(32,44,80,0.10)"/>
              <g transform="rotate(-10 120 120)">
                <rect x="60" y="80" width="120" height="80" rx="8" fill="url(#envBase)"/>
                <path d="M60 80 L 120 124 L 180 80 Z" fill="#4A5C92"/>
                <rect x="60" y="124" width="120" height="36" rx="0 0 8 8" fill="#2C3A66"/>
              </g>
              <path d="M180 100 C 200 110, 210 130, 195 150 C 210 145, 215 130, 200 110 Z" fill="#F4E443"/>
            </svg>
            <h3>{{ i18n.t('adminProp.empty.pending.title') }}</h3>
            <p>{{ i18n.t('adminProp.empty.pending.body') }}</p>
          } @else {
            <h3>{{ i18n.t('adminProp.empty.other.title') }}</h3>
            <p>{{ i18n.t('adminProp.empty.other.body') }}</p>
          }
        </div>
      } @else {
        <div class="stack-4" style="margin-top: 24px;">
          @for (p of filtered(); track p.id) {
            <article class="proposal-card card" [class.proposal-card--with-image]="p.imageUrl">
              @if (p.imageUrl) {
                <img class="proposal-card__thumb" [src]="p.imageUrl" alt="" loading="lazy" />
              }
              <div class="proposal-card__body">
                <div class="proposal-card__head">
                  <div>
                    <h3 class="card-title">{{ p.title }}</h3>
                    <p class="muted" style="font-size: 0.875rem; margin-top: 4px;">
                      {{ i18n.t('adminProp.card.submittedBy') }} <strong style="color:var(--ink); font-weight:600;">{{ p.authorEmail }}</strong>
                      {{ i18n.t('adminProp.card.on', { date: (p.createdAt | date:'MMM d, y':'':i18n.locale()) || '' }) }}
                    </p>
                  </div>
                  @switch (p.status) {
                    @case ('PENDING')  { <span class="pill pill--pending"><span class="dot"></span>{{ i18n.t('adminProp.pill.pending') }}</span> }
                    @case ('ACCEPTED') { <span class="pill pill--accepted"><span class="dot"></span>{{ i18n.t('adminProp.pill.accepted') }}</span> }
                    @case ('REJECTED') { <span class="pill pill--rejected"><span class="dot"></span>{{ i18n.t('adminProp.pill.rejected') }}</span> }
                  }
                </div>

                @if (p.description) {
                  <p class="proposal-card__desc">{{ p.description }}</p>
                }

                <div class="proposal-card__actions">
                  @if (p.status !== 'REJECTED') {
                    <button class="btn btn--danger-ghost btn--sm" type="button"
                            [disabled]="busy() === p.id"
                            (click)="setStatus(p, 'REJECTED')">
                      {{ i18n.t('adminProp.btn.reject') }}
                    </button>
                  }
                  @if (p.status !== 'PENDING') {
                    <button class="btn btn--secondary btn--sm" type="button"
                            [disabled]="busy() === p.id"
                            (click)="setStatus(p, 'PENDING')">
                      {{ i18n.t('adminProp.btn.pending') }}
                    </button>
                  }
                  @if (p.status !== 'ACCEPTED') {
                    <button class="btn btn--yellow btn--sm" type="button"
                            [disabled]="busy() === p.id"
                            [class.btn--loading]="busy() === p.id"
                            (click)="setStatus(p, 'ACCEPTED')">
                      {{ i18n.t('adminProp.btn.accept') }}
                    </button>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--bg); min-height: calc(100vh - var(--header-h)); }

    .admin-head {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 16px; padding-bottom: 16px;
    }

    .proposal-card { padding: 20px 22px 22px; }
    .proposal-card--with-image {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 20px;
      padding: 16px;
    }
    @media (max-width: 640px) {
      .proposal-card--with-image { grid-template-columns: 1fr; }
    }
    .proposal-card__thumb {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      border-radius: 12px;
      background: var(--surface-2);
      display: block;
    }
    .proposal-card__body { min-width: 0; }
    .proposal-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }
    .proposal-card__desc {
      font-size: 0.9375rem;
      color: var(--ink);
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .proposal-card__actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
  `]
})
export class AdminProposalsComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private api = inject(ProposalsService);
  private events = inject(EventsService);

  private offEvents: Array<() => void> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(true);
  readonly proposals = signal<Proposal[]>([]);
  readonly busy = signal<number | null>(null);
  readonly filter = signal<Filter>('all');

  readonly filtered = computed(() => {
    const f = this.filter();
    const list = this.proposals();
    if (f === 'all') return list;
    return list.filter(p => p.status === f);
  });

  ngOnInit(): void {
    this.refresh();
    this.offEvents.push(
      this.events.on('proposal.', () => this.scheduleRefresh()),
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
    }, 200);
  }

  countOf(status: ProposalStatus): number {
    return this.proposals().filter(p => p.status === status).length;
  }

  refresh(): void {
    this.loading.set(true);
    this.api.listAll().subscribe({
      next: (data) => { this.proposals.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setStatus(p: Proposal, status: ProposalStatus): void {
    this.busy.set(p.id);
    this.api.setStatus(p.id, status).subscribe({
      next: () => { this.busy.set(null); this.refresh(); },
      error: () => this.busy.set(null)
    });
  }
}
