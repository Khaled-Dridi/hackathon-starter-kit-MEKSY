package com.inetum.starter.actions;

import com.inetum.starter.service.FeedService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

/**
 * Comment-by-id operations (currently just delete). Lives in its own
 * class so the routing root is unambiguous.
 */
@Path("/comments/{commentId}")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class CommentResource {

    private final FeedService feedService;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    private boolean isAdmin() {
        return jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");
    }

    @DELETE
    public RestResponse<Void> delete(@RestPath Long commentId) {
        feedService.deleteComment(commentId, currentUserId(), isAdmin());
        return RestResponse.noContent();
    }
}
