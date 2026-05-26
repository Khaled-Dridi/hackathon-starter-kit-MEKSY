import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Proposal, ProposalsService } from '../../core/proposals.service';
import { EventsService } from '../../core/events.service';
import { AiService } from '../../core/ai.service';
import { I18nService } from '../../core/i18n.service';
import { ImagePickerComponent } from '../../shared/image-picker.component';

@Component({
  selector: 'app-propose',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, ImagePickerComponent],
  template: `
    <section class="hero-band">
      <div class="container">
        <div>
          <div class="page-title-row"><h1 class="page-title has-dot">{{ i18n.t('propose.title') }}</h1></div>
          <p class="page-subtitle">{{ i18n.t('propose.subtitle') }}</p>
        </div>
      </div>
    </section>

    <div class="container" style="padding: 32px 0 64px;">
      <div class="grid-12">
        <div class="col-main">
          <form class="card" (ngSubmit)="submit()" #f="ngForm" style="padding: 24px 26px;">

            @if (success()) {
              <div class="banner banner--success" role="status" style="margin-bottom: 20px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <div class="banner__body">
                  <strong>{{ i18n.t('propose.success.head') }}</strong>
                  {{ i18n.t('propose.success.body') }}
                </div>
              </div>
            }
            @if (error()) {
              <div class="banner banner--error" role="alert" style="margin-bottom: 20px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div class="banner__body">{{ error() }}</div>
              </div>
            }

            <h2 class="card-title" style="margin-bottom: 18px; font-size: 1.125rem;">{{ i18n.t('propose.card.title') }}</h2>

            <div class="field">
              <label class="field__label" for="idea-title">{{ i18n.t('propose.field.title.label') }}</label>
              <input class="input" id="idea-title" name="title" type="text"
                     [placeholder]="i18n.t('propose.field.title.placeholder')"
                     [(ngModel)]="title" required maxlength="200" />
              <p class="field__hint">{{ i18n.t('propose.field.title.hint') }}</p>
            </div>

            <div class="field" style="margin-top: 18px;">
              <label class="field__label" for="idea-desc">{{ i18n.t('propose.field.desc.label') }}</label>
              <div class="textarea-wrap">
                <textarea class="textarea" id="idea-desc" name="description" rows="5"
                          [placeholder]="i18n.t('propose.field.desc.placeholder')"
                          [(ngModel)]="description"></textarea>
                <button type="button" class="btn btn--ghost btn--sm ai-btn"
                        [disabled]="aiBusy() || !title.trim()"
                        [class.btn--loading]="aiBusy()"
                        (click)="generate()">
                  <svg class="sparkle" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/></svg>
                  {{ i18n.t('adminForm.ai.cta') }}
                </button>
              </div>

              @if (aiError()) {
                <div class="banner banner--error" role="alert" style="margin-top: 10px;">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
                  <div class="banner__body">{{ aiError() }}</div>
                </div>
              }

              @if (aiPreview()) {
                <div class="ai-result" aria-live="polite">
                  <div class="ai-result__head">
                    <span>
                      <svg class="sparkle" viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;color:var(--accent);"><path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/></svg>
                      {{ i18n.t('adminForm.ai.head') }}
                    </span>
                    <div class="ai-result__actions">
                      <button type="button" class="btn btn--ghost btn--sm" (click)="dismissAi()">{{ i18n.t('adminForm.ai.dismiss') }}</button>
                      <button type="button" class="btn btn--secondary btn--sm" (click)="acceptAi()">{{ i18n.t('adminForm.ai.use') }}</button>
                    </div>
                  </div>
                  <p>{{ aiPreview() }}</p>
                </div>
              }
            </div>

            <div class="field" style="margin-top: 18px;">
              <label class="field__label">{{ i18n.t('propose.field.cover.label') }}</label>
              <app-image-picker [value]="imageUrl" (valueChange)="imageUrl = $event" />
              <p class="field__hint">{{ i18n.t('propose.field.cover.hint') }}</p>
            </div>

            <div class="form-actions">
              <a class="btn btn--ghost" routerLink="/actions">{{ i18n.t('common.cancel') }}</a>
              <button class="btn btn--yellow" type="submit"
                      [disabled]="submitting() || f.invalid"
                      [class.btn--loading]="submitting()">
                {{ i18n.t('propose.submit') }}
              </button>
            </div>
          </form>

          @if (mine().length > 0) {
            <section class="submitted-strip card">
              <h3 class="card-title" style="margin-bottom: 16px;">{{ i18n.t('propose.mine.title') }}</h3>
              <div class="stack-3">
                @for (p of mine(); track p.id) {
                  <div class="mine-row">
                    <div class="mine-row__left">
                      @if (p.imageUrl) {
                        <img class="mine-row__thumb" [src]="p.imageUrl" alt="" loading="lazy" />
                      } @else {
                        <span class="mine-row__thumb mine-row__thumb--ph cover-gradient--a"></span>
                      }
                      <div class="stack-2" style="min-width: 0;">
                        <span class="mine-row__title">{{ p.title }}</span>
                        <span class="muted" style="font-size: 0.8125rem;">
                          {{ i18n.t('propose.mine.submitted', { date: (p.createdAt | date:'MMM d':'':i18n.locale()) || '' }) }}
                        </span>
                      </div>
                    </div>
                    @switch (p.status) {
                      @case ('PENDING')  { <span class="pill pill--pending"><span class="dot"></span>{{ i18n.t('propose.pill.pending') }}</span> }
                      @case ('ACCEPTED') { <span class="pill pill--accepted"><span class="dot"></span>{{ i18n.t('propose.pill.accepted') }}</span> }
                      @case ('REJECTED') { <span class="pill pill--rejected"><span class="dot"></span>{{ i18n.t('propose.pill.rejected') }}</span> }
                    }
                  </div>
                }
              </div>
            </section>
          }
        </div>

        <aside class="col-rail">
          <div class="card" style="padding: 22px 24px;">
            <p class="t-xs muted" style="margin-bottom: 8px;">{{ i18n.t('propose.how.eyebrow') }}</p>
            <h3 class="card-title" style="margin-bottom: 16px;">{{ i18n.t('propose.how.title') }}</h3>
            <ol class="how-list">
              <li>
                <span class="how-num">1</span>
                <div>
                  <strong>{{ i18n.t('propose.how.step1.title') }}</strong>
                  <p class="muted">{{ i18n.t('propose.how.step1.body') }}</p>
                </div>
              </li>
              <li>
                <span class="how-num">2</span>
                <div>
                  <strong>{{ i18n.t('propose.how.step2.title') }}</strong>
                  <p class="muted">{{ i18n.t('propose.how.step2.body') }}</p>
                </div>
              </li>
              <li>
                <span class="how-num">3</span>
                <div>
                  <strong>{{ i18n.t('propose.how.step3.title') }}</strong>
                  <p class="muted">{{ i18n.t('propose.how.step3.body') }}</p>
                </div>
              </li>
            </ol>
          </div>

          <div class="card" style="padding: 22px 24px; margin-top: 16px; background: var(--surface-2);">
            <p class="muted" style="font-size: 0.875rem; line-height: 1.55; margin: 0;">
              <strong style="color: var(--ink);">{{ i18n.t('propose.tip.head') }}</strong>
              {{ i18n.t('propose.tip.body') }}
            </p>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--bg); }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 28px;
    }

    .submitted-strip { margin-top: 24px; padding: 22px 24px; }
    .mine-row {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .mine-row__left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
    .mine-row__thumb {
      width: 44px; height: 44px;
      object-fit: cover;
      border-radius: 10px;
      background: var(--surface-2);
      flex-shrink: 0;
      display: block;
    }
    .mine-row__thumb--ph { background: var(--ink); }
    .mine-row__title {
      color: var(--ink); font-weight: 500; font-size: 0.9375rem;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .how-list {
      display: flex; flex-direction: column; gap: 18px;
      list-style: none; padding: 0; margin: 0;
    }
    .how-list li { display: flex; gap: 14px; align-items: flex-start; }
    .how-list strong { color: var(--ink); font-size: 0.9375rem; font-weight: 600; }
    .how-list .muted { font-size: 0.875rem; margin: 2px 0 0; line-height: 1.5; }
    .how-num {
      width: 28px; height: 28px; border-radius: 999px;
      background: var(--ink); color: var(--accent);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.8125rem; font-weight: 700;
      flex-shrink: 0;
    }

    /* ─── AI sparkle button (mirrors admin-action-form) ─── */
    .textarea-wrap { position: relative; }
    .ai-btn {
      position: absolute;
      right: 10px; bottom: 10px;
      background: var(--surface);
      border: 1px solid var(--line-2);
    }
    .ai-btn:hover:not(:disabled) { border-color: var(--ink); background: var(--bg); }

    .ai-result {
      margin-top: 12px;
      padding: 14px 16px;
      background: rgba(244, 228, 67, 0.12);
      border: 1px solid rgba(244, 228, 67, 0.5);
      border-radius: 12px;
    }
    .ai-result__head {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px;
      font-size: 0.8125rem; color: var(--ink);
      margin-bottom: 10px; font-weight: 600;
    }
    .ai-result__head > span {
      display: inline-flex; align-items: center; gap: 6px;
    }
    .ai-result__actions { display: flex; gap: 6px; }
    .ai-result p {
      margin: 0; font-size: 0.9375rem; color: var(--ink); line-height: 1.55;
    }
  `]
})
export class ProposeComponent implements OnInit, OnDestroy {
  readonly i18n = inject(I18nService);
  private api = inject(ProposalsService);
  private aiApi = inject(AiService);
  private router = inject(Router);
  private events = inject(EventsService);

  private offEvents: Array<() => void> = [];

  title = '';
  description = '';
  imageUrl: string | null = null;
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);
  readonly mine = signal<Proposal[]>([]);

  // AI assist: identical UX to the admin action form — sparkle button generates
  // a draft description from the title, user accepts (overwrites textarea) or
  // dismisses. The same /ai/actions/describe endpoint backs both surfaces.
  readonly aiBusy = signal(false);
  readonly aiPreview = signal<string | null>(null);
  readonly aiError = signal<string | null>(null);

  generate(): void {
    if (!this.title.trim()) return;
    this.aiBusy.set(true);
    this.aiError.set(null);
    this.aiPreview.set(null);
    this.aiApi.describeAction(this.title.trim()).subscribe({
      next: (res) => { this.aiPreview.set(res.description); this.aiBusy.set(false); },
      error: (err) => {
        this.aiBusy.set(false);
        this.aiError.set(
          err.status === 500
            ? this.i18n.t('adminForm.ai.err.nokey')
            : this.i18n.t('adminForm.ai.err.generic'));
      }
    });
  }

  acceptAi(): void {
    const text = this.aiPreview();
    if (text) this.description = text;
    this.aiPreview.set(null);
  }

  dismissAi(): void {
    this.aiPreview.set(null);
  }

  ngOnInit(): void {
    this.refreshMine();
    this.offEvents.push(
      this.events.on('proposal.status.changed', () => this.refreshMine()),
    );
  }

  ngOnDestroy(): void {
    this.offEvents.forEach((off) => off());
  }

  private refreshMine(): void {
    this.api.listMine().subscribe({
      next: (ps) => this.mine.set(ps),
      error: () => this.mine.set([])
    });
  }

  submit(): void {
    if (!this.title.trim()) return;
    this.submitting.set(true);
    this.success.set(false);
    this.error.set(null);
    this.api.create({
      title: this.title.trim(),
      description: this.description.trim(),
      imageUrl: this.imageUrl
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.title = '';
        this.description = '';
        this.imageUrl = null;
        this.refreshMine();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? this.i18n.t('propose.err.generic'));
      }
    });
  }
}
