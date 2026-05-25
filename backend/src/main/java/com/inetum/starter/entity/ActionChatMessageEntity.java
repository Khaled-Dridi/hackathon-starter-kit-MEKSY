package com.inetum.starter.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A single message on an action's private chat channel. Text-only —
 * media-rich content lives on the discussion wall instead.
 *
 * <p>The class is prefixed {@code ActionChatMessage} (and the table
 * {@code action_chat_messages}) to avoid collision with the existing
 * AI-assistant {@link ChatMessageEntity} which already owns the
 * {@code chat_messages} table.
 */
@Entity
@Table(name = "action_chat_messages")
@Getter
@Setter
@NoArgsConstructor
public class ActionChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action_id", nullable = false)
    private Long actionId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
