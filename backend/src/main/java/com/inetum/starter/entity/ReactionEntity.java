package com.inetum.starter.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * One reaction per user per post (the composite primary key enforces it).
 * Picking a different emoji is implemented as a replace at the service
 * level, not an insert — the row's id is fixed by (postId, userId).
 *
 * <p>The {@code reaction} column stores the lowercase {@link ReactionType}
 * name (see V7's CHECK constraint). Using a plain VARCHAR with check
 * constraint rather than a JPA enum keeps the SQL human-readable.
 */
@Entity
@Table(name = "reactions")
@Getter
@Setter
@NoArgsConstructor
public class ReactionEntity {

    @EmbeddedId
    private ReactionId id;

    @Column(nullable = false, length = 20)
    private String reaction;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }

    /** Composite primary key. */
    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class ReactionId implements Serializable {
        @Column(name = "post_id", nullable = false)
        private Long postId;

        @Column(name = "user_id", nullable = false)
        private Long userId;
    }
}
