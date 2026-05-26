import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="login">
      <!-- Left: form -->
      <section class="login__form-side">
        <div class="login__topbar">
          <a class="brand brand--dark" href="/" [attr.aria-label]="i18n.t('login.brand.aria')">
            <span class="brand-wordmark brand-wordmark--dark">inetum</span>
            <span class="brand-divider brand-divider--dark" aria-hidden="true"></span>
            <span class="brand-app brand-app--dark">Charity Day</span>
          </a>
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
        </div>

        <div class="login__center">
          <div class="login__card">
            <h1 class="login__title">
              {{ mode() === 'signup' ? i18n.t('login.title.signup') : i18n.t('login.title.signin') }}
            </h1>

            <form class="login__form" (ngSubmit)="submit()" autocomplete="on">
              <div class="field">
                <label class="field__label" for="email">{{ i18n.t('login.email.label') }}</label>
                <input class="input" id="email" name="email" type="email"
                       [placeholder]="i18n.t('login.email.placeholder')" autocomplete="email"
                       [(ngModel)]="emailModel" required autofocus />
              </div>
              <div class="field" style="margin-top: 18px;">
                <label class="field__label" for="password">{{ i18n.t('login.password.label') }}</label>
                <input class="input" id="password" name="password" type="password"
                       [placeholder]="i18n.t('login.password.placeholder')"
                       [attr.autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
                       [(ngModel)]="passwordModel" required
                       [attr.minlength]="mode() === 'signup' ? 6 : null" />
                @if (mode() === 'signup') {
                  <span class="field__hint">{{ i18n.t('login.password.hint') }}</span>
                }
              </div>

              @if (error()) {
                <div class="banner banner--error" role="alert" style="margin-top: 16px;">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div class="banner__body">
                    <strong>{{ mode() === 'signup' ? i18n.t('login.err.signup.head') : i18n.t('login.err.signin.head') }}</strong>
                    {{ error() }}
                  </div>
                </div>
              }

              <button class="btn btn--primary btn--lg btn--block"
                      type="submit"
                      [disabled]="loading()"
                      [class.btn--loading]="loading()"
                      style="margin-top: 24px;">
                {{ mode() === 'signup' ? i18n.t('login.cta.signup') : i18n.t('login.cta.signin') }}
              </button>
            </form>

            <p class="login__switch">
              @if (mode() === 'signup') {
                {{ i18n.t('login.switch.toSignin.q') }}
                <button type="button" class="login__switch-btn" (click)="setMode('login')">{{ i18n.t('login.switch.toSignin.cta') }}</button>
              } @else {
                {{ i18n.t('login.switch.toSignup.q') }}
                <button type="button" class="login__switch-btn" (click)="setMode('signup')">{{ i18n.t('login.switch.toSignup.cta') }}</button>
              }
            </p>
          </div>
        </div>

        <p class="login__foot muted">
          {{ i18n.t('login.foot') }}
        </p>
      </section>

      <!-- Right: navy brand panel with hand-heart 3D illustration -->
      <aside class="login__brand-side" aria-hidden="true">
        <div class="login__illustration">
          <!-- Hand-giving-heart 3D illustration: original, two-tone, ≤30 paths -->
          <svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6"/>
              </filter>
              <linearGradient id="handBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3A4A7E"/>
                <stop offset="100%" stop-color="#202C50"/>
              </linearGradient>
              <linearGradient id="handHi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#4A5C92"/>
                <stop offset="100%" stop-color="#2C3A66"/>
              </linearGradient>
              <radialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#F4E443" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#F4E443" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="heart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#FCEC5C"/>
                <stop offset="100%" stop-color="#E4D32A"/>
              </linearGradient>
            </defs>
            <ellipse cx="160" cy="130" rx="80" ry="40" fill="url(#heartGlow)"/>
            <path d="M160 88 C 140 60, 100 64, 100 100 C 100 130, 130 150, 160 168 C 190 150, 220 130, 220 100 C 220 64, 180 60, 160 88 Z"
                  fill="#C9A227" filter="url(#soft)" opacity="0.4"/>
            <path d="M160 92 C 142 68, 108 72, 108 102 C 108 128, 134 144, 160 162 C 186 144, 212 128, 212 102 C 212 72, 178 68, 160 92 Z"
                  fill="url(#heart)"/>
            <path d="M130 96 C 122 92, 116 100, 120 110 C 124 118, 134 116, 138 108 C 140 102, 136 98, 130 96 Z"
                  fill="rgba(255,255,255,0.5)"/>
            <ellipse cx="160" cy="230" rx="90" ry="14" fill="rgba(0,0,0,0.25)" filter="url(#soft)"/>
            <path d="M80 220 C 80 195, 100 175, 130 175 L 190 175 C 220 175, 240 195, 240 220 L 240 240 C 240 270, 215 285, 185 285 L 135 285 C 105 285, 80 270, 80 240 Z"
                  fill="url(#handBase)"/>
            <path d="M100 200 C 110 190, 130 188, 150 192 L 180 192 C 200 188, 220 192, 230 205"
                  stroke="url(#handHi)" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.6"/>
            <path d="M105 175 C 105 160, 110 150, 120 150 C 130 150, 135 160, 135 175 Z" fill="url(#handBase)"/>
            <path d="M140 175 C 140 155, 145 144, 158 144 C 171 144, 176 155, 176 175 Z" fill="url(#handHi)"/>
            <path d="M180 175 C 180 158, 188 148, 200 148 C 212 148, 217 158, 217 175 Z" fill="url(#handBase)"/>
            <circle cx="70" cy="100" r="4" fill="#3A4A7E"/>
            <circle cx="250" cy="80" r="3" fill="#F4E443"/>
            <circle cx="270" cy="160" r="4" fill="#3A4A7E"/>
            <circle cx="50" cy="180" r="3" fill="#F4E443"/>
            <circle cx="240" cy="200" r="3" fill="#3A4A7E"/>
          </svg>
        </div>

        <div class="login__lead-quote">
          <p class="login__eyebrow">{{ i18n.t('login.illus.eyebrow') }}</p>
          <h2>{{ i18n.t('login.illus.title.before') }} <span class="scribble">{{ i18n.t('login.illus.title.scribble') }}</span>.</h2>
          <p>{{ i18n.t('login.illus.subtitle') }}</p>
        </div>

        <div class="login__brand-foot">
          <span>{{ i18n.t('login.illus.foot.brand') }}</span>
          <span>{{ i18n.t('login.illus.foot.internal') }}</span>
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
      background: var(--surface);
    }
    .login__form-side {
      display: flex;
      flex-direction: column;
      padding: 32px 48px;
      gap: 12px;
    }
    .login__topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .brand--dark { color: var(--ink); }
    .brand-wordmark--dark { color: var(--ink); }
    .brand-wordmark--dark::after { background: var(--accent); box-shadow: 0 0 0 2px rgba(244,228,67,.22); }
    .brand-divider--dark { background: var(--line); }
    .brand-app--dark { color: var(--ink); }

    .lang-seg {
      display: inline-flex;
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px;
      gap: 2px;
    }
    .lang-seg button {
      background: transparent;
      border: 0;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--muted);
      border-radius: 999px;
      cursor: pointer;
      transition: color var(--t-hover) var(--ease), background var(--t-hover) var(--ease);
    }
    .lang-seg button:hover { color: var(--ink); }
    .lang-seg button.is-active {
      background: var(--ink);
      color: var(--accent);
    }

    .login__center {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login__card { width: 100%; max-width: 380px; }
    .login__title {
      font-size: 2rem; line-height: 1.15; letter-spacing: -0.015em;
      font-weight: 700; color: var(--ink); margin: 0 0 28px;
    }
    .login__foot {
      font-size: 0.8125rem;
      margin-top: 24px;
    }

    .login__brand-side {
      background:
        radial-gradient(800px 500px at 80% -10%, rgba(244,228,67,.06), transparent 60%),
        url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='%23ffffff' stroke-width='1' opacity='0.05'><path d='M0 30 H120 M0 60 H120 M0 90 H120'/><path d='M30 0 V120 M60 0 V120 M90 0 V120'/></g></svg>") right center / 240px,
        linear-gradient(180deg, #232F56 0%, #1C2747 100%);
      color: #fff;
      padding: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .login__illustration {
      align-self: center;
      width: 320px;
      max-width: 60%;
    }
    .login__eyebrow {
      font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--accent); margin: 0 0 14px;
    }
    .login__lead-quote { max-width: 460px; }
    .login__lead-quote h2 {
      font-size: 1.875rem; line-height: 1.25; letter-spacing: -0.02em;
      font-weight: 600; color: #fff; margin: 0 0 16px;
    }
    .login__lead-quote h2 .scribble::after { bottom: -4px; }
    .login__lead-quote p {
      color: rgba(255,255,255,.7);
      font-size: 0.9375rem;
      max-width: 44ch;
      margin: 0;
      line-height: 1.55;
    }
    .login__brand-foot {
      font-size: 0.75rem;
      color: rgba(255,255,255,.55);
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .login__brand-foot span:first-child { letter-spacing: -0.02em; font-weight: 600; }

    .field__hint {
      display: block;
      margin-top: 6px;
      font-size: 0.8125rem;
      color: var(--muted);
    }
    .login__switch {
      margin: 18px 0 0;
      font-size: 0.9375rem;
      color: var(--muted);
    }
    .login__switch-btn {
      background: none;
      border: 0;
      padding: 0;
      margin-left: 6px;
      color: var(--ink);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
      text-decoration-color: var(--accent);
      text-decoration-thickness: 2px;
    }
    .login__switch-btn:hover { color: var(--ink-2); }

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
  readonly mode = signal<'login' | 'signup'>('login');

  readonly i18n = inject(I18nService);
  private auth = inject(AuthService);
  private router = inject(Router);

  setMode(m: 'login' | 'signup'): void {
    this.mode.set(m);
    this.error.set(null);
    if (m === 'signup') {
      this.emailModel = '';
      this.passwordModel = '';
    } else {
      this.emailModel = 'admin@local';
      this.passwordModel = 'admin';
    }
  }

  submit(): void {
    this.error.set(null);
    this.loading.set(true);

    const call = this.mode() === 'signup'
      ? this.auth.signup(this.emailModel, this.passwordModel)
      : this.auth.login(this.emailModel, this.passwordModel);

    call.subscribe({
      next: () => this.router.navigateByUrl('/actions'),
      error: (err) => {
        this.error.set(this.errorMessage(err));
        this.loading.set(false);
      }
    });
  }

  private errorMessage(err: any): string {
    const code = err?.error?.code;
    const status = err?.status;
    if (this.mode() === 'signup') {
      if (code === 'email_already_registered' || status === 409) {
        return this.i18n.t('login.err.signup.duplicate');
      }
      if (code === 'validation_failed' || status === 400) {
        return this.i18n.t('login.err.signup.validation');
      }
      return this.i18n.t('login.err.signup.other');
    }
    return status === 401
      ? this.i18n.t('login.err.signin.401')
      : this.i18n.t('login.err.signin.other');
  }
}
