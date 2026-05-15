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
      { path: '', pathMatch: 'full', redirectTo: 'notes' },
      {
        path: 'notes',
        loadComponent: () =>
          import('./features/notes/notes.component').then((m) => m.NotesComponent)
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
