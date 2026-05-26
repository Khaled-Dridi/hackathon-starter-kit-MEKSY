# syntax=docker/dockerfile:1.7
#
# Production Dockerfile for the Charity Day backend.
# Used by both local prod compose (infra/docker-compose.yml) and Render.
#
# Stage 1: build with Maven (cache /root/.m2 via BuildKit).
# We also generate a fresh JWT keypair here because the real keys are
# gitignored (backend/src/main/resources/private|publicKey.pem). A per-build
# keypair is fine: JWTs are short-lived (1h TTL) and we don't have any
# tokens to preserve across deploys.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline

COPY src ./src

# Generate the JWT keypair into the resources tree so it gets packaged into
# the runtime JAR. smallrye-jwt reads `publicKey.pem` / `privateKey.pem`
# from the classpath at boot.
RUN mkdir -p src/main/resources && \
    openssl genrsa -out src/main/resources/privateKey.pem 2048 && \
    openssl rsa  -in src/main/resources/privateKey.pem -pubout \
                 -out src/main/resources/publicKey.pem

RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

# Stage 2: slim runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /build/target/quarkus-app/lib/      ./lib/
COPY --from=build /build/target/quarkus-app/*.jar     ./
COPY --from=build /build/target/quarkus-app/app/      ./app/
COPY --from=build /build/target/quarkus-app/quarkus/  ./quarkus/

EXPOSE 8080
# Cap heap to fit comfortably in Render's free 512MB tier
# (-Xmx384m leaves headroom for off-heap, native lib, code cache).
CMD ["java", "-Xmx384m", "-Xms192m", "-jar", "quarkus-run.jar"]
