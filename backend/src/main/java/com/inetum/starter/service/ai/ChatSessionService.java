package com.inetum.starter.service.ai;

import com.inetum.starter.entity.ChatMessageEntity;
import com.inetum.starter.entity.ChatSessionEntity;
import com.inetum.starter.entity.MessageRole;
import com.inetum.starter.exception.ResourceNotFoundException;
import com.inetum.starter.repository.ChatMessageRepository;
import com.inetum.starter.repository.ChatSessionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.List;

@ApplicationScoped
@RequiredArgsConstructor
public class ChatSessionService {

    private static final Logger LOG = Logger.getLogger(ChatSessionService.class);

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final AiAssistant assistant;

    public List<ChatSessionEntity> listForUser(Long userId) {
        return sessionRepository.listByUser(userId);
    }

    public ChatSessionEntity getOwned(Long id, Long userId) {
        return sessionRepository.findByIdAndUser(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));
    }

    public List<ChatMessageEntity> messagesFor(Long sessionId, Long userId) {
        getOwned(sessionId, userId);
        return messageRepository.listBySession(sessionId);
    }

    @Transactional
    public ChatSessionEntity create(Long userId, String title) {
        var session = new ChatSessionEntity();
        session.setUserId(userId);
        session.setTitle(title == null || title.isBlank() ? "Nouvelle conversation" : title);
        sessionRepository.persist(session);
        LOG.debugf("Chat session created id=%s userId=%s", session.getId(), userId);
        return session;
    }

    @Transactional
    public void delete(Long id, Long userId) {
        var session = getOwned(id, userId);
        sessionRepository.delete(session);
        LOG.debugf("Chat session deleted id=%s userId=%s", id, userId);
    }

    @Transactional
    public ChatMessageEntity sendMessage(Long sessionId, Long userId, String content) {
        var session = getOwned(sessionId, userId);

        var userMessage = persistMessage(session.getId(), MessageRole.USER, content);

        String reply = assistant.chat(session.getId(), content);

        var assistantMessage = persistMessage(session.getId(), MessageRole.ASSISTANT, reply);

        session.setUpdatedAt(userMessage.getCreatedAt());
        return assistantMessage;
    }

    private ChatMessageEntity persistMessage(Long sessionId, MessageRole role, String content) {
        var message = new ChatMessageEntity();
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content);
        messageRepository.persist(message);
        return message;
    }
}
