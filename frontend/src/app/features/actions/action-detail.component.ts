import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ActionsService, CharityAction, Registrant } from '../../core/actions.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-action-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @if (loading()) {
      <div class="container" style="padding: 56px 0;"><p class="muted">Loading…</p></div>
    } @else if (action(); as a) {
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a routerLink="/actions">Actions</a>
          <span class="breadcrumb__sep">/</span>
          <span>{{ a.title }}</span>
        </nav>

        <article class="detail">
          <div>
            <header class="detail__head">
              @if (a.oddTag) {
                <div class="detail__chips">
                  <span class="chip"><span class="chip__dot" style="background:#4C9F38"></span>{{ a.oddTag }}</span>
                </div>
              }
              <h1>{{ a.title }}</h1>
              @if (a.description) {
                <p class="detail__lede">{{ firstSentence(a.description) }}</p>
              }
            </header>

            <div class="detail__cover" role="img" [attr.aria-label]="'Visual for ' + a.title"></div>

            <section class="prose">
              @if (a.description) {
                <h2>About this action</h2>
                @for (p of paragraphs(a.description); track $index) {
                  <p>{{ p }}</p>
                }
              }

              <h2>Where & when</h2>
              <dl class="dl">
                <div>
                  <dt>Date</dt>
                  <dd>{{ a.actionDate | date:'EEEE, MMMM d, y' }}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{{ a.actionDate | date:'HH:mm' }}</dd>
                </div>
                @if (a.location) {
                  <div>
                    <dt>Location</dt>
                    <dd>{{ a.location }}</dd>
                  </div>
                }
                @if (a.oddTag) {
                  <div>
                    <dt>SDG</dt>
                    <dd>{{ a.oddTag }}</dd>
                  </div>
                }
              </dl>

              @if (a.impactSummary) {
                <h2>Reported impact</h2>
                <p>{{ a.impactSummary }}</p>
              }
            </section>
          </div>

          <aside class="aside" aria-label="Registration">
            <div class="registration">
              <div class="registration__head">
                <span class="label">Registration</span>
                @if (a.isClosed) {
                  <span class="pill pill--full">Closed</span>
                } @else if (a.seatsRemaining === 0) {
                  <span class="pill pill--full">Full</span>
                } @else if (a.seatsRemaining <= 3) {
                  <span class="pill pill--soon">{{ a.seatsRemaining }} seats left</span>
                } @else {
                  <span class="pill pill--open pill--dot">Open</span>
                }
              </div>
              <div class="registration__price">
                {{ a.registeredCount }}
                <span class="muted" style="font-weight:400; font-size:16px;">/ {{ a.capacity }} registered</span>
              </div>
              <div class="registration__progress">
                <span [style.width.%]="fillPercent(a)"></span>
              </div>
              <div class="registration__seats">
                <span>{{ a.actionDate | date:'MMM d' }}</span>
                <span>{{ fillPercent(a) }}%</span>
              </div>

              @if (a.currentUserRegistered) {
                <button class="btn btn--secondary btn--lg btn--block" type="button"
                        [disabled]="busy()" (click)="unregister(a.id)">
                  @if (busy()) { Working… } @else { Cancel my registration }
                </button>
                <p class="registration__meta" style="color: #1B7F4F;">
                  <i class="pi pi-check-circle"></i> You're registered for this action.
                </p>
              } @else {
                <button class="btn btn--primary btn--lg btn--block" type="button"
                        [disabled]="busy() || a.isClosed || a.seatsRemaining === 0"
                        (click)="register(a.id)">
                  @if (busy()) { Working… } @else { Register for this action }
                </button>
                <p class="registration__meta">
                  You can cancel any time before the action's date.
                </p>
              }

              @if (errorMsg()) {
                <p class="registration__error" role="alert">{{ errorMsg() }}</p>
              }
            </div>

            @if (isAdmin() && registrants(); as rs) {
              <div class="registrants-card">
                <div class="row--between" style="margin-bottom: 10px;">
                  <h3 style="margin:0;">Registrants</h3>
                  <span class="meta">{{ rs.length }} / {{ a.capacity }}</span>
                </div>
                <div class="registrants">
                  @for (r of rs; track r.userId) {
                    <div class="row--between">
                      <span class="row">
                        <span class="user-chip__avatar" style="background:var(--navy)">{{ initials(r.email) }}</span>
                        <span class="stack-2">
                          <span class="meta-name">{{ r.email }}</span>
                          <span class="meta-team">Registered {{ r.registeredAt | date:'MMM d, HH:mm' }}</span>
                        </span>
                      </span>
                    </div>
                  } @empty {
                    <p class="muted">No registrants yet.</p>
                  }
                </div>
                <p class="admin-only-note">Admin view · employees see only their own status</p>
              </div>
            }
          </aside>
        </article>
      </div>
    } @else {
      <div class="container" style="padding: 56px 0;">
        <p class="muted">Action not found.</p>
      </div>
    }
  `,
  styles: [`
    .breadcrumb { padding: 16px 0 0; font-size: 13px; color: var(--text-muted); }
    .breadcrumb a { color: var(--text-muted); text-decoration: none; }
    .breadcrumb a:hover { color: var(--navy); }
    .breadcrumb__sep { margin: 0 8px; color: var(--text-subtle); }

    .detail {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 48px;
      padding: 32px 0 56px;
      align-items: start;
    }
    @media (max-width: 980px) { .detail { grid-template-columns: 1fr; } }

    .detail__head { margin-bottom: 28px; }
    .detail__chips { display: flex; gap: 8px; margin-bottom: 14px; }
    .detail h1 {
      font-size: 36px;
      line-height: 1.15;
      letter-spacing: -0.02em;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 14px;
      max-width: 22ch;
    }
    .detail__lede {
      font-size: 16px;
      color: var(--text-muted);
      max-width: 56ch;
      margin: 0;
    }
    .detail__cover {
      aspect-ratio: 16 / 7;
      width: 100%;
      background:
        linear-gradient(135deg, rgba(32,44,80,0.15) 0%, rgba(32,44,80,0.05) 100%),
        linear-gradient(135deg, #DDE2F0 0%, #C5CCDF 100%);
      border-radius: var(--radius-lg);
      margin: 24px 0 32px;
    }
    .detail h2 {
      font-size: 20px;
      letter-spacing: -0.01em;
      font-weight: 600;
      color: var(--navy);
      margin: 32px 0 12px;
    }
    .prose p {
      margin: 0 0 14px;
      font-size: 15px;
      line-height: 1.65;
      color: var(--text);
      max-width: 64ch;
    }

    .aside {
      position: sticky;
      top: calc(var(--header-h) + 24px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .registration {
      padding: 20px 22px 22px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--white);
    }
    .registration__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .registration__price {
      font-size: 22px;
      font-weight: 600;
      color: var(--navy);
      letter-spacing: -0.01em;
    }
    .registration__progress {
      height: 4px;
      background: var(--surface-2);
      border-radius: 2px;
      overflow: hidden;
      margin: 6px 0 8px;
    }
    .registration__progress > span {
      display: block;
      height: 100%;
      background: var(--navy);
    }
    .registration__seats {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .registration__meta {
      font-size: 13px;
      color: var(--text-muted);
      text-align: center;
      margin-top: 12px;
    }
    .registration__error {
      margin-top: 12px;
      padding: 10px 12px;
      background: #FBEDED;
      color: #8B1F1F;
      border-radius: var(--radius);
      font-size: 13px;
    }

    .registrants-card {
      padding: 20px 22px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .registrants-card h3 {
      font-size: 13px;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .registrants { display: flex; flex-direction: column; gap: 4px; font-size: 13.5px; }
    .registrants .row--between { padding: 6px 0; }
    .meta-name { color: var(--text); }
    .meta-team { color: var(--text-muted); font-size: 12.5px; }
    .admin-only-note {
      font-size: 11.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-subtle);
      margin: 8px 0 0;
    }
  `]
})
export class ActionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private actionsApi = inject(ActionsService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly action = signal<CharityAction | null>(null);
  readonly registrants = signal<Registrant[] | null>(null);
  readonly busy = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAction(id);
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
      action_full: 'This action is already full.',
      action_closed: 'Registrations are closed for this action.',
      already_registered: 'You are already registered for this action.',
      already_registered_this_year:
        'You already have a registration for this year. Cancel it first if you want to switch.',
      not_registered: 'You are not registered for this action.'
    };
    this.errorMsg.set(map[code] ?? err?.error?.message ?? 'Something went wrong.');
  }

  fillPercent(a: CharityAction): number {
    if (!a.capacity) return 0;
    return Math.min(100, Math.round((a.registeredCount / a.capacity) * 100));
  }

  initials(email: string): string {
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }

  firstSentence(text: string): string {
    const m = text.match(/^[^.!?]*[.!?]/);
    return m ? m[0] : text.slice(0, 160);
  }

  paragraphs(text: string): string[] {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }
}
