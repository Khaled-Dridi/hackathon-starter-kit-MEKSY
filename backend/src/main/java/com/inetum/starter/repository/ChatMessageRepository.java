package com.inetum.starter.repository;

import com.inetum.starter.entity.ChatMessageEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ChatMessageRepository implements PanacheRepository<ChatMessageEntity> {

    public List<ChatMessageEntity> listBySession(Long sessionId) {
        return list("sessionId", Sort.by("createdAt").ascending(), sessionId);
    }
}
