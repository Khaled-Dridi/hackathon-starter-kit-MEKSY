import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Proposal, ProposalStatus, ProposalsService } from '../../core/proposals.service';

type Filter = 'all' | ProposalStatus;

@Component({
  selector: 'app-admin-proposals',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="container container--narrow" style="padding: 32px 0 64px;">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a routerLink="/admin/actions">Admin</a>
        <span class="breadcrumb__sep">/</span>
        <span>Ideas inbox</span>
      </nav>

      <div class="admin-head">
        <div>
          <h1>Ideas inbox</h1>
          <p class="meta">Action ideas submitted by colleagues.</p>
        </div>
      </div>

      <nav class="table-tabs" aria-label="Filter proposals">
        <button type="button" [class.active]="filter() === 'all'" (click)="filter.set('all')">
          All <span class="count">{{ proposals().length }}</span>
        </button>
        <button type="button" [class.active]="filter() === 'PENDING'" (click)="filter.set('PENDING')">
          Pending <span class="count">{{ countOf('PENDING') }}</span>
        </button>
        <button type="button" [class.active]="filter() === 'ACCEPTED'" (click)="filter.set('ACCEPTED')">
          Accepted <span class="count">{{ countOf('ACCEPTED') }}</span>
        </button>
        <button type="button" [class.active]="filter() === 'REJECTED'" (click)="filter.set('REJECTED')">
          Rejected <span class="count">{{ countOf('REJECTED') }}</span>
        </button>
      </nav>

      @if (loading()) {
        <p class="muted" style="padding: 24px 0;">Loading…</p>
      } @else if (filtered().length === 0) {
        <div class="table-wrap" style="padding: 48px 24px; text-align: center;">
          <p class="muted">No ideas in this view.</p>
        </div>
      } @else {
        <div class="stack-4" style="margin-top: 8px;">
          @for (p of filtered(); track p.id) {
            <article class="proposal-card">
              <div class="proposal-card__head">
                <div>
                  <h3>{{ p.title }}</h3>
                  <p class="meta">
                    Submitted by <strong>{{ p.authorEmail }}</strong>
                    on {{ p.createdAt | date:'MMM d, y' }}
                  </p>
                </div>
                @switch (p.status) {
                  @case ('PENDING')  { <span class="pill pill--soon">Pending</span> }
                  @case ('ACCEPTED') { <span class="pill pill--open pill--dot">Accepted</span> }
                  @case ('REJECTED') { <span class="pill pill--full">Rejected</span> }
                }
              </div>

              @if (p.description) {
                <p class="proposal-card__desc">{{ p.description }}</p>
              }

              <div class="proposal-card__actions">
                @if (p.status !== 'ACCEPTED') {
                  <button class="btn btn--primary btn--sm" type="button"
                          [disabled]="busy() === p.id"
                          (click)="setStatus(p, 'ACCEPTED')">
                    Accept
                  </button>
                }
                @if (p.status !== 'REJECTED') {
                  <button class="btn btn--danger-ghost btn--sm" type="button"
                          [disabled]="busy() === p.id"
                          (click)="setStatus(p, 'REJECTED')">
                    Reject
                  </button>
                }
                @if (p.status !== 'PENDING') {
                  <button class="btn btn--ghost btn--sm" type="button"
                          [disabled]="busy() === p.id"
                          (click)="setStatus(p, 'PENDING')">
                    Mark as pending
                  </button>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--surface); min-height: calc(100vh - var(--header-h)); }
    .breadcrumb { font-size: 13px; color: var(--text-muted); padding: 0 0 16px; }
    .breadcrumb a { color: var(--text-muted); text-decoration: none; }
    .breadcrumb a:hover { color: var(--navy); }
    .breadcrumb__sep { margin: 0 8px; color: var(--text-subtle); }

    .admin-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
    }
    .admin-head h1 {
      font-size: 28px;
      line-height: 1.2;
      letter-spacing: -0.02em;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 6px;
    }

    .table-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border);
      margin: 8px 0 24px;
    }
    .table-tabs button {
      appearance: none;
      background: transparent;
      border: 0;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      position: relative;
    }
    .table-tabs button.active { color: var(--navy); }
    .table-tabs button.active::after {
      content: '';
      position: absolute;
      left: 16px; right: 16px;
      bottom: -1px;
      height: 2px;
      background: var(--navy);
    }
    .table-tabs button:hover:not(.active) { color: var(--text); }
    .count {
      font-size: 12px;
      color: var(--text-subtle);
      background: var(--surface-2);
      padding: 2px 7px;
      border-radius: 999px;
      margin-left: 6px;
      font-weight: 500;
    }
    .active .count { background: var(--navy); color: var(--white); }

    .proposal-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 22px 22px;
    }
    .proposal-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10px;
    }
    .proposal-card__head h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 4px;
    }
    .proposal-card__desc {
      font-size: 14px;
      color: var(--text);
      line-height: 1.55;
      margin: 0 0 14px;
    }
    .proposal-card__actions { display: flex; gap: 8px; }
  `]
})
export class AdminProposalsComponent implements OnInit {
  private api = inject(ProposalsService);

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
