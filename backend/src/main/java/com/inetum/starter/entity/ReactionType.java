package com.inetum.starter.entity;

/**
 * The fixed set of emoji reactions a user can leave on a post.
 * Mirrors the Facebook / MS Teams set so users have an instinctive
 * mental model.
 */
public enum ReactionType {
    LIKE,   // 👍
    LOVE,   // ❤️
    HAHA,   // 😂
    WOW,    // 😮
    SAD,    // 😢
    ANGRY;  // 😡

    /** DB stores lowercase strings (see V7 migration's CHECK constraint). */
    public String dbValue() {
        return name().toLowerCase();
    }

    public static ReactionType fromDbValue(String v) {
        return ReactionType.valueOf(v.toUpperCase());
    }
}
