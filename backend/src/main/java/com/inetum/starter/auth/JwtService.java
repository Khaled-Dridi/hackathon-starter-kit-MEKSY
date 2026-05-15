package com.inetum.starter.auth;

import com.inetum.starter.entity.UserEntity;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;
import java.util.stream.Collectors;

@ApplicationScoped
public class JwtService {

    private final String issuer;
    private final long ttlSeconds;

    @Inject
    public JwtService(
            @ConfigProperty(name = "mp.jwt.verify.issuer") String issuer,
            @ConfigProperty(name = "app.auth.token-ttl-seconds") long ttlSeconds) {
        this.issuer = issuer;
        this.ttlSeconds = ttlSeconds;
    }

    public String issue(UserEntity user) {
        return Jwt.issuer(issuer)
                .upn(user.getEmail())
                .subject(String.valueOf(user.getId()))
                .groups(user.getRoles().stream().map(Enum::name).collect(Collectors.toSet()))
                .expiresIn(Duration.ofSeconds(ttlSeconds))
                .sign();
    }

    public long getTtlSeconds() {
        return ttlSeconds;
    }
}
