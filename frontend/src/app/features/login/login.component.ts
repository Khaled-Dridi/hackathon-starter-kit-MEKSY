import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    CardModule
  ],
  template: `
    <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;padding:1rem;">
      <div style="width:360px;">
        <p-card header="Connexion">
          <form (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:1rem;">
            <input pInputText id="email" name="email" type="email"
                   placeholder="Email"
                   [(ngModel)]="emailModel" required autofocus />
            <p-password id="password" name="password" [feedback]="false"
                        placeholder="Mot de passe"
                        [(ngModel)]="passwordModel" [toggleMask]="true" required />
            @if (error()) {
              <p-message severity="error" [text]="error()!" />
            }
            <p-button type="submit" label="Se connecter" icon="pi pi-sign-in"
                      [loading]="loading()" />
          </form>
        </p-card>
      </div>
    </div>
  `
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
      next: () => this.router.navigateByUrl('/notes'),
      error: (err) => {
        this.error.set(err.status === 401 ? 'Identifiants invalides' : 'Erreur serveur');
        this.loading.set(false);
      }
    });
  }
}
