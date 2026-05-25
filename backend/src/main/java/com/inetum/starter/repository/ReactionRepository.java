package com.inetum.starter.repository;

import com.inetum.starter.entity.ReactionEntity;
import com.inetum.starter.entity.ReactionEntity.ReactionId;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class ReactionRepository implements PanacheRepositoryBase<ReactionEntity, ReactionId> {

    public Optional<ReactionEntity> findByPostAndUser(Long postId, Long userId) {
        return findByIdOptional(new ReactionId(postId, userId));
    }

    /**
     * Aggregated counts per (postId, reaction) for a batch of posts in one
     * SQL query. Returns a nested map: postId → reaction-string → count.
     */
    public Map<Long, Map<String, Long>> countsForPosts(List<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) return Map.of();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = getEntityManager()
                .createQuery(
                        "select r.id.postId, r.reaction, count(r) " +
                        "from ReactionEntity r " +
                        "where r.id.postId in :ids " +
                        "group by r.id.postId, r.reaction")
                .setParameter("ids", postIds)
                .getResultList();
        var result = new HashMap<Long, Map<String, Long>>();
        for (Object[] row : rows) {
            Long postId = (Long) row[0];
            String reaction = (String) row[1];
            Long count = (Long) row[2];
            result.computeIfAbsent(postId, k -> new HashMap<>()).put(reaction, count);
        }
        return result;
    }

    /**
     * Returns the current user's reaction (if any) for each given post.
     * Single query, projection only.
     */
    public Map<Long, String> myReactions(Long userId, List<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) return Map.of();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = getEntityManager()
                .createQuery(
                        "select r.id.postId, r.reaction " +
                        "from ReactionEntity r " +
                        "where r.id.userId = :uid and r.id.postId in :ids")
                .setParameter("uid", userId)
                .setParameter("ids", postIds)
                .getResultList();
        var result = new HashMap<Long, String>();
        for (Object[] row : rows) {
            result.put((Long) row[0], (String) row[1]);
        }
        return result;
    }
}
