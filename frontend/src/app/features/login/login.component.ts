import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="login">
      <div class="login__form-side">
        <span class="brand" aria-label="Inetum, Charity Day">
          <span class="brand__mark" aria-hidden="true"></span>
          <span class="brand__word">Inetum</span>
          <span class="muted brand__suffix">· Charity Day</span>
        </span>

        <div class="login__center">
          <div class="login__card">
            <h1 class="login__title">Sign in to Charity Day</h1>
            <p class="login__lead">
              Use your Inetum account to access volunteer actions and your registrations.
            </p>

            <form class="login__form" (ngSubmit)="submit()" autocomplete="on">
              <div class="field">
                <label class="field__label" for="email">Work email</label>
                <input class="input" id="email" name="email" type="email"
                       placeholder="first.last@inetum.com" autocomplete="email"
                       [(ngModel)]="emailModel" required autofocus />
              </div>
              <div class="field" style="margin-top: 18px;">
                <label class="field__label" for="password">Password</label>
                <input class="input" id="password" name="password" type="password"
                       placeholder="••••••••" autocomplete="current-password"
                       [(ngModel)]="passwordModel" required />
              </div>

              @if (error()) {
                <p class="login__error" role="alert">{{ error() }}</p>
              }

              <button class="btn btn--primary btn--lg btn--block" type="submit"
                      [disabled]="loading()" style="margin-top: 24px;">
                @if (loading()) { Signing in… } @else { Sign in }
              </button>
            </form>

            <p class="login__foot">
              Access is reserved to Inetum employees and partners.
            </p>
          </div>
        </div>
      </div>

      <aside class="login__brand-side" aria-hidden="true">
        <svg class="tile-motif" viewBox="0 0 460 460" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.10)"/>
            </pattern>
          </defs>
          <rect width="460" height="460" fill="url(#dots)"/>
          <rect x="200" y="80"  width="80" height="80" fill="rgba(244,228,67,0.18)"/>
          <rect x="288" y="80"  width="80" height="80" fill="rgba(244,228,67,0.10)"/>
          <rect x="288" y="168" width="80" height="80" fill="rgba(255,255,255,0.06)"/>
          <rect x="112" y="256" width="80" height="80" fill="rgba(244,228,67,0.14)"/>
        </svg>

        <div class="login__lead-quote">
          <p class="label" style="color: var(--yellow); margin-bottom: 14px;">2026 Edition</p>
          <h2>A platform for the actions you choose, not the ones you’re sold.</h2>
          <p>Charity Day connects you to vetted partner NGOs across France.
             You pick the cause, the date, the format — register in a couple of clicks.</p>
        </div>

        <div class="login__brand-foot">
          <span>Inetum · Charity Day</span>
          <span>Internal use only</span>
        </div>
      </aside>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .login {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: var(--white);
    }
    .login__form-side {
      display: flex;
      flex-direction: column;
      padding: 32px 48px;
    }
    .brand__suffix { font-size: 14px; font-weight: 400; }
    .login__center {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login__card {
      width: 100%;
      max-width: 380px;
    }
    .login__title {
      font-size: 30px;
      line-height: 1.15;
      letter-spacing: -0.02em;
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 8px;
    }
    .login__lead {
      font-size: 15px;
      color: var(--text-muted);
      margin: 0 0 32px;
    }
    .login__error {
      margin: 16px 0 0;
      padding: 10px 12px;
      background: #FBEDED;
      color: #8B1F1F;
      border-radius: var(--radius);
      font-size: 13.5px;
    }
    .login__foot {
      font-size: 12.5px;
      color: var(--text-subtle);
      margin-top: 32px;
    }

    .login__brand-side {
      background: var(--navy);
      color: var(--text-on-navy);
      padding: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .tile-motif {
      position: absolute;
      inset: auto -40px -40px auto;
      width: 460px;
      height: 460px;
      opacity: 0.5;
      pointer-events: none;
    }
    .login__lead-quote { max-width: 460px; margin-top: 80px; }
    .login__lead-quote h2 {
      font-size: 32px;
      line-height: 1.25;
      letter-spacing: -0.02em;
      font-weight: 500;
      color: var(--white);
      margin: 0 0 20px;
    }
    .login__lead-quote p {
      color: var(--text-on-navy-muted);
      font-size: 15px;
      max-width: 40ch;
      margin: 0;
    }
    .login__brand-foot {
      font-size: 11.5px;
      color: var(--text-on-navy-muted);
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    @media (max-width: 880px) {
      .login { grid-template-columns: 1fr; }
      .login__brand-side { display: none; }
    }
  `]
})
export class LoginComponent {
  emailModel = 'admin@local';
  passwordModel = 'admin';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.error.set(null);
    this.loading.set(true);
    this.auth.login(this.emailModel, this.passwordModel).subscribe({
      next: () => this.router.navigateByUrl('/actions'),
      error: (err) => {
        this.error.set(err.status === 401 ? 'Invalid credentials' : 'Server error — try again');
        this.loading.set(false);
      }
    });
  }
}
