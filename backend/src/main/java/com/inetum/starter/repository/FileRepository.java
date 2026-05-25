package com.inetum.starter.repository;

import com.inetum.starter.entity.FileEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for {@link FileEntity}. Uses {@link PanacheRepositoryBase}
 * (not {@code PanacheRepository}) because the id type is {@link UUID},
 * not {@code Long}.
 */
@ApplicationScoped
public class FileRepository implements PanacheRepositoryBase<FileEntity, UUID> {

    public Optional<FileEntity> findByIdOptional2(UUID id) {
        return findByIdOptional(id);
    }
}
