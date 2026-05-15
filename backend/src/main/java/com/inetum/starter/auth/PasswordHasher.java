package com.inetum.starter.auth;

import at.favre.lib.crypto.bcrypt.BCrypt;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PasswordHasher {

    private static final int COST = 10;

    public String hash(String raw) {
        return BCrypt.withDefaults().hashToString(COST, raw.toCharArray());
    }

    public boolean matches(String raw, String hash) {
        if (raw == null || hash == null) return false;
        return BCrypt.verifyer().verify(raw.toCharArray(), hash).verified;
    }
}
