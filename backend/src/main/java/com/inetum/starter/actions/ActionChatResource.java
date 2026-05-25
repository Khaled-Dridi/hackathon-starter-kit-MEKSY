package com.inetum.starter.actions;

import com.inetum.starter.dto.request.ChatMessageRequestDTO;
import com.inetum.starter.dto.response.ChatMessageResponseDTO;
import com.inetum.starter.service.ActionChatService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;

/**
 * Per-action private chat. Both list and send enforce "must be
 * registered for this action OR admin" in the service layer; this
 * resource just wires HTTP to that logic.
 */
@Path("/actions/{actionId}/chat")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class ActionChatResource {

    private final ActionChatService chatService;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    private boolean isAdmin() {
        return jwt.getGroups() != null && jwt.getGroups().contains("ADMIN");
    }

    @GET
    public RestResponse<List<ChatMessageResponseDTO>> list(@RestPath Long actionId) {
        return RestResponse.ok(chatService.listForAction(actionId, currentUserId(), isAdmin()));
    }

    @POST
    public RestResponse<ChatMessageResponseDTO> send(@RestPath Long actionId,
                                                     @Valid ChatMessageRequestDTO body) {
        var msg = chatService.send(actionId, currentUserId(), body.getBody(), isAdmin());
        return RestResponse.status(RestResponse.Status.CREATED,
                new ChatMessageResponseDTO(
                        msg.getId(), msg.getActionId(), msg.getUserId(),
                        jwt.getName(), msg.getBody(), msg.getCreatedAt()));
    }
}
