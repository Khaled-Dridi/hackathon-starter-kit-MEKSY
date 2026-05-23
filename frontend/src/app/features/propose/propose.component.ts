import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Proposal, ProposalsService } from '../../core/proposals.service';

@Component({
  selector: 'app-propose',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <div class="container container--narrow" style="padding: 56px 0 64px;">
      <section class="propose__intro">
        <p class="eyebrow">Bottom-up</p>
        <h1>Suggest an action you'd like to see happen.</h1>
        <p class="meta">An NGO you trust, a cause that matters to you, a format we haven't tried.</p>
      </section>

      <section class="propose-card">
        <form (ngSubmit)="submit()" #f="ngForm">
          <h2>Your idea</h2>

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

          @if (success()) {
            <p class="propose-ok" role="status">
              <i class="pi pi-check-circle"></i> Idea submitted. The Charity Day team will review it shortly.
            </p>
          }
          @if (error()) {
            <p class="propose-err" role="alert">{{ error() }}</p>
          }

          <div class="form-actions">
            <a class="btn btn--ghost" routerLink="/actions">Cancel</a>
            <button class="btn btn--primary" type="submit" [disabled]="submitting() || f.invalid">
              @if (submitting()) { Submitting… } @else { Submit idea }
            </button>
          </div>
        </form>
      </section>

      @if (mine().length > 0) {
        <section class="submitted-strip" aria-label="Your ideas">
          <h3>Your recent ideas</h3>
          @for (p of mine(); track p.id) {
            <div class="row--between">
              <div>
                <span style="color: var(--text); font-weight: 500;">{{ p.title }}</span>
                <span class="meta" style="display:block; font-size:12px;">
                  Submitted {{ p.createdAt | date:'MMM d' }}
                </span>
              </div>
              @switch (p.status) {
                @case ('PENDING')  { <span class="pill pill--soon">In review</span> }
                @case ('ACCEPTED') { <span class="pill pill--open pill--dot">Accepted</span> }
                @case ('REJECTED') { <span class="pill pill--full">Not retained</span> }
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--white); }

    .propose__intro h1 {
      font-size: 32px;
      line-height: 1.2;
      letter-spacing: -0.02em;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 10px;
      max-width: 28ch;
    }
    .propose__intro .meta { font-size: 15px; max-width: 56ch; }

    .propose-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 28px 28px 32px;
      margin-top: 32px;
    }
    .propose-card h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 18px;
    }

    .propose-ok {
      margin: 18px 0 0;
      padding: 10px 12px;
      background: #E8F4ED;
      color: #1B7F4F;
      border-radius: var(--radius);
      font-size: 13.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .propose-err {
      margin: 18px 0 0;
      padding: 10px 12px;
      background: #FBEDED;
      color: #8B1F1F;
      border-radius: var(--radius);
      font-size: 13.5px;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
    }

    .submitted-strip {
      margin-top: 40px;
      padding: 20px 22px;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .submitted-strip h3 {
      font-size: 13px;
      font-weight: 600;
      color: var(--navy);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 14px;
    }
    .submitted-strip .row--between {
      padding: 10px 0;
      border-top: 1px solid var(--border);
    }
    .submitted-strip .row--between:first-of-type { border-top: 0; }
  `]
})
export class ProposeComponent implements OnInit {
  private api = inject(ProposalsService);
  private router = inject(Router);

  title = '';
  description = '';
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);
  readonly mine = signal<Proposal[]>([]);

  ngOnInit(): void {
    this.refreshMine();
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
      description: this.description.trim()
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.title = '';
        this.description = '';
        this.refreshMine();
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Could not submit idea.');
      }
    });
  }
}
