import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';
import { AiAssistantWidgetComponent } from '../shared/ai-assistant-widget.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AiAssistantWidgetComponent],
  template: `
    <header class="app-header">
      <div class="container">
        <a class="brand" routerLink="/actions" [attr.aria-label]="i18n.t('login.brand.aria')">
          <span class="brand-wordmark">inetum</span>
          <span class="brand-divider" aria-hidden="true"></span>
          <span class="brand-app">Charity Day</span>
        </a>
        <nav class="nav-main" aria-label="Primary">
          <a class="nav-link" routerLink="/actions" routerLinkActive="is-active">{{ i18n.t('nav.actions') }}</a>
          <a class="nav-link" routerLink="/propose" routerLinkActive="is-active">{{ i18n.t('nav.propose') }}</a>
          @if (isAdmin()) {
            <a class="nav-link" routerLink="/admin/actions" routerLinkActive="is-active">{{ i18n.t('nav.admin') }}</a>
          }
        </nav>
        <div class="header-right">
          <div class="lang-seg" role="group" [attr.aria-label]="i18n.t('lang.toggle.aria')">
            <button type="button"
                    [class.is-active]="i18n.lang() === 'fr'"
                    [attr.aria-pressed]="i18n.lang() === 'fr'"
                    (click)="i18n.setLang('fr')">{{ i18n.t('lang.fr') }}</button>
            <button type="button"
                    [class.is-active]="i18n.lang() === 'en'"
                    [attr.aria-pressed]="i18n.lang() === 'en'"
                    (click)="i18n.setLang('en')">{{ i18n.t('lang.en') }}</button>
          </div>
          <span class="user-chip" role="status" [title]="email()">
            <span class="user-chip__avatar">{{ initials() }}</span>
            <span class="user-chip__email">{{ email() }}</span>
          </span>
          <button type="button" class="btn-signout" (click)="logout()" [attr.aria-label]="i18n.t('nav.signout.aria')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </header>
    <main class="content">
      <router-outlet />
    </main>
    <footer class="app-footer">
      <div class="container">
        <span><span class="accent">inetum</span> {{ i18n.t('footer.tagline') }}</span>
        <span class="muted-on-dark">{{ i18n.t('footer.internal') }}</span>
      </div>
    </footer>

    <app-ai-assistant-widget />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; background: var(--bg); }
    .content { flex: 1; }
    .header-right { display: flex; align-items: center; gap: 12px; }
    .user-chip__email {
      max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    @media (max-width: 720px) {
      .user-chip__email { display: none; }
    }
    .btn-signout {
      width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.06);
      color: #fff; display: inline-flex; align-items: center; justify-content: center;
      border: 0; cursor: pointer;
      transition: background var(--t-hover) var(--ease);
    }
    .btn-signout:hover { background: rgba(255,255,255,.14); }
    .muted-on-dark { color: rgba(255,255,255,.55); }
    .app-footer { color: rgba(255,255,255,.85); }
    .app-footer .accent { color: var(--accent); font-weight: 700; letter-spacing: -0.02em; }

    .lang-seg {
      display: inline-flex;
      background: rgba(255,255,255,.06);
      border-radius: 999px;
      padding: 3px;
      gap: 2px;
    }
    .lang-seg button {
      background: transparent;
      border: 0;
      padding: 4px 10px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: rgba(255,255,255,.6);
      border-radius: 999px;
      cursor: pointer;
      transition: color var(--t-hover) var(--ease), background var(--t-hover) var(--ease);
    }
    .lang-seg button:hover { color: #fff; }
    .lang-seg button.is-active {
      background: var(--accent);
      color: var(--accent-ink);
    }
    @media (max-width: 720px) { .lang-seg { display: none; } }
  `]
})
export class MainLayoutComponent {
  readonly i18n = inject(I18nService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly email = computed(() => this.auth.email() ?? '');
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly initials = computed(() => {
    const e = this.auth.email();
    if (!e) return '··';
    const local = e.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  });

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
