# backend — Quarkus guide

Package racine : `com.inetum.starter`.

## Stack

| couche       | outil                                                    |
|--------------|----------------------------------------------------------|
| build        | Maven 3.9, Java 17 (release 17 dans `pom.xml`)           |
| framework    | Quarkus 3.28.4 (BOM)                                     |
| persistence  | Hibernate ORM + Panache + Flyway + PostgreSQL 16         |
| REST         | RESTEasy Reactive (`quarkus-rest`, `quarkus-rest-jackson`)|
| validation   | hibernate-validator (jakarta.validation)                 |
| mapping      | MapStruct 1.5.5 (`jakarta-cdi`)                          |
| auth         | smallrye-jwt + elytron-security-common + at.favre bcrypt |
| LLM          | quarkus-langchain4j-openai 1.0.0 (`@RegisterAiService`)  |
| tests        | JUnit 5, AssertJ, Mockito, Quarkus Test (Testcontainers) |

## Package layout

```
com.inetum.starter.
├── api.rest.exception        ExceptionHandler (ExceptionMapper<Throwable>)
├── auth                      LoginResource, JwtService, PasswordHasher
├── config                    BootstrapService (seed dev), AppConfig
├── dto.{request,response,mapper}
├── entity                    UserEntity, Role (enum)
├── exception                 AppException + concretes
├── repository                UserRepository (PanacheRepository)
├── service.<domaine>         UserService
├── service.ai                AiAssistant + AiResource
└── util                      (vide pour l'instant)
```

## Style — règles non négociables

- **CDI uniquement** : `@ApplicationScoped`, `@Inject`. Jamais `@Autowired`,
  jamais `javax.*`, jamais `ResponseEntity`.
- **Injection par constructeur**, champs `final`. Lombok
  `@RequiredArgsConstructor` suffit (Arc auto-détecte le constructeur).
- **DTOs** : `@Data` en `XxxDTO`, séparés en `dto.request` / `dto.response`.
- **Entities** : `@Getter`/`@Setter` (pas `@Data`), `@PrePersist`/`@PreUpdate`
  pour `createdAt`/`updatedAt`.
- **Records** pour les carriers immuables (pas pour les entities).
- **Logger** : `org.jboss.logging.Logger` (`LOG.debugf("…%s", x)`).
  Jamais logger : mots de passe, tokens, prompts LLM, réponses LLM, API keys.
- **Suffixes** : `Resource | Service | Repository | Entity | DTO | Mapper |
  Config | Provider | Handler | Validator | Util(s) | Test`.

## REST & persistence

- Toutes les méthodes resource renvoient `RestResponse<T>`.
- 201 sur create, 204 sur delete, 200 sinon.
- `@Valid` sur tous les inputs.
- `@Transactional` sur les services qui écrivent (jamais sur la resource).
- Pas de logique métier dans la resource : juste validation + appel service.

## Exceptions

- Hiérarchie sous `exception/`, racine `AppException` (status + code).
- Mapping centralisé : [`ExceptionHandler`](src/main/java/com/inetum/starter/api/rest/exception/ExceptionHandler.java)
  (un seul `ExceptionMapper<Throwable>`).
- Body d'erreur : `ErrorResponseDTO { status, code, message }`.
- Ne jamais leaker stack traces ni détails internes au client.

## Tests

- Nom de classe : `{ClassName}Test` (jamais `IT`).
- Méthodes en phrases descriptives (snake ou camelCase) :
  `matches_returns_false_for_wrong_password()`.
- AssertJ fluent partout : `assertThat(x).isEqualTo(y)`.
- Quarkus tests : `@QuarkusTest`. Tests d'intégration → Testcontainers
  Postgres (déjà configuré via dev-services).
- Commande complète :
  ```bash
  mvn test -Dquarkus.arc.detect-wrong-annotations=false \
      -DargLine="--add-opens java.base/java.lang=ALL-UNNAMED"
  ```
  (déjà inscrit dans le pom via le surefire-plugin).

## Migrations Flyway

- Fichiers : `src/main/resources/db/migration/V{n}__{snake}.sql`.
- **Ne jamais modifier une migration appliquée** (V1, V2, ...). Toujours
  ajouter une nouvelle version.
- `quarkus.flyway.migrate-at-start=true` : Quarkus migre au démarrage.

## LangChain4j

- Interface déclarative `@RegisterAiService` (voir
  [`AiAssistant`](src/main/java/com/inetum/starter/service/ai/AiAssistant.java)).
- **Jamais** de wiring HTTP manuel vers OpenAI, jamais d'OkHttp custom.
- API key + nom de modèle via env :
  - `QUARKUS_LANGCHAIN4J_OPENAI_API_KEY`
  - `QUARKUS_LANGCHAIN4J_OPENAI_CHAT_MODEL_MODEL_NAME` (défaut `gpt-4o-mini`)
- `log-requests=false` et `log-responses=false` dans `application.properties` :
  **ne jamais** logger prompts ni completions, même en dev.
- Changer de provider (Ollama, Anthropic, Mistral) : remplacer le module
  `quarkus-langchain4j-openai` par `quarkus-langchain4j-<provider>` et
  ajuster les props `quarkus.langchain4j.<provider>.*`. L'interface
  `@RegisterAiService` est inchangée.

## JWT

- Clés RSA générées au scaffold dans `src/main/resources/{privateKey,publicKey}.pem`.
- Gitignorées. En prod : monter via volume secret ou variable d'env
  (`smallrye.jwt.sign.key.location` accepte un chemin absolu).
- Issuer : `https://starter.inetum/issuer` (cf. `application.properties`).
- TTL : `app.auth.token-ttl-seconds=3600` (1h).
- Resources protégées : `@RolesAllowed({"USER", "ADMIN"})`.
- Login resource : `@PermitAll`.

## Commits

`feat(backend): ...`, `fix(backend): resolve #NN - ...`,
`chore(backend): bump quarkus to 3.28.5`, etc.

## What not to do

- **Pas** de Spring (`@Autowired`, `@Service`, `@RestController`, `ResponseEntity`).
- **Pas** de YAML (`application.yml`). Un seul `application.properties` avec
  profils `%dev.` / `%test.` / `%prod.`.
- **Pas** de `javax.*` (tout est `jakarta.*` depuis Quarkus 3).
- **Pas** de SSO/OIDC/Keycloak/SAML. Auth = JWT signé localement.
- **Pas** de logging de payloads sensibles (mots de passe, tokens,
  prompts, completions, API keys).
- **Pas** de wiring HTTP manuel vers le LLM.
- **Pas** de mapping DTO manuel quand MapStruct convient.
- **Pas** d'amendement d'une migration Flyway déjà appliquée.
- **Pas** de commentaires qui paraphrasent le code (WHY only).
