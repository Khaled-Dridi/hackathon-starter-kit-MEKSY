package com.inetum.starter.repository;

import com.inetum.starter.entity.ActionChatMessageEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ActionChatMessageRepository
        implements PanacheRepository<ActionChatMessageEntity> {

    /** Oldest first — chat-style top-to-bottom rendering. */
    public List<ActionChatMessageEntity> listForAction(Long actionId) {
        return list("actionId", Sort.by("createdAt").ascending(), actionId);
    }
}
