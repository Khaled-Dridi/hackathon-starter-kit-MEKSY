import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ActionsService, CharityAction } from '../../core/actions.service';
import { ProposalsService } from '../../core/proposals.service';
import { EventsService } from '../../core/events.service';
import { QrModalComponent } from '../../shared/qr-modal.component';

@Component({
  selector: 'app-admin-actions',
  standalone: true,
  imports: [DatePipe, RouterLink, QrModalComponent],
  template: `
    <div class="container" style="padding: 32px 0 64px;">
      <div class="admin-head">
        <div>
          <h1>Actions</h1>
          <p class="meta">Manage all volunteer actions for the 2026 edition.</p>
        </div>
        <div class="row">
          <a class="btn btn--secondary" routerLink="/admin/proposals">
            <i class="pi pi-inbox" style="font-size:12px;"></i> Ideas inbox
            @if (pendingProposals() > 0) {
              <span class="badge-count">{{ pendingProposals() }}</span>
            }
          </a>
          <a class="btn btn--primary" routerLink="/admin/actions/new">
            <i class="pi pi-plus" style="font-size:12px;"></i> New action
          </a>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat__label">Open actions</div>
          <div class="stat__value">{{ openCount() }}</div>
          <div class="stat__sub">{{ closedCount() }} closed</div>
        </div>
        <div class="stat">
          <div class="stat__label">Total registrations</div>
          <div class="stat__value">{{ totalReg() }}</div>
          <div class="stat__sub">across {{ actions().length }} actions</div>
        </div>
        <div class="stat">
          <div class="stat__label">Fill rate</div>
          <div class="stat__value">{{ fillRate() }}%</div>
          <div class="stat__sub">avg across all actions</div>
        </div>
        <div class="stat">
          <div class="stat__label">Ideas pending</div>
          <div class="stat__value">{{ pendingProposals() }}</div>
          <div class="stat__sub">submitted this season</div>
        </div>
      </div>

      @if (loading()) {
        <div class="table-wrap" aria-hidden="true" style="padding: 12px 20px;">
          @for (i of [1,2,3,4,5]; track i) {
            <span class="skeleton skeleton--row"></span>
          }
        </div>
      } @else if (actions().length === 0) {
        <div class="table-wrap" style="padding: 48px 24px; text-align: center;">
          <p class="muted">No actions yet. <a routerLink="/admin/actions/new" style="color:var(--navy);">Create the first one.</a></p>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="table" aria-label="Volunteer actions">
            <thead>
              <tr>
                <th>Action</th>
                <th>Date</th>
                <th>Location</th>
                <th>Status</th>
                <th>Fill</th>
                <th style="text-align:right;">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              @for (a of actions(); track a.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/actions', a.id]" style="text-decoration:none;">
                      <span class="cell-title">{{ a.title }}</span>
                      @if (a.oddTag) {
                        <span class="cell-sub">{{ a.oddTag }}</span>
                      }
                    </a>
                  </td>
                  <td>
                    <span class="cell-title">{{ a.actionDate | date:'EEE, MMM d' }}</span><br>
                    <span class="cell-sub">{{ a.actionDate | date:'HH:mm' }}</span>
                  </td>
                  <td>{{ a.location || '—' }}</td>
                  <td>
                    @if (a.isClosed) {
                      <span class="pill pill--full">Closed</span>
                    } @else if (a.seatsRemaining === 0) {
                      <span class="pill pill--full">Full</span>
                    } @else if (a.seatsRemaining <= 3) {
                      <span class="pill pill--soon">{{ a.seatsRemaining }} left</span>
                    } @else {
                      <span class="pill pill--open pill--dot">Open</span>
                    }
                  </td>
                  <td>
                    <span class="fill"><span [style.width.%]="percent(a)"></span></span>
                    <span class="cell-sub">{{ a.registeredCount }} / {{ a.capacity }}</span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="icon-btn" type="button" aria-label="Share with QR"
                              title="Share with QR"
                              (click)="openQr(a)">
                        <i class="pi pi-qrcode"></i>
                      </button>
                      <a class="icon-btn" [routerLink]="['/admin/actions', a.id, 'edit']"
                         aria-label="Edit">
                        <i class="pi pi-pencil"></i>
                      </a>
                      <button class="icon-btn" type="button" aria-label="Duplicate"
                              [disabled]="busy() === a.id"
                              (click)="duplicate(a.id)">
                        <i class="pi pi-copy"></i>
                      </button>
                      @if (!a.isClosed) {
                        <button class="icon-btn" type="button" aria-label="Close"
                                [disabled]="busy() === a.id"
                                (click)="close(a.id)">
                          <i class="pi pi-lock"></i>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (qrAction(); as qa) {
        <app-qr-modal
          [actionId]="qa.id"
          [actionTitle]="qa.title"
          [open]="true"
          (closed)="qrAction.set(null)" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--surface); min-height: calc(100vh - var(--header-h)); }

    .admin-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 24px;
    }
    .admin-head h1 {
      font-size: 28px;
      line-height: 1.2;
      letter-spacing: -0.02em;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 6px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding-bottom: 24px;
    }
    @media (max-width: 880px) { .stats { grid-template-columns: repeat(2, 1fr); } }
    .stat {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 18px 20px;
    }
    .stat__label {
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-subtle);
      font-weight: 500;
      margin-bottom: 8px;
    }
    .stat__value {
      font-size: 28px;
      font-weight: 600;
      color: var(--navy);
      letter-spacing: -0.015em;
      line-height: 1;
    }
    .stat__sub { margin-top: 8px; font-size: 12.5px; color: var(--text-muted); }

    .cell-title { font-weight: 500; color: var(--navy); display: block; }
    .cell-sub { color: var(--text-muted); font-size: 12.5px; }

    .fill {
      width: 90px;
      height: 4px;
      background: var(--surface-2);
      border-radius: 2px;
      overflow: hidden;
      display: inline-block;
      vertical-align: middle;
      margin-right: 10px;
    }
    .fill > span { display: block; height: 100%; background: var(--navy); }

    .row-actions { display: flex; gap: 4px; justify-content: flex-end; }
    .icon-btn {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      border: 0;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }
    .icon-btn:hover { background: var(--surface); color: var(--navy); }
    .icon-btn[disabled] { opacity: 0.5; cursor: not-allowed; }
    .icon-btn i { font-size: 14px; }
    .badge-count {
      background: var(--navy);
      color: var(--white);
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 999px;
      margin-left: 6px;
    }
  `]
})
export class AdminActionsComponent implements OnInit, OnDestroy {
  private actionsApi = inject(ActionsService);
  private proposalsApi = inject(ProposalsService);
  private events = inject(EventsService);

  /** SSE unsubscribe handles. */
  private offEvents: Array<() => void> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(true);
  readonly actions = signal<CharityAction[]>([]);
  readonly busy = signal<number | null>(null);
  readonly pendingProposals = signal(0);
  /** The action whose QR modal is currently open (or null). */
  readonly qrAction = signal<CharityAction | null>(null);

  openQr(a: CharityAction): void { this.qrAction.set(a); }

  readonly openCount = computed(() => this.actions().filter(a => !a.isClosed).length);
  readonly closedCount = computed(() => this.actions().filter(a => a.isClosed).length);
  readonly totalReg = computed(() => this.actions().reduce((s, a) => s + a.registeredCount, 0));
  readonly fillRate = computed(() => {
    const list = this.actions();
    if (!list.length) return 0;
    const ratios = list.map(a => a.capacity ? a.registeredCount / a.capacity : 0);
    return Math.round((ratios.reduce((s, r) => s + r, 0) / ratios.length) * 100);
  });

  ngOnInit(): void {
    this.refresh();
    this.refreshPending();

    // Real-time: refresh table on any action change, refresh proposals badge on any proposal change.
    this.offEvents.push(
      this.events.on('action.', () => this.scheduleRefresh()),
      this.events.on('registration.', () => this.scheduleRefresh()),
      this.events.on('proposal.', () => this.refreshPending()),
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

  private refreshPending(): void {
    this.proposalsApi.listAll('PENDING').subscribe({
      next: (ps) => this.pendingProposals.set(ps.length),
      error: () => this.pendingProposals.set(0)
    });
  }

  refresh(): void {
    this.loading.set(true);
    this.actionsApi.list().subscribe({
      next: (data) => { this.actions.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  percent(a: CharityAction): number {
    if (!a.capacity) return 0;
    return Math.min(100, Math.round((a.registeredCount / a.capacity) * 100));
  }

  duplicate(id: number): void {
    this.busy.set(id);
    this.actionsApi.duplicate(id).subscribe({
      next: () => { this.busy.set(null); this.refresh(); },
      error: () => this.busy.set(null)
    });
  }

  close(id: number): void {
    this.busy.set(id);
    this.actionsApi.close(id).subscribe({
      next: () => { this.busy.set(null); this.refresh(); },
      error: () => this.busy.set(null)
    });
  }
}
