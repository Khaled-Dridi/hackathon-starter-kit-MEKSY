# starter — repo guide

Greenfield monorepo : Quarkus 3.28 backend + Angular 20 frontend, orchestré
par docker compose. Auth JWT maison, LangChain4j pour le LLM (OpenAI).

## Layout

```
starter/
├── backend/        Quarkus 3.28 / Java 17 / LangChain4j (com.inetum.starter)
├── frontend/       Angular 20 standalone + PrimeNG
├── infra/          docker compose (prod-like + override dev)
└── CLAUDE.md       (ce fichier)
```

## Services compose

| service  | image           | port host | rôle                                    |
|----------|-----------------|-----------|-----------------------------------------|
| postgres | postgres:16-alp | 5432      | DB principale, volume `postgres-data`   |
| backend  | build local     | 8080      | API REST + JWT + LangChain4j            |
| frontend | nginx (prod)    | 4200      | SPA Angular 20 (proxy /api -> backend)  |

DB : `inetum` (user/pass identiques, override via `infra/.env`).
JWT : clé RSA générée au scaffold dans `backend/src/main/resources/`
(`privateKey.pem`/`publicKey.pem`, gitignorées).

## Commandes dev (en priorité)

```bash
# 1) Cycle dev rapide (live reload back + front, bind-mounts)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up

# 2) Prod-like (rebuild des images, comme un déploiement)
docker compose -f infra/docker-compose.yml up -d --build

# 3) Arrêt + nettoyage volumes
docker compose -f infra/docker-compose.yml down -v
```

Backend hors docker : `cd backend && mvn quarkus:dev`
Frontend hors docker : `cd frontend && npm start`

Default dev user (seed automatique sur profil dev) :
**`admin@local` / `admin`** (rôles `ADMIN`, `USER`).

## Pièges connus

- **macOS / Windows + bind-mount** : Angular CLI utilise chokidar, qui rate
  les events sur volume monté. Le `--poll 1000` dans le compose dev est
  obligatoire. Sinon, le frontend ne rebuild pas quand tu édites.
- **Première exécution lente** : `mvn quarkus:dev` télécharge ~250 MB de
  deps Quarkus, `npm ci` ~400 MB. Volume nommé `maven-cache` / `node-modules`
  persiste entre runs : les suivantes sont rapides.
- **Hot reload Quarkus** : surveille via `http://localhost:8080/q/dev/`
  (Dev UI). Force un rebuild côté Quarkus avec un simple appel HTTP sur
  n'importe quelle route, ou via la Dev UI.
- **API path** : front appelle toujours `/api/...` (dev = proxy `ng serve`,
  prod = proxy nginx). CORS Quarkus reste activé pour `localhost:4200` au
  cas où tu veuilles appeler directement `:8080` depuis le navigateur.
- **Pas de i18n** : `@angular/localize` n'est pas installé. Si tu ajoutes
  des langues plus tard, installe explicitement.

## Sub-CLAUDE.md

- [`backend/CLAUDE.md`](backend/CLAUDE.md) — conventions Java/Quarkus
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — conventions Angular/PrimeNG

## Commits

Conventional Commits stricts :
- `feat(scope): ...` — nouvelle feature
- `fix(scope): resolve #NN - ...` — bug fix avec issue
- `chore(scope): ...` — outillage, build, deps
- `refactor(scope): ...`
- `test(scope): ...`
- `docs(scope): ...`

Une feature = un commit. Pas de "WIP" dans `main`.

**Pas de trailer `Co-Authored-By:`** dans les messages de commit (y compris
`Co-Authored-By: Claude …`). Auteur unique = celui configuré dans
`git config user.email`. Les outils d'IA ne doivent pas ajouter de
co-auteur même si c'est leur comportement par défaut.
