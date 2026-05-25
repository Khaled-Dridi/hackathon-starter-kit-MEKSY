package com.inetum.starter.events;

import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;

import java.util.Set;
import java.util.UUID;

/**
 * One live SSE connection. Created in {@link EventResource} after JWT
 * validation, registered in {@link EventBus}, removed when the sink closes.
 */
public record Subscriber(
        UUID id,
        Long userId,
        Set<String> roles,
        SseEventSink sink,
        Sse sse) {

    public boolean isAdmin() {
        return roles != null && roles.contains("ADMIN");
    }
}
