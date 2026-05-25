package com.inetum.starter.actions;

import com.inetum.starter.dto.request.CommentRequestDTO;
import com.inetum.starter.dto.request.PostRequestDTO;
import com.inetum.starter.dto.request.ReactionRequestDTO;
import com.inetum.starter.dto.response.CommentResponseDTO;
import com.inetum.starter.dto.response.PostResponseDTO;
import com.inetum.starter.service.FeedService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;

/**
 * Posts attached to an action's discussion wall.
 * <p>
 * Split from {@link CommentResource} and {@link ReactionResource} so each
 * class's {@code @Path} has a single, well-scoped root — JAX-RS routes
 * resources by class-level path, so mixing /actions/X/posts and /posts/X
 * under one class confuses the matcher.
 */
@Path("/actions/{actionId}/posts")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class PostResource {

    private final FeedService feedService;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    @GET
    public RestResponse<List<PostResponseDTO>> list(@RestPath Long actionId) {
        return RestResponse.ok(feedService.listForAction(actionId, currentUserId()));
    }

    @POST
    public RestResponse<PostResponseDTO> create(@RestPath Long actionId,
                                                @Valid PostRequestDTO body) {
        var post = feedService.createPost(
                actionId, currentUserId(), body.getBody(),
                body.getMediaUrl(), body.getMediaType());
        // Re-hydrate the row through the listing pipeline so the response
        // carries author email + (initial empty) reactions + (empty) comments
        // in the same shape as GET. For a hackathon feed this is fine.
        var dto = feedService.listForAction(actionId, currentUserId()).stream()
                .filter(p -> p.getId().equals(post.getId()))
                .findFirst()
                .orElseThrow();
        return RestResponse.status(RestResponse.Status.CREATED, dto);
    }
}
