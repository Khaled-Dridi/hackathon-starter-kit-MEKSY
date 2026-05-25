package com.inetum.starter.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Internal domain event published by services and fanned out to SSE
 * subscribers via {@link EventBus}.
 *
 * <p>Stays deliberately small and JSON-friendly: a stable {@code type}
 * string, an optional {@code actionId} (used by the SSE delivery layer to
 * decide which subscribers care), an optional {@code userId} (used to scope
 * personal events like a user's own registration), and a free-form
 * {@code payload} map that the frontend can read for context. Audience is
 * computed by {@link EventBus} from {@code type} + {@code userId}.
 *
 * <p>Examples:
 * <ul>
 *   <li>{@code action.created}        — audience: everyone</li>
 *   <li>{@code action.updated}        — audience: everyone</li>
 *   <li>{@code action.closed}         — audience: everyone</li>
 *   <li>{@code action.deleted}        — audience: everyone</li>
 *   <li>{@code action.seats.changed}  — audience: everyone (registration count moved)</li>
 *   <li>{@code registration.created}  — audience: the user + admins</li>
 *   <li>{@code registration.cancelled}— audience: the user + admins</li>
 *   <li>{@code proposal.created}      — audience: admins (the author already knows)</li>
 *   <li>{@code proposal.status.changed} — audience: admins + the author</li>
 * </ul>
 */
public record DomainEvent(
        UUID id,
        String type,
        Instant at,
        Long actionId,
        Long userId,
        Map<String, Object> payload) {

    public static DomainEvent of(String type, Long actionId, Long userId, Map<String, Object> payload) {
        return new DomainEvent(
                UUID.randomUUID(),
                type,
                Instant.now(),
                actionId,
                userId,
                payload == null ? Map.of() : Map.copyOf(payload));
    }

    public static DomainEvent action(String type, Long actionId, Map<String, Object> payload) {
        return of(type, actionId, null, payload);
    }

    public static DomainEvent userScoped(String type, Long actionId, Long userId, Map<String, Object> payload) {
        return of(type, actionId, userId, payload);
    }
}
