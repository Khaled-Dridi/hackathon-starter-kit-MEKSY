# syntax=docker/dockerfile:1.7
# Stage 1: build with Maven (cache /root/.m2 via BuildKit)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

# Stage 2: runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /build/target/quarkus-app/lib/      ./lib/
COPY --from=build /build/target/quarkus-app/*.jar     ./
COPY --from=build /build/target/quarkus-app/app/      ./app/
COPY --from=build /build/target/quarkus-app/quarkus/  ./quarkus/

EXPOSE 8080
CMD ["java", "-jar", "quarkus-run.jar"]
