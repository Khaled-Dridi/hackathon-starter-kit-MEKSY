import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Proposal, ProposalsService } from '../../core/proposals.service';
import { EventsService } from '../../core/events.service';
import { ImagePickerComponent } from '../../shared/image-picker.component';

@Component({
  selector: 'app-propose',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, ImagePickerComponent],
  template: `
    <section class="hero-band">
      <div class="container">
        <div>
          <div class="page-title-row"><h1 class="page-title has-dot">Share your idea</h1></div>
          <p class="page-subtitle">Got an action in mind? Drop it here — the team reads every one.</p>
        </div>
      </div>
    </section>

    <div class="container" style="padding: 32px 0 64px;">
      <div class="grid-12">
        <!-- Left: form -->
        <div class="col-main">
          <form class="card" (ngSubmit)="submit()" #f="ngForm" style="padding: 24px 26px;">

            @if (success()) {
              <div class="banner banner--success" role="status" style="margin-bottom: 20px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <div class="banner__body">
                  <strong>Thanks — your idea is in.</strong>
                  We'll let you know the moment it's reviewed.
                </div>
              </div>
            }
            @if (error()) {
              <div class="banner banner--error" role="alert" style="margin-bottom: 20px;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div class="banner__body">{{ error() }}</div>
              </div>
            }

            <h2 class="card-title" style="margin-bottom: 18px; font-size: 1.125rem;">Your idea</h2>

            <div class="field">
              <label class="field__label" for="idea-title">Short title</label>
              <input class="input" id="idea-title" name="title" type="text"
                     placeholder="e.g. CV workshops for people re-entering the workforce"
                     [(ngModel)]="title" required maxlength="200" />
              <p class="field__hint">One line, no jargon.</p>
            </div>

            <div class="field" style="margin-top: 18px;">
              <label class="field__label" for="idea-desc">What would it involve?</label>
              <textarea class="textarea" id="idea-desc" name="description" rows="5"
                        placeholder="What would participants do? Who benefits? Roughly how many hours? Anything we should know about the NGO?"
                        [(ngModel)]="description"></textarea>
            </div>

            <div class="field" style="margin-top: 18px;">
              <label class="field__label">Cover image (optional)</label>
              <app-image-picker [value]="imageUrl" (valueChange)="imageUrl = $event" />
              <p class="field__hint">A photo of the cause, the place, or the NGO helps reviewers picture your idea.</p>
            </div>

            <div class="form-actions">
              <a class="btn btn--ghost" routerLink="/actions">Cancel</a>
              <button class="btn btn--yellow" type="submit"
                      [disabled]="submitting() || f.invalid"
                      [class.btn--loading]="submitting()">
                Submit idea
              </button>
            </div>
          </form>

          @if (mine().length > 0) {
            <section class="submitted-strip card" aria-label="Your ideas">
              <h3 class="card-title" style="margin-bottom: 16px;">Your recent ideas</h3>
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
                          Submitted {{ p.createdAt | date:'MMM d' }}
                        </span>
                      </div>
                    </div>
                    @switch (p.status) {
                      @case ('PENDING')  { <span class="pill pill--pending"><span class="dot"></span>In review</span> }
                      @case ('ACCEPTED') { <span class="pill pill--accepted"><span class="dot"></span>Accepted</span> }
                      @case ('REJECTED') { <span class="pill pill--rejected"><span class="dot"></span>Not retained</span> }
                    }
                  </div>
                }
              </div>
            </section>
          }
        </div>

        <!-- Right: how it works -->
        <aside class="col-rail">
          <div class="card" style="padding: 22px 24px;">
            <p class="t-xs muted" style="margin-bottom: 8px;">How proposals work</p>
            <h3 class="card-title" style="margin-bottom: 16px;">From idea to action</h3>
            <ol class="how-list">
              <li>
                <span class="how-num">1</span>
                <div>
                  <strong>Submit your idea.</strong>
                  <p class="muted">Title and a few lines on what you're imagining.</p>
                </div>
              </li>
              <li>
                <span class="how-num">2</span>
                <div>
                  <strong>Admin team reviews.</strong>
                  <p class="muted">Usually within a week. You'll be notified either way.</p>
                </div>
              </li>
              <li>
                <span class="how-num">3</span>
                <div>
                  <strong>It becomes a real action.</strong>
                  <p class="muted">Approved ideas show up on the actions page for everyone.</p>
                </div>
              </li>
            </ol>
          </div>

          <div class="card" style="padding: 22px 24px; margin-top: 16px; background: var(--surface-2);">
            <p class="muted" style="font-size: 0.875rem; line-height: 1.55; margin: 0;">
              <strong style="color: var(--ink);">Pro tip.</strong>
              Concrete proposals (named NGO, rough date, specific format) move faster than vague ones.
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
  `]
})
export class ProposeComponent implements OnInit, OnDestroy {
  private api = inject(ProposalsService);
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
        this.error.set(err?.error?.message ?? 'Could not submit idea.');
      }
    });
  }
}
