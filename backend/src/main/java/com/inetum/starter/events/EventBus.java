package com.inetum.starter.events;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.event.TransactionPhase;
import jakarta.ws.rs.sse.OutboundSseEvent;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory pub/sub fanning {@link DomainEvent}s to live SSE subscribers.
 *
 * <h3>Why in-memory</h3>
 * This is a single-instance deployment for the hackathon scope. If the app
 * ever scales horizontally, this class is the single seam to swap out for a
 * Redis/NATS-backed broker — the public API ({@link #subscribe},
 * {@link #unsubscribe}, and the {@link #onCommit} observer) stays the same.
 *
 * <h3>Delivery semantics</h3>
 * Observer is wired to {@link TransactionPhase#AFTER_SUCCESS} so events are
 * only fanned out after the database transaction that produced them commits.
 * That avoids broadcasting state the database doesn't actually have.
 *
 * <h3>Audience rules</h3>
 * <ul>
 *   <li>{@code proposal.*} → admins + the proposal's author</li>
 *   <li>{@code registration.*} → the registered user + admins
 *       (everyone else only learns via the matching {@code action.seats.changed})</li>
 *   <li>everything else → everyone connected</li>
 * </ul>
 */
@ApplicationScoped
public class EventBus {

    private static final Logger LOG = Logger.getLogger(EventBus.class);

    private final ConcurrentHashMap<UUID, Subscriber> subscribers = new ConcurrentHashMap<>();

    public Subscriber subscribe(Subscriber s) {
        subscribers.put(s.id(), s);
        LOG.debugf("SSE subscriber added id=%s userId=%s roles=%s total=%d",
                s.id(), s.userId(), s.roles(), subscribers.size());
        return s;
    }

    public void unsubscribe(UUID id) {
        var removed = subscribers.remove(id);
        if (removed != null) {
            LOG.debugf("SSE subscriber removed id=%s userId=%s total=%d",
                    id, removed.userId(), subscribers.size());
        }
    }

    public int size() {
        return subscribers.size();
    }

    /**
     * Fan-out observer. Services fire {@code Event<DomainEvent>.fire(...)}
     * inside their transactions; CDI calls this method only after the
     * transaction commits, so subscribers never see uncommitted state.
     */
    void onCommit(@Observes(during = TransactionPhase.AFTER_SUCCESS) DomainEvent event) {
        LOG.debugf("dispatch type=%s actionId=%s userId=%s subscribers=%d",
                event.type(), event.actionId(), event.userId(), subscribers.size());
        for (Subscriber sub : subscribers.values()) {
            if (!shouldReceive(sub, event)) continue;
            send(sub, event);
        }
    }

    private static boolean shouldReceive(Subscriber sub, DomainEvent event) {
        String t = event.type();
        if (t.startsWith("proposal.")) {
            // admins always see proposals; author also sees their own
            return sub.isAdmin() || matchesUser(sub, event.userId());
        }
        if (t.startsWith("registration.")) {
            return sub.isAdmin() || matchesUser(sub, event.userId());
        }
        // action.* → broadcast
        return true;
    }

    private static boolean matchesUser(Subscriber sub, Long eventUserId) {
        return eventUserId != null && eventUserId.equals(sub.userId());
    }

    private void send(Subscriber sub, DomainEvent event) {
        if (sub.sink().isClosed()) {
            unsubscribe(sub.id());
            return;
        }
        try {
            // HashMap (not Map.of) — actionId / userId can be null for some
            // event types (e.g. proposal.created has no actionId) and Map.of
            // throws NPE on null values.
            var data = new java.util.HashMap<String, Object>();
            data.put("id", event.id().toString());
            data.put("type", event.type());
            data.put("at", event.at().toString());
            data.put("actionId", event.actionId());
            data.put("userId", event.userId());
            data.put("payload", event.payload());
            OutboundSseEvent out = sub.sse().newEventBuilder()
                    .id(event.id().toString())
                    .name(event.type())
                    .mediaType(jakarta.ws.rs.core.MediaType.APPLICATION_JSON_TYPE)
                    .data(Map.class, data)
                    .build();
            sub.sink().send(out).whenComplete((res, ex) -> {
                if (ex != null) {
                    LOG.debugf(ex, "SSE send failed, dropping subscriber id=%s", sub.id());
                    unsubscribe(sub.id());
                }
            });
        } catch (Exception e) {
            LOG.debugf(e, "SSE send threw, dropping subscriber id=%s", sub.id());
            unsubscribe(sub.id());
        }
    }

    /**
     * Heartbeat keeps the connection alive through reverse proxies and lets
     * the browser notice broken pipes faster. Fires every 25s. Comments
     * (lines beginning with ":") are valid SSE noise that the EventSource
     * client silently ignores.
     */
    @Scheduled(every = "25s")
    void heartbeat() {
        if (subscribers.isEmpty()) return;
        for (Subscriber sub : subscribers.values()) {
            if (sub.sink().isClosed()) {
                unsubscribe(sub.id());
                continue;
            }
            try {
                OutboundSseEvent ping = sub.sse().newEventBuilder()
                        .comment("ping")
                        .build();
                sub.sink().send(ping);
            } catch (Exception e) {
                unsubscribe(sub.id());
            }
        }
    }
}
