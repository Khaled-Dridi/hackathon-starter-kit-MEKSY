package com.inetum.starter.auth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordHasherTest {

    private final PasswordHasher hasher = new PasswordHasher();

    @Test
    void hash_produces_bcrypt_format() {
        String hash = hasher.hash("secret");
        assertThat(hash).startsWith("$2a$").hasSizeGreaterThanOrEqualTo(59);
    }

    @Test
    void matches_returns_true_for_correct_password() {
        String hash = hasher.hash("hello");
        assertThat(hasher.matches("hello", hash)).isTrue();
    }

    @Test
    void matches_returns_false_for_wrong_password() {
        String hash = hasher.hash("hello");
        assertThat(hasher.matches("world", hash)).isFalse();
    }

    @Test
    void matches_returns_false_for_null_inputs() {
        assertThat(hasher.matches(null, "hash")).isFalse();
        assertThat(hasher.matches("raw", null)).isFalse();
    }
}
