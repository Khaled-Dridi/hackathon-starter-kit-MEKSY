import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { AiAssistantWidgetComponent } from '../shared/ai-assistant-widget.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AiAssistantWidgetComponent],
  template: `
    <header class="app-header">
      <div class="app-header__inner">
        <a class="brand" routerLink="/actions" aria-label="Inetum, Charity Day home">
          <span class="brand__mark" aria-hidden="true"></span>
          <span class="brand__word">Inetum</span>
          <span class="muted brand__suffix">· Charity Day</span>
        </a>
        <nav class="app-nav" aria-label="Primary">
          <a routerLink="/actions" routerLinkActive="active">Actions</a>
          <a routerLink="/propose" routerLinkActive="active">Propose an idea</a>
          @if (isAdmin()) {
            <a routerLink="/admin/actions" routerLinkActive="active">Admin</a>
          }
        </nav>
        <div class="app-header__right">
          <span class="user-chip" role="status">
            <span class="user-chip__avatar">{{ initials() }}</span>
            <span>{{ email() }}</span>
          </span>
          <button type="button" class="btn btn--secondary btn--sm" (click)="logout()">
            <i class="pi pi-sign-out"></i> Sign out
          </button>
        </div>
      </div>
    </header>
    <main class="content">
      <router-outlet />
    </main>
    <footer class="app-footer">
      <div class="app-footer__inner">
        <span>Inetum · Charity Day · 2026 edition</span>
        <span>Internal use only</span>
      </div>
    </footer>

    <app-ai-assistant-widget />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; background: var(--white); }
    .content { flex: 1; }
    .brand__suffix { font-size: 14px; font-weight: 400; }
    .pi-sign-out { font-size: 12px; }
  `]
})
export class MainLayoutComponent {
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
