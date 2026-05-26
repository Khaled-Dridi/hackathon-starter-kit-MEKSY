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

      <!-- Right: Inetum-themed brand panel — animated squares + echo typography -->
      <aside class="login__brand-side" aria-hidden="true">
        <!-- Inetum wordmark top-right (yellow on navy) -->
        <div class="brand-side__lockup">
          <span class="brand-wordmark brand-wordmark--bright">inetum</span>
        </div>

        <!-- Animated yellow tile motif (the Inetum signature) -->
        <div class="tiles">
          <span class="tile tile--a"></span>
          <span class="tile tile--b"></span>
          <span class="tile tile--c"></span>
          <span class="tile tile--d"></span>
          <span class="tile tile--e"></span>
          <span class="tile tile--f"></span>
        </div>

        <!-- Echo-text headline, banner-style -->
        <div class="echo">
          <div class="echo-line" [attr.data-text]="i18n.t('login.echo.line1')">{{ i18n.t('login.echo.line1') }}</div>
          <div class="echo-line" [attr.data-text]="i18n.t('login.echo.line2')">{{ i18n.t('login.echo.line2') }}</div>
          <div class="echo-line" [attr.data-text]="i18n.t('login.echo.line3')">{{ i18n.t('login.echo.line3') }}</div>
        </div>

        <!-- Footer tag -->
        <div class="login__brand-foot">
          <span>{{ i18n.t('login.echo.tagline') }}</span>
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
    /* Inetum L-mark stays accent yellow on the white-form side */
    .brand-wordmark--dark::after { background: var(--accent); }
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
      /* Inetum navy — slightly cooler than the global --ink to match the brand book exactly. */
      background: #262E5A;
      color: #fff;
      padding: 48px 56px;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 24px;
      position: relative;
      overflow: hidden;
      isolation: isolate; /* anchor mix-blend-mode tiles to this layer only */
    }

    /* Wordmark top-right — bright yellow on navy, per brand banner */
    .brand-side__lockup {
      position: relative;
      z-index: 2;
      justify-self: end;
    }
    .brand-wordmark--bright {
      color: var(--accent);
      font-family: var(--font-sans);
      font-weight: 800;
      letter-spacing: -0.04em;
      font-size: 1.625rem;
      line-height: 1;
      text-transform: lowercase;
      display: inline-flex; align-items: baseline;
    }
    /* Override the global ::after so the L-mark stays yellow */
    .brand-wordmark--bright::after { background: var(--accent); }

    /* ─── Tile motif animation — the Inetum signature ─── */
    .tiles {
      position: absolute;
      inset: 0;
      z-index: 1;
      overflow: hidden;
      pointer-events: none;
    }
    .tile {
      position: absolute;
      display: block;
      background: var(--accent);
      /* Multiply over the navy bg produces the brand olive tones in the overlaps —
         exactly what we see in the logo.png three-square motif. */
      mix-blend-mode: screen;
      opacity: 0.92;
      will-change: transform;
      box-shadow: 0 0 0 1px rgba(244, 228, 67, 0.05);
    }
    /* Six squares of varying sizes, each on its own slow drift cycle so the
       overlaps shift over time — the panel feels alive but never frantic. */
    .tile--a { width: 180px; height: 180px; top: 14%; left: 12%; animation: drift-a 22s ease-in-out infinite; }
    .tile--b { width: 130px; height: 130px; top: 18%; left: 36%; opacity: 0.55; animation: drift-b 26s ease-in-out infinite; }
    .tile--c { width: 100px; height: 100px; top: 38%; left: 22%; opacity: 0.40; animation: drift-c 30s ease-in-out infinite; }
    .tile--d { width: 220px; height: 220px; top: 46%; left: 46%; opacity: 0.65; animation: drift-d 28s ease-in-out infinite; }
    .tile--e { width:  80px; height:  80px; top: 70%; left: 18%; opacity: 0.50; animation: drift-e 24s ease-in-out infinite; }
    .tile--f { width: 140px; height: 140px; top: 64%; left: 64%; opacity: 0.35; animation: drift-f 32s ease-in-out infinite; }

    /* Each tile drifts on a different orbit and scales subtly — combined,
       they reshape the L-bracket pattern from the brand book continuously. */
    @keyframes drift-a {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%      { transform: translate(36px, -22px) scale(1.04); }
    }
    @keyframes drift-b {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%      { transform: translate(-28px, 18px) scale(0.95); }
    }
    @keyframes drift-c {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%      { transform: translate(22px, 30px) scale(1.08); }
    }
    @keyframes drift-d {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%      { transform: translate(-40px, -28px) scale(0.96); }
    }
    @keyframes drift-e {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%      { transform: translate(30px, -20px) scale(1.10); }
    }
    @keyframes drift-f {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50%      { transform: translate(-24px, 22px) scale(1.02); }
    }

    /* ─── Echo-text headline — banner-style, repeated copies fading down ─── */
    .echo {
      position: relative;
      z-index: 2;
      align-self: end;
      justify-self: end;
      text-align: right;
      max-width: 100%;
      padding-right: 4px;
      pointer-events: none;
    }
    .echo-line {
      position: relative;
      font-family: var(--font-sans);
      font-weight: 900;
      font-size: clamp(2.2rem, 4.6vw, 3.6rem);
      letter-spacing: -0.02em;
      line-height: 0.95;
      color: var(--accent);
      text-transform: uppercase;
      margin: 0;
    }
    .echo-line + .echo-line { margin-top: 2px; }

    /* ─── Footer tag ─── */
    .login__brand-foot {
      position: relative;
      z-index: 2;
      font-size: 0.75rem;
      color: rgba(255,255,255,.55);
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .login__brand-foot span:first-child {
      letter-spacing: -0.02em;
      font-weight: 600;
      color: rgba(255,255,255,.8);
    }

    /* Respect users who don't want motion */
    @media (prefers-reduced-motion: reduce) {
      .tile { animation: none !important; }
    }

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
