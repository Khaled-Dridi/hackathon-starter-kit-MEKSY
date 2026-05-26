import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { ActionsService, CharityAction } from '../../core/actions.service';
import { AiService } from '../../core/ai.service';
import { I18nService } from '../../core/i18n.service';
import { ActionMapComponent } from '../../shared/action-map.component';
import { ImagePickerComponent } from '../../shared/image-picker.component';

@Component({
  selector: 'app-admin-action-form',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, ActionMapComponent, ImagePickerComponent],
  template: `
    <div class="subnav">
      <div class="container">
        <a class="tab" routerLink="/admin/actions" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: false }">{{ i18n.t('admin.subnav.actions') }}</a>
        <a class="tab" routerLink="/admin/proposals" routerLinkActive="is-active">{{ i18n.t('admin.subnav.proposals') }}</a>
      </div>
    </div>

    <div class="container container--narrow" style="padding: 16px 0 64px;">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a routerLink="/admin/actions">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          {{ i18n.t('adminForm.breadcrumb') }}
        </a>
        <span class="breadcrumb__sep">/</span>
        <span class="current">{{ isEdit() ? title : i18n.t('adminForm.new') }}</span>
      </nav>

      <div class="form-head">
        <div class="page-title-row"><h1 class="page-title has-dot">{{ isEdit() ? i18n.t('adminForm.edit') : i18n.t('adminForm.new') }}</h1></div>
        <p class="page-subtitle">
          {{ isEdit() ? i18n.t('adminForm.subtitle.edit') : i18n.t('adminForm.subtitle.new') }}
        </p>
      </div>

      @if (loadError()) {
        <div class="banner banner--error" role="alert" style="margin-top: 20px;">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="banner__body">{{ loadError() }}</div>
        </div>
      }

      <form (ngSubmit)="submit()" #f="ngForm">

        <section class="card form-card">
          <h2 class="card-title">{{ i18n.t('adminForm.sec.basics') }}</h2>

          <div class="field">
            <label class="field__label" for="title">{{ i18n.t('adminForm.title.label') }}</label>
            <input class="input" id="title" name="title" type="text"
                   [placeholder]="i18n.t('adminForm.title.placeholder')"
                   [(ngModel)]="title" required maxlength="200" />
            <p class="field__hint">{{ i18n.t('adminForm.title.hint') }}</p>
          </div>

          <div class="field" style="margin-top: 20px;">
            <div class="field__row">
              <label class="field__label" for="description">{{ i18n.t('adminForm.desc.label') }}</label>
              <span class="field__hint">{{ i18n.t('adminForm.desc.hint') }}</span>
            </div>
            <div class="textarea-wrap">
              <textarea class="textarea" id="description" name="description" rows="7"
                        [placeholder]="i18n.t('adminForm.desc.placeholder')"
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
        </section>

        <section class="card form-card">
          <h2 class="card-title">{{ i18n.t('adminForm.sec.cover') }}</h2>
          <p class="muted" style="font-size: 0.875rem; margin-bottom: 14px;">
            {{ i18n.t('adminForm.cover.help') }}
          </p>
          <app-image-picker [value]="imageUrl" (valueChange)="imageUrl = $event" />
        </section>

        <section class="card form-card">
          <h2 class="card-title">{{ i18n.t('adminForm.sec.where') }}</h2>

          <div class="grid-2">
            <div class="field">
              <label class="field__label" for="date">{{ i18n.t('adminForm.date.label') }}</label>
              <input class="input" id="date" name="date" type="date"
                     [(ngModel)]="date" required />
            </div>
            <div class="field">
              <label class="field__label" for="time">{{ i18n.t('adminForm.time.label') }}</label>
              <input class="input" id="time" name="time" type="time"
                     [(ngModel)]="time" required />
            </div>
          </div>

          <div class="field" style="margin-top: 16px;">
            <label class="field__label" for="location">{{ i18n.t('adminForm.location.label') }}</label>
            <input class="input" id="location" name="location" type="text"
                   [placeholder]="i18n.t('adminForm.location.placeholder')"
                   [(ngModel)]="location" maxlength="200" />
            <p class="field__hint">{{ i18n.t('adminForm.location.hint') }}</p>
          </div>

          <div class="field" style="margin-top: 16px;">
            <div class="field__row">
              <label class="field__label">{{ i18n.t('adminForm.pin.label') }}</label>
              @if (latitude !== null && longitude !== null) {
                <button type="button" class="link-btn" (click)="clearCoords()">{{ i18n.t('adminForm.pin.clear') }}</button>
              } @else {
                <span class="field__hint">{{ i18n.t('adminForm.pin.hint') }}</span>
              }
            </div>
            <app-action-map
              [pickable]="true"
              [initialPick]="initialPick()"
              [height]="320"
              (picked)="onPicked($event)" />
            @if (latitude !== null && longitude !== null) {
              <p class="field__hint" style="margin-top: 8px; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ i18n.t('adminForm.pin.coords', { lat: latitude!.toFixed(5), lng: longitude!.toFixed(5) }) }}
              </p>
            }
          </div>
        </section>

        <section class="card form-card">
          <h2 class="card-title">{{ i18n.t('adminForm.sec.capacity') }}</h2>

          <div class="grid-2">
            <div class="field">
              <label class="field__label" for="capacity">{{ i18n.t('adminForm.capacity.label') }}</label>
              <input class="input" id="capacity" name="capacity" type="number"
                     min="1" [(ngModel)]="capacity" required />
            </div>
            <div class="field">
              <label class="field__label" for="oddTag">{{ i18n.t('adminForm.odd.label') }}</label>
              <select class="select" id="oddTag" name="oddTag" [(ngModel)]="oddTag">
                <option [ngValue]="null">{{ i18n.t('adminForm.odd.none') }}</option>
                <option value="SDG_01">01 · No poverty</option>
                <option value="SDG_02">02 · Zero hunger</option>
                <option value="SDG_03">03 · Health</option>
                <option value="SDG_04">04 · Quality education</option>
                <option value="SDG_05">05 · Gender equality</option>
                <option value="SDG_10">10 · Reduced inequalities</option>
                <option value="SDG_11">11 · Sustainable cities</option>
                <option value="SDG_13">13 · Climate action</option>
                <option value="SDG_14">14 · Life below water</option>
                <option value="SDG_15">15 · Life on land</option>
              </select>
            </div>
          </div>
        </section>

        <section class="card form-card">
          <h2 class="card-title">{{ i18n.t('adminForm.sec.after') }}</h2>
          <p class="muted" style="font-size: 0.875rem; margin-bottom: 14px;">
            {{ i18n.t('adminForm.after.help') }}
          </p>
          <div class="field">
            <label class="field__label" for="impact">{{ i18n.t('adminForm.impact.label') }}</label>
            <textarea class="textarea" id="impact" name="impact" rows="3"
                      [placeholder]="i18n.t('adminForm.impact.placeholder')"
                      [(ngModel)]="impactSummary"></textarea>
          </div>
        </section>

        @if (submitError()) {
          <div class="banner banner--error" role="alert" style="margin-top: 20px;">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div class="banner__body">{{ submitError() }}</div>
          </div>
        }

        <div class="form-actions">
          <a class="btn btn--ghost" routerLink="/admin/actions">{{ i18n.t('common.cancel') }}</a>
          <button class="btn btn--yellow" type="submit"
                  [disabled]="submitting() || f.invalid"
                  [class.btn--loading]="submitting()">
            {{ isEdit() ? i18n.t('adminForm.saveChanges') : i18n.t('adminForm.publish') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--bg); min-height: calc(100vh - var(--header-h)); }

    .form-head { padding-top: 16px; }
    .form-card { padding: 24px 24px 28px; margin-top: 20px; }
    .grid-2 {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    }
    @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }

    .textarea-wrap { position: relative; }
    .ai-btn {
      position: absolute;
      right: 10px; bottom: 10px;
      background: var(--surface); border: 1px solid var(--line-2);
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

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding: 16px 0;
    }

    .field__row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .link-btn {
      background: transparent; border: 0;
      color: var(--ink); font-size: 0.8125rem; font-weight: 600;
      cursor: pointer; padding: 0;
    }
    .link-btn:hover { text-decoration: underline; }
  `]
})
export class AdminActionFormComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private actionsApi = inject(ActionsService);
  private aiApi = inject(AiService);
  private router = inject(Router);

  readonly editId = signal<number | null>(null);
  readonly isEdit = computed(() => this.editId() !== null);

  title = '';
  description = '';
  date = '';
  time = '09:00';
  location = '';
  latitude: number | null = null;
  longitude: number | null = null;
  capacity = 10;
  oddTag: string | null = null;
  impactSummary = '';
  imageUrl: string | null = null;

  readonly aiBusy = signal(false);
  readonly aiPreview = signal<string | null>(null);
  readonly aiError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.editId.set(id);
      this.loadAction(id);
    }
  }

  private loadAction(id: number): void {
    this.actionsApi.get(id).subscribe({
      next: (a) => this.populate(a),
      error: () => this.loadError.set(this.i18n.t('adminForm.err.load'))
    });
  }

  private populate(a: CharityAction): void {
    this.title = a.title;
    this.description = a.description ?? '';
    const [d, t] = (a.actionDate ?? '').split('T');
    this.date = d ?? '';
    this.time = (t ?? '09:00:00').substring(0, 5);
    this.location = a.location ?? '';
    this.latitude = a.latitude ?? null;
    this.longitude = a.longitude ?? null;
    this.capacity = a.capacity;
    this.oddTag = a.oddTag ?? null;
    this.impactSummary = a.impactSummary ?? '';
    this.imageUrl = a.imageUrl ?? null;
  }

  initialPick(): { lat: number; lng: number } | null {
    return this.latitude !== null && this.longitude !== null
      ? { lat: this.latitude, lng: this.longitude }
      : null;
  }

  onPicked(p: { lat: number; lng: number }): void {
    this.latitude = Math.round(p.lat * 1e6) / 1e6;
    this.longitude = Math.round(p.lng * 1e6) / 1e6;
  }

  clearCoords(): void {
    this.latitude = null;
    this.longitude = null;
  }

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

  submit(): void {
    if (!this.date || !this.time) return;
    this.submitting.set(true);
    this.submitError.set(null);
    const actionDate = `${this.date}T${this.time}:00`;
    const payload = {
      title: this.title.trim(),
      description: this.description.trim(),
      actionDate,
      location: this.location.trim() || null,
      latitude: this.latitude,
      longitude: this.longitude,
      capacity: this.capacity,
      oddTag: this.oddTag,
      impactSummary: this.impactSummary.trim() || null,
      imageUrl: this.imageUrl
    };

    const id = this.editId();
    const obs = id !== null
      ? this.actionsApi.update(id, payload)
      : this.actionsApi.create(payload);

    obs.subscribe({
      next: (a) => this.router.navigate(['/actions', a.id]),
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.message ?? this.i18n.t('adminForm.err.save'));
      }
    });
  }
}
