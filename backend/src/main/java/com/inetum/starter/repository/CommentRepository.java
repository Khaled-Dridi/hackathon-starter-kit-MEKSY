package com.inetum.starter.repository;

import com.inetum.starter.entity.CommentEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class CommentRepository implements PanacheRepository<CommentEntity> {

    public List<CommentEntity> listForPost(Long postId) {
        return list("postId", Sort.by("createdAt").ascending(), postId);
    }

    /**
     * Returns {postId → ordered list of comments} for the given posts in a
     * single query. Avoids N+1 when the feed endpoint hydrates many posts.
     */
    public Map<Long, List<CommentEntity>> listForPosts(List<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) return Map.of();
        var all = list("postId in ?1", Sort.by("postId").and("createdAt"), postIds);
        var byPost = new HashMap<Long, List<CommentEntity>>(postIds.size());
        for (var c : all) {
            byPost.computeIfAbsent(c.getPostId(), k -> new java.util.ArrayList<>()).add(c);
        }
        return byPost;
    }
}
