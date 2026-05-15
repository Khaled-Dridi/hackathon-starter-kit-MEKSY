package com.inetum.starter.repository;

import com.inetum.starter.entity.NoteEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class NoteRepository implements PanacheRepository<NoteEntity> {

    public List<NoteEntity> listByUser(Long userId) {
        return list("userId", Sort.by("updatedAt").descending(), userId);
    }

    public Optional<NoteEntity> findByIdAndUser(Long id, Long userId) {
        return find("id = ?1 and userId = ?2", id, userId).firstResultOptional();
    }
}
