package com.inetum.starter.service.ai;

import com.inetum.starter.dto.mapper.ChatMapper;
import com.inetum.starter.dto.request.AssistantChatRequestDTO;
import com.inetum.starter.dto.request.ChatRequestDTO;
import com.inetum.starter.dto.request.CreateSessionDTO;
import com.inetum.starter.dto.request.GenerateDescriptionDTO;
import com.inetum.starter.dto.response.AssistantChatResponseDTO;
import com.inetum.starter.dto.response.ChatResponseDTO;
import com.inetum.starter.dto.response.GeneratedDescriptionDTO;
import com.inetum.starter.dto.response.MessageResponseDTO;
import com.inetum.starter.dto.response.SessionResponseDTO;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;
import java.util.UUID;

@Path("/ai")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class AiResource {

    private static final Logger LOG = Logger.getLogger(AiResource.class);

    private final AiAssistant assistant;
    private final CharityAssistantService charityAssistant;
    private final ChatSessionService sessionService;
    private final ChatMapper chatMapper;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    @POST
    @Path("/chat")
    public RestResponse<ChatResponseDTO> chatStateless(@Valid ChatRequestDTO request) {
        LOG.debugf("Stateless AI chat (len=%d)", request.getMessage().length());
        String reply = assistant.chat(UUID.randomUUID().toString(), request.getMessage());
        return RestResponse.ok(new ChatResponseDTO(reply));
    }

    @GET
    @Path("/sessions")
    public RestResponse<List<SessionResponseDTO>> listSessions() {
        var sessions = sessionService.listForUser(currentUserId()).stream()
                .map(chatMapper::toResponse).toList();
        return RestResponse.ok(sessions);
    }

    @POST
    @Path("/sessions")
    public RestResponse<SessionResponseDTO> createSession(@Valid CreateSessionDTO body) {
        var session = sessionService.create(currentUserId(),
                body == null ? null : body.getTitle());
        return RestResponse.status(RestResponse.Status.CREATED,
                chatMapper.toResponse(session));
    }

    @DELETE
    @Path("/sessions/{id}")
    public RestResponse<Void> deleteSession(@RestPath Long id) {
        sessionService.delete(id, currentUserId());
        return RestResponse.noContent();
    }

    @GET
    @Path("/sessions/{id}/messages")
    public RestResponse<List<MessageResponseDTO>> listMessages(@RestPath Long id) {
        var messages = sessionService.messagesFor(id, currentUserId()).stream()
                .map(chatMapper::toResponse).toList();
        return RestResponse.ok(messages);
    }

    @POST
    @Path("/sessions/{id}/messages")
    public RestResponse<MessageResponseDTO> sendMessage(
            @RestPath Long id, @Valid ChatRequestDTO request) {
        LOG.debugf("Session chat sessionId=%s len=%s", (Object) id,
                Integer.valueOf(request.getMessage().length()));
        var reply = sessionService.sendMessage(id, currentUserId(), request.getMessage());
        return RestResponse.ok(chatMapper.toResponse(reply));
    }

    @POST
    @Path("/actions/describe")
    @jakarta.annotation.security.RolesAllowed("ADMIN")
    public RestResponse<GeneratedDescriptionDTO> describeAction(@Valid GenerateDescriptionDTO body) {
        LOG.debugf("AI describe action (title len=%d)", body.getTitle().length());
        String description = assistant.generateActionDescription(body.getTitle());
        return RestResponse.ok(new GeneratedDescriptionDTO(description));
    }

    /**
     * Conversational assistant for users — knows the platform, the
     * currently-open actions, and the caller's registration status, and
     * helps them pick the right action for the year.
     * <p>
     * Multi-turn memory is keyed by the {@code sessionId} the client
     * generates once per browser session.
     */
    @POST
    @Path("/assistant/chat")
    public RestResponse<AssistantChatResponseDTO> assistantChat(@Valid AssistantChatRequestDTO request) {
        LOG.debugf("Assistant chat session=%s len=%d",
                request.getSessionId(), request.getMessage().length());
        AssistantChatResponseDTO reply = charityAssistant.chat(
                request.getSessionId(), currentUserId(), request.getMessage());
        return RestResponse.ok(reply);
    }
}
