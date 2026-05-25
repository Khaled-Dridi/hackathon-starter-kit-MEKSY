package com.inetum.starter.actions;

import com.inetum.starter.dto.request.CommentRequestDTO;
import com.inetum.starter.dto.request.ReactionRequestDTO;
import com.inetum.starter.dto.response.CommentResponseDTO;
import com.inetum.starter.service.FeedService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

/**
 * Operations on an existing post: delete, add comment, set/clear my reaction.
 * All rooted at {@code /posts/{postId}}.
 */
@Path("/posts/{postId}")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class PostOpsResource {

    private final FeedService feedService;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    private boolean isAdmin() {
        return jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");
    }

    @DELETE
    public RestResponse<Void> delete(@RestPath Long postId) {
        feedService.deletePost(postId, currentUserId(), isAdmin());
        return RestResponse.noContent();
    }

    @POST
    @Path("/comments")
    public RestResponse<CommentResponseDTO> addComment(@RestPath Long postId,
                                                       @Valid CommentRequestDTO body) {
        var c = feedService.createComment(postId, currentUserId(), body.getBody());
        return RestResponse.status(RestResponse.Status.CREATED,
                new CommentResponseDTO(c.getId(), c.getPostId(), c.getUserId(),
                        jwt.getName(), c.getBody(), c.getCreatedAt()));
    }

    @PUT
    @Path("/my-reaction")
    public RestResponse<Void> setReaction(@RestPath Long postId,
                                          @Valid ReactionRequestDTO body) {
        feedService.setReaction(postId, currentUserId(), body.getReaction());
        return RestResponse.noContent();
    }

    @DELETE
    @Path("/my-reaction")
    public RestResponse<Void> clearReaction(@RestPath Long postId) {
        feedService.clearReaction(postId, currentUserId());
        return RestResponse.noContent();
    }
}
