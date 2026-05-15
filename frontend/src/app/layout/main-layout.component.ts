import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  template: `
    <header class="appbar">
      <strong class="brand">Starter</strong>
      <nav class="nav">
        <a routerLink="/notes" routerLinkActive="active">
          <i class="pi pi-file"></i> Notes
        </a>
        <a routerLink="/chat" routerLinkActive="active">
          <i class="pi pi-comments"></i> Chat
        </a>
        @if (isAdmin()) {
          <a routerLink="/admin/users" routerLinkActive="active">
            <i class="pi pi-shield"></i> Admin
          </a>
        }
      </nav>
      <span class="email">{{ email() }}</span>
      <p-button label="Déconnexion" icon="pi pi-sign-out" severity="secondary"
                size="small" (onClick)="logout()" />
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .appbar {
      display: flex; align-items: center; gap: 1.5rem;
      padding: 0.6rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
    }
    .brand { font-size: 1.1rem; }
    .nav { display: flex; gap: 0.25rem; flex: 1; }
    .nav a {
      padding: 0.4rem 0.8rem; border-radius: 6px;
      color: #374151; text-decoration: none;
      display: inline-flex; align-items: center; gap: 0.4rem;
    }
    .nav a:hover { background: #f3f4f6; }
    .nav a.active { background: #eef2ff; color: #4f46e5; }
    .email { color: #6b7280; font-size: 0.9rem; }
    .content { flex: 1; }
  `]
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly email = computed(() => this.auth.email());
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
