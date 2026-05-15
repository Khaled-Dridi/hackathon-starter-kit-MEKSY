# frontend — Angular 20 guide

Angular 20 standalone + signals + PrimeNG. **Aucune autre lib UI.**
Aucune lib de state management.

## Stack

| couche      | outil                                                  |
|-------------|--------------------------------------------------------|
| framework   | Angular 20 (standalone components, signals)            |
| UI          | PrimeNG 20 + `@primeng/themes` (preset Aura)           |
| icônes      | primeicons (classes `pi pi-*`)                         |
| HTTP        | `HttpClient` natif + `HttpInterceptorFn` (Bearer JWT)  |
| router      | `@angular/router` (loadComponent + CanActivateFn)      |
| tests       | Karma + Jasmine                                        |
| build       | `@angular/build` (Vite-based, Angular 17+)             |

**Pas de** : NgRx, NgXs, Akita, Material, Bootstrap, Tailwind, MUI,
`@angular/localize`, ni aucune autre lib UI ou state.

## Layout `src/app/`

```
src/app/
├── core/                     services cross-cutting
│   ├── auth.service.ts       login, logout, getToken (signal)
│   ├── auth.guard.ts         CanActivateFn (redirige vers /login)
│   ├── http.interceptor.ts   ajoute Authorization Bearer, gère 401
│   ├── api.service.ts        (placeholder pour appels REST génériques)
│   └── ai.service.ts         POST /ai/chat
├── features/
│   ├── login/                écran login
│   └── chat/                 écran de démo LLM
├── shared/                   composants PrimeNG réutilisables
├── app.component.ts          racine (juste un <router-outlet>)
├── app.config.ts             providers : router, HttpClient, PrimeNG, animations
└── app.routes.ts             /login, /chat (guarded), default -> /chat
```

## État

- **Signals only** pour l'état UI local (`signal()`, `computed()`).
- **Services Injectable + signals** pour l'état partagé (`AuthService.token`
  est un signal).
- Pas de store global, pas de NgRx, pas de RxJS BehaviorSubject sauf si
  strictement nécessaire.

## Icônes

- Toujours utiliser les classes PrimeNG : `pi pi-sign-in`, `pi pi-send`,
  `pi pi-sign-out`, etc.
- **Jamais** d'emoji dans les templates ni dans les classes CSS.
- Liste : https://primeng.org/icons

## JWT & API

- Token stocké en `localStorage` (clé `starter.jwt`).
- `authInterceptor` ajoute automatiquement `Authorization: Bearer <token>`
  sur toute requête HTTP.
- Sur 401, l'interceptor force `logout()` + redirige vers `/login`.
- `environment.apiUrl = '/api'` partout (dev + prod) :
  - **dev** : `ng serve` proxie `/api/*` → `http://localhost:8080/*` via
    [`proxy.conf.json`](proxy.conf.json) (CORS contourné, même origine)
  - **prod** : `nginx.conf` proxie `/api/` → `http://backend:8080/`
- File replacement `environment.ts` ↔ `environment.prod.ts` géré par
  `angular.json` (juste un flag `production` pour l'instant ; deux fichiers
  pour garder l'option future).

## i18n

- **Pas de i18n configurée.** `@angular/localize` n'est pas installé.
- Tous les textes sont en français dans les templates.
- Si tu veux ajouter du i18n plus tard :
  ```bash
  ng add @angular/localize
  ```
  et reconfigurer `angular.json`.

## Composants

- Standalone systématiquement (`standalone: true`).
- Imports explicites des modules/composants PrimeNG utilisés.
- Préférer les nouveaux control-flow blocks (`@if`, `@for`, `@switch`) aux
  directives structurelles `*ngIf` / `*ngFor`.
- Templates inline pour les petits composants ; `templateUrl` au-delà de
  ~40 lignes.

## Tests

- Karma + Jasmine pour les unit tests.
- Fichiers `.spec.ts` à côté du composant testé.
- `ng test` (mode watch) ou `ng test --watch=false` (CI).
- Pas de E2E configuré (Playwright optionnel à ajouter plus tard).

## Build

```bash
npm start              # dev server, hot reload, port 4200
npm run build          # build prod (output dist/starter-frontend/browser/)
npm test               # karma watch
```

Le Dockerfile multistage produit l'image nginx finale (port 80, exposé en
4200 côté host via compose).

## What not to do

- **Pas** d'autre lib UI que PrimeNG.
- **Pas** de state management externe (NgRx, NgXs, Akita, etc.).
- **Pas** d'emoji ; uniquement icônes `pi-*`.
- **Pas** de NgModules (tout en standalone components).
- **Pas** d'appel HTTP avec `fetch()` ou `axios` ; utiliser `HttpClient`.
- **Pas** de manipulation directe du DOM (`document.querySelector`).
  Passer par signals + bindings.
- **Pas** de token JWT dans des cookies sans `Secure + HttpOnly + SameSite`
  (le starter utilise `localStorage` ; à durcir en prod si nécessaire).
- **Pas** de commentaires qui paraphrasent le code (WHY only).
