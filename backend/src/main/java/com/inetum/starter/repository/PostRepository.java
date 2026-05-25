package com.inetum.starter.repository;

import com.inetum.starter.entity.PostEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class PostRepository implements PanacheRepository<PostEntity> {

    /** Newest first — feed-style ordering. */
    public List<PostEntity> listForAction(Long actionId) {
        return list("actionId", Sort.by("createdAt").descending(), actionId);
    }
}
