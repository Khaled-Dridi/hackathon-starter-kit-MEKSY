import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';

import { AdminService, AdminUser } from '../../core/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [ButtonModule, CardModule, TableModule, TagModule, MessageModule],
  template: `
    <div style="max-width:900px;margin:2rem auto;padding:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h2 style="margin:0;">Utilisateurs</h2>
        <p-button label="Retour" icon="pi pi-arrow-left" severity="secondary"
                  (onClick)="back()" />
      </div>

      <p-card>
        @if (error()) {
          <p-message severity="error" [text]="error()!" />
        }
        <p-table [value]="users()" [loading]="loading()" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:80px;">ID</th>
              <th>Email</th>
              <th>Rôles</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-u>
            <tr>
              <td>{{ u.id }}</td>
              <td>{{ u.email }}</td>
              <td>
                @for (r of u.roles; track r) {
                  <p-tag [value]="r"
                         [severity]="r === 'ADMIN' ? 'danger' : 'info'"
                         styleClass="mr-2" />
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private admin: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.admin.listUsers().subscribe({
      next: (u) => {
        this.users.set(u);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.status === 403 ? 'Accès refusé' : 'Erreur de chargement'
        );
        this.loading.set(false);
      }
    });
  }

  back(): void {
    this.router.navigateByUrl('/chat');
  }
}
