package com.inetum.starter.events;

import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

import java.util.Set;
import java.util.UUID;

/**
 * Live event stream over Server-Sent Events.
 *
 * <h3>Why this endpoint is {@code @PermitAll}</h3>
 * The browser's native {@code EventSource} cannot set custom request
 * headers, so we cannot rely on the standard {@code Authorization: Bearer}
 * header for SSE. The client passes the JWT in a {@code ?token=} query
 * parameter and we validate it manually with {@link JWTParser}. If the
 * token is missing or invalid we close the response with 401 immediately;
 * if it is valid we register a {@link Subscriber} in the {@link EventBus}.
 *
 * <h3>Why the query param is acceptable here</h3>
 * The frontend is served from the same origin as the API, JWTs are
 * short-lived (1h), the URL is requested by the browser (not typed by
 * humans), and SSE responses themselves are cacheless. Access logs may
 * record the token — that's the documented trade-off.
 */
@Path("/events")
@ApplicationScoped
@PermitAll
@RequiredArgsConstructor
public class EventResource {

    private static final Logger LOG = Logger.getLogger(EventResource.class);

    private final EventBus eventBus;
    private final JWTParser jwtParser;

    @GET
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public void stream(@QueryParam("token") String token,
                       @Context Sse sse,
                       @Context SseEventSink sink) {
        if (token == null || token.isBlank()) {
            sink.close();
            throw new WebApplicationException("missing token", Response.Status.UNAUTHORIZED);
        }

        JsonWebToken jwt;
        try {
            jwt = jwtParser.parse(token);
        } catch (ParseException e) {
            LOG.debugf("Rejected SSE connection: invalid token (%s)", e.getMessage());
            sink.close();
            throw new WebApplicationException("invalid token", Response.Status.UNAUTHORIZED);
        }

        Long userId;
        try {
            userId = Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException e) {
            sink.close();
            throw new WebApplicationException("bad subject", Response.Status.UNAUTHORIZED);
        }

        Set<String> roles = jwt.getGroups() == null ? Set.of() : Set.copyOf(jwt.getGroups());
        var subscriber = new Subscriber(UUID.randomUUID(), userId, roles, sink, sse);
        eventBus.subscribe(subscriber);

        // Send a hello so the client knows the stream is live; lets us also
        // confirm everything end-to-end in the browser dev tools.
        try {
            var hello = sse.newEventBuilder()
                    .name("hello")
                    .mediaType(MediaType.APPLICATION_JSON_TYPE)
                    .data(java.util.Map.class, java.util.Map.of(
                            "userId", userId,
                            "roles", roles))
                    .build();
            sink.send(hello);
        } catch (Exception ignore) { /* sink already closing */ }

        // Open the stream with a comment line so proxies don't buffer waiting
        // for the first event. The 25s heartbeat in EventBus keeps it warm,
        // and both the heartbeat and the fan-out path check sink.isClosed()
        // and evict dead subscribers — no extra cleanup thread needed.
        try {
            sink.send(sse.newEventBuilder().comment("connected").build());
        } catch (Exception ignore) { /* sink already closing */ }
    }
}
