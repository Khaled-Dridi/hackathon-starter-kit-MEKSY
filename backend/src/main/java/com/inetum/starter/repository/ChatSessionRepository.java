package com.inetum.starter.repository;

import com.inetum.starter.entity.ChatSessionEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class ChatSessionRepository implements PanacheRepository<ChatSessionEntity> {

    public List<ChatSessionEntity> listByUser(Long userId) {
        return list("userId", Sort.by("updatedAt").descending(), userId);
    }

    public Optional<ChatSessionEntity> findByIdAndUser(Long id, Long userId) {
        return find("id = ?1 and userId = ?2", id, userId).firstResultOptional();
    }
}
