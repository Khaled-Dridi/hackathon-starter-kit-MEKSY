package com.inetum.starter.service;

import com.inetum.starter.dto.response.ChatMessageResponseDTO;
import com.inetum.starter.entity.ActionChatMessageEntity;
import com.inetum.starter.events.DomainEvent;
import com.inetum.starter.exception.ResourceNotFoundException;
import com.inetum.starter.repository.ActionChatMessageRepository;
import com.inetum.starter.repository.ActionRepository;
import com.inetum.starter.repository.RegistrationRepository;
import com.inetum.starter.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The action's private chat channel — only people registered for the
 * action (plus admins) can read and write. The discussion wall and the
 * chat live side-by-side: the wall is open to anyone logged-in, the chat
 * is gated.
 *
 * <h3>SSE</h3>
 * Fires {@code chat.message.sent} on send, broadcasting only the
 * {@code actionId} in the event payload — never the body. Subscribed
 * clients refetch via the authenticated GET, which enforces the same
 * access rule. So non-registered users who happen to receive the event
 * can't see the message content.
 */
@ApplicationScoped
@RequiredArgsConstructor
public class ActionChatService {

    private static final Logger LOG = Logger.getLogger(ActionChatService.class);

    private final ActionChatMessageRepository chatRepository;
    private final RegistrationRepository registrationRepository;
    private final ActionRepository actionRepository;
    private final UserRepository userRepository;
    private final Event<DomainEvent> events;

    /**
     * Throws {@link ForbiddenException} unless the caller is registered
     * for this action OR is an admin. Throws {@link ResourceNotFoundException}
     * if the action itself doesn't exist (so a deleted action's URL doesn't
     * leak "you would be allowed if you signed up").
     */
    private void requireAccess(Long actionId, Long userId, boolean isAdmin) {
        actionRepository.findByIdOptional(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found"));
        if (isAdmin) return;
        boolean registered = registrationRepository.find(userId, actionId).isPresent();
        if (!registered) {
            throw new ForbiddenException(
                    "You need to be registered for this action to access its chat.");
        }
    }

    public List<ChatMessageResponseDTO> listForAction(Long actionId,
                                                      Long currentUserId,
                                                      boolean isAdmin) {
        requireAccess(actionId, currentUserId, isAdmin);
        var rows = chatRepository.listForAction(actionId);
        if (rows.isEmpty()) return List.of();

        // Batch the author emails — for a 50-message chat we'd otherwise
        // fire 50 selects against the users table.
        var authorIds = rows.stream().map(ActionChatMessageEntity::getUserId)
                .collect(java.util.stream.Collectors.toSet());
        var emails = batchEmails(authorIds);

        return rows.stream().map(m -> new ChatMessageResponseDTO(
                m.getId(), m.getActionId(), m.getUserId(),
                emails.getOrDefault(m.getUserId(), "unknown"),
                m.getBody(), m.getCreatedAt())).toList();
    }

    @Transactional
    public ActionChatMessageEntity send(Long actionId, Long userId, String body, boolean isAdmin) {
        requireAccess(actionId, userId, isAdmin);
        if (body == null || body.isBlank()) {
            throw new BadRequestException("Message body is required.");
        }
        var msg = new ActionChatMessageEntity();
        msg.setActionId(actionId);
        msg.setUserId(userId);
        msg.setBody(body.trim());
        chatRepository.persist(msg);
        LOG.debugf("Chat message sent id=%s actionId=%s userId=%s",
                msg.getId(), actionId, userId);
        // Payload deliberately minimal — body stays out of the event.
        events.fire(DomainEvent.action("chat.message.sent", actionId,
                Map.of("messageId", msg.getId())));
        return msg;
    }

    private Map<Long, String> batchEmails(java.util.Set<Long> userIds) {
        if (userIds.isEmpty()) return Map.of();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = userRepository.getEntityManager()
                .createQuery("select u.id, u.email from UserEntity u where u.id in :ids")
                .setParameter("ids", userIds)
                .getResultList();
        var out = new HashMap<Long, String>(rows.size());
        for (Object[] r : rows) out.put((Long) r[0], (String) r[1]);
        return out;
    }
}
