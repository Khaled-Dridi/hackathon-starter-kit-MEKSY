import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ActionsService, CharityAction } from '../../core/actions.service';
import { ProposalsService } from '../../core/proposals.service';
import { EventsService } from '../../core/events.service';
import { I18nService } from '../../core/i18n.service';
import { QrModalComponent } from '../../shared/qr-modal.component';

@Component({
  selector: 'app-admin-actions',
  standalone: true,
  imports: [DatePipe, RouterLink, RouterLinkActive, QrModalComponent],
  template: `
    <div class="subnav">
      <div class="container">
        <a class="tab" routerLink="/admin/actions" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: false }">{{ i18n.t('admin.subnav.actions') }}</a>
        <a class="tab" routerLink="/admin/proposals" routerLinkActive="is-active">
          {{ i18n.t('admin.subnav.proposals') }}
          @if (pendingProposals() > 0) {
            <span class="badge">{{ pendingProposals() }}</span>
          }
        </a>
      </div>
    </div>

    <div class="container" style="padding: 32px 0 64px;">
      <div class="admin-head">
        <div>
          <div class="page-title-row"><h1 class="page-title has-dot">{{ i18n.t('admin.actions.title') }}</h1></div>
          <p class="page-subtitle">{{ i18n.t('admin.actions.subtitle') }}</p>
        </div>
        <div class="row" style="gap: 10px;">
          <a class="btn btn--yellow" routerLink="/admin/actions/new">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {{ i18n.t('admin.actions.new') }}
          </a>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="card kpi">
          <div class="kpi__label">{{ i18n.t('admin.kpi.open') }}</div>
          <div class="kpi__num">{{ openCount() }}</div>
          <div class="muted" style="font-size: 0.8125rem;">{{ i18n.t('admin.kpi.closed', { n: closedCount() }) }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi__label">{{ i18n.t('admin.kpi.totalReg') }}</div>
          <div class="kpi__num">{{ totalReg() }}</div>
          <div class="muted" style="font-size: 0.8125rem;">{{ i18n.t('admin.kpi.across', { n: actions().length }) }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi__label">{{ i18n.t('admin.kpi.fillRate') }}</div>
          <div class="kpi__num">{{ fillRate() }}%</div>
          <div class="muted" style="font-size: 0.8125rem;">{{ i18n.t('admin.kpi.fillRate.sub') }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi__label">{{ i18n.t('admin.kpi.pending') }}</div>
          <div class="kpi__num">{{ pendingProposals() }}</div>
          <div class="muted" style="font-size: 0.8125rem;">{{ i18n.t('admin.kpi.pending.sub') }}</div>
        </div>
      </div>

      @if (loading()) {
        <div class="table-wrap" aria-hidden="true" style="padding: 12px 20px;">
          @for (i of [1,2,3,4,5]; track i) {
            <span class="skeleton skeleton--row"></span>
          }
        </div>
      } @else if (actions().length === 0) {
        <div class="empty card" style="padding: 64px 24px;">
          <svg class="illo" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="120" cy="200" rx="80" ry="10" fill="rgba(32,44,80,0.08)"/>
            <circle cx="90" cy="120" r="38" fill="#3A4A7E"/>
            <circle cx="150" cy="120" r="38" fill="#4A5C92"/>
            <path d="M120 130 C 110 122, 110 138, 120 150 C 130 138, 130 122, 120 130 Z" fill="#F4E443"/>
            <circle cx="90" cy="92" r="14" fill="#2C3A66"/>
            <circle cx="150" cy="92" r="14" fill="#3A4A7E"/>
          </svg>
          <h3>{{ i18n.t('admin.empty.title') }}</h3>
          <p>{{ i18n.t('admin.empty.body') }}</p>
          <a class="btn btn--yellow" routerLink="/admin/actions/new" style="margin-top: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {{ i18n.t('admin.actions.new') }}
          </a>
        </div>
      } @else {
        <div class="table-wrap">
          <table class="table" [attr.aria-label]="i18n.t('admin.table.aria')">
            <thead>
              <tr>
                <th>{{ i18n.t('admin.table.action') }}</th>
                <th>{{ i18n.t('admin.table.date') }}</th>
                <th>{{ i18n.t('admin.table.location') }}</th>
                <th>{{ i18n.t('admin.table.status') }}</th>
                <th>{{ i18n.t('admin.table.fill') }}</th>
                <th>&nbsp;</th>
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
                    <span class="cell-title">{{ a.actionDate | date:'EEE, MMM d':'':i18n.locale() }}</span><br>
                    <span class="cell-sub">{{ a.actionDate | date:'HH:mm':'':i18n.locale() }}</span>
                  </td>
                  <td>{{ a.location || '—' }}</td>
                  <td>
                    @if (a.isClosed) {
                      <span class="pill pill--closed"><span class="dot"></span>{{ i18n.t('admin.pill.closed') }}</span>
                    } @else if (a.seatsRemaining === 0) {
                      <span class="pill pill--full"><span class="dot"></span>{{ i18n.t('admin.pill.full') }}</span>
                    } @else if (a.seatsRemaining <= 3) {
                      <span class="pill pill--almost">{{ i18n.t('admin.pill.left', { n: a.seatsRemaining }) }}</span>
                    } @else {
                      <span class="pill pill--open"><span class="dot"></span>{{ i18n.t('admin.pill.open') }}</span>
                    }
                  </td>
                  <td>
                    <div class="cell-fill">
                      <div class="progress" [class.progress--urgent]="percent(a) >= 75 && !a.isClosed">
                        <div class="progress__bar" [style.width.%]="percent(a)"></div>
                      </div>
                      <span class="cell-sub">{{ a.registeredCount }} / {{ a.capacity }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="btn btn--icon btn--ghost" type="button" [attr.aria-label]="i18n.t('admin.table.shareQr')" [title]="i18n.t('admin.table.shareQr')" (click)="openQr(a)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="18" y1="14" x2="18" y2="18"/><line x1="14" y1="18" x2="21" y2="18"/></svg>
                      </button>
                      <span class="sep"></span>
                      <a class="btn btn--icon btn--ghost" [routerLink]="['/admin/actions', a.id, 'edit']" [attr.aria-label]="i18n.t('admin.table.edit')" [title]="i18n.t('admin.table.edit')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </a>
                      <span class="sep"></span>
                      <button class="btn btn--icon btn--ghost" type="button" [attr.aria-label]="i18n.t('admin.table.duplicate')" [title]="i18n.t('admin.table.duplicate')"
                              [disabled]="busy() === a.id" (click)="duplicate(a.id)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      @if (!a.isClosed) {
                        <span class="sep"></span>
                        <button class="btn btn--icon btn--ghost" type="button" [attr.aria-label]="i18n.t('admin.table.close')" [title]="i18n.t('admin.table.close')"
                                [disabled]="busy() === a.id" (click)="close(a.id)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
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
    :host { display: block; background: var(--bg); min-height: calc(100vh - var(--header-h)); }

    .admin-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 24px;
      flex-wrap: wrap;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding-bottom: 24px;
    }
    @media (max-width: 880px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

    .cell-title { font-weight: 600; color: var(--ink); display: block; }
    .cell-sub { color: var(--muted); font-size: 0.8125rem; }

    .cell-fill {
      display: flex; align-items: center; gap: 12px;
    }
    .cell-fill .progress { width: 110px; flex-shrink: 0; }
  `]
})
export class AdminActionsComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private actionsApi = inject(ActionsService);
  private proposalsApi = inject(ProposalsService);
  private events = inject(EventsService);

  private offEvents: Array<() => void> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(true);
  readonly actions = signal<CharityAction[]>([]);
  readonly busy = signal<number | null>(null);
  readonly pendingProposals = signal(0);
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
