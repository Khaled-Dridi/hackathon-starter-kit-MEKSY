import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { requireRole } from './core/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'actions' },
      {
        path: 'actions',
        loadComponent: () =>
          import('./features/actions/actions-list.component').then(
            (m) => m.ActionsListComponent
          )
      },
      {
        path: 'actions/:id',
        loadComponent: () =>
          import('./features/actions/action-detail.component').then(
            (m) => m.ActionDetailComponent
          )
      },
      {
        path: 'propose',
        loadComponent: () =>
          import('./features/propose/propose.component').then((m) => m.ProposeComponent)
      },
      {
        path: 'admin/actions',
        canActivate: [requireRole('ADMIN')],
        loadComponent: () =>
          import('./features/admin/admin-actions.component').then(
            (m) => m.AdminActionsComponent
          )
      },
      {
        path: 'admin/actions/new',
        canActivate: [requireRole('ADMIN')],
        loadComponent: () =>
          import('./features/admin/admin-action-form.component').then(
            (m) => m.AdminActionFormComponent
          )
      },
      {
        path: 'admin/actions/:id/edit',
        canActivate: [requireRole('ADMIN')],
        loadComponent: () =>
          import('./features/admin/admin-action-form.component').then(
            (m) => m.AdminActionFormComponent
          )
      },
      {
        path: 'admin/proposals',
        canActivate: [requireRole('ADMIN')],
        loadComponent: () =>
          import('./features/admin/admin-proposals.component').then(
            (m) => m.AdminProposalsComponent
          )
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat.component').then((m) => m.ChatComponent)
      },
      {
        path: 'admin/users',
        canActivate: [requireRole('ADMIN')],
        loadComponent: () =>
          import('./features/admin/admin-users.component').then(
            (m) => m.AdminUsersComponent
          )
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
