package com.inetum.starter.service;

import com.inetum.starter.dto.response.CommentResponseDTO;
import com.inetum.starter.dto.response.PostResponseDTO;
import com.inetum.starter.entity.CommentEntity;
import com.inetum.starter.entity.PostEntity;
import com.inetum.starter.entity.ReactionEntity;
import com.inetum.starter.entity.ReactionEntity.ReactionId;
import com.inetum.starter.entity.ReactionType;
import com.inetum.starter.events.DomainEvent;
import com.inetum.starter.exception.ResourceNotFoundException;
import com.inetum.starter.repository.ActionRepository;
import com.inetum.starter.repository.CommentRepository;
import com.inetum.starter.repository.PostRepository;
import com.inetum.starter.repository.ReactionRepository;
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
 * The "discussion wall" service — coordinates posts, comments and
 * reactions for an action.
 *
 * <h3>Why one combined service</h3>
 * Posts, comments and reactions are tightly coupled in the UI (the feed
 * endpoint hydrates all three in one shot). Keeping the logic in one
 * class avoids a constellation of services calling each other, and makes
 * the SSE event firing easy to keep consistent.
 *
 * <h3>Listing perf</h3>
 * The list endpoint uses three batched queries (posts; comments-by-post;
 * reaction-counts + my-reactions-by-post), then assembles the response in
 * memory. No per-post round-trip — see the repository layer for the
 * projection queries.
 */
@ApplicationScoped
@RequiredArgsConstructor
public class FeedService {

    private static final Logger LOG = Logger.getLogger(FeedService.class);

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ReactionRepository reactionRepository;
    private final ActionRepository actionRepository;
    private final UserRepository userRepository;
    private final Event<DomainEvent> events;

    // =========================================================================
    // Reads
    // =========================================================================

    /**
     * Hydrates the full feed for an action: every post + its comments +
     * reaction counts + the current user's own reaction.
     */
    public List<PostResponseDTO> listForAction(Long actionId, Long currentUserId) {
        var posts = postRepository.listForAction(actionId);
        if (posts.isEmpty()) return List.of();

        var postIds = posts.stream().map(PostEntity::getId).toList();
        var commentsByPost = commentRepository.listForPosts(postIds);
        var reactionCounts = reactionRepository.countsForPosts(postIds);
        var myReactions   = reactionRepository.myReactions(currentUserId, postIds);

        // Batch-load author emails for posts + comments to avoid N+1.
        var authorIds = new java.util.HashSet<Long>();
        posts.forEach(p -> authorIds.add(p.getUserId()));
        commentsByPost.values().forEach(list -> list.forEach(c -> authorIds.add(c.getUserId())));
        var emailsById = batchEmails(authorIds);

        return posts.stream()
                .map(p -> toDto(p, emailsById, commentsByPost, reactionCounts, myReactions))
                .toList();
    }

    private PostResponseDTO toDto(PostEntity p,
                                  Map<Long, String> emailsById,
                                  Map<Long, List<CommentEntity>> commentsByPost,
                                  Map<Long, Map<String, Long>> reactionCounts,
                                  Map<Long, String> myReactions) {
        var commentDtos = commentsByPost.getOrDefault(p.getId(), List.of()).stream()
                .map(c -> new CommentResponseDTO(
                        c.getId(), c.getPostId(), c.getUserId(),
                        emailsById.getOrDefault(c.getUserId(), "unknown"),
                        c.getBody(), c.getCreatedAt()))
                .toList();
        return new PostResponseDTO(
                p.getId(),
                p.getActionId(),
                p.getUserId(),
                emailsById.getOrDefault(p.getUserId(), "unknown"),
                p.getBody(),
                p.getMediaUrl(),
                p.getMediaType(),
                reactionCounts.getOrDefault(p.getId(), Map.of()),
                myReactions.get(p.getId()),
                commentDtos,
                p.getCreatedAt(),
                p.getUpdatedAt());
    }

    private Map<Long, String> batchEmails(java.util.Set<Long> userIds) {
        if (userIds.isEmpty()) return Map.of();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = userRepository.getEntityManager()
                .createQuery(
                        "select u.id, u.email from UserEntity u where u.id in :ids")
                .setParameter("ids", userIds)
                .getResultList();
        var out = new HashMap<Long, String>(rows.size());
        for (Object[] row : rows) out.put((Long) row[0], (String) row[1]);
        return out;
    }

    // =========================================================================
    // Writes — posts
    // =========================================================================

    @Transactional
    public PostEntity createPost(Long actionId, Long userId, String body,
                                 String mediaUrl, String mediaType) {
        // The action must exist — but we don't enforce "must be registered".
        actionRepository.findByIdOptional(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found"));

        var trimmed = body == null ? "" : body.trim();
        var hasMedia = mediaUrl != null && !mediaUrl.isBlank();
        if (trimmed.isEmpty() && !hasMedia) {
            throw new BadRequestException("Post must have either text or media.");
        }

        var post = new PostEntity();
        post.setActionId(actionId);
        post.setUserId(userId);
        post.setBody(trimmed);
        post.setMediaUrl(hasMedia ? mediaUrl : null);
        post.setMediaType(hasMedia ? mediaType : null);
        postRepository.persist(post);
        LOG.debugf("Post created id=%s actionId=%s userId=%s", post.getId(), actionId, userId);

        events.fire(DomainEvent.action("post.created", actionId,
                Map.of("postId", post.getId(), "authorId", userId)));
        return post;
    }

    @Transactional
    public void deletePost(Long postId, Long currentUserId, boolean isAdmin) {
        var post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (!isAdmin && !post.getUserId().equals(currentUserId)) {
            throw new ForbiddenException("Only the author (or an admin) can delete this post.");
        }
        var actionId = post.getActionId();
        postRepository.delete(post);  // ON DELETE CASCADE wipes comments + reactions
        LOG.debugf("Post deleted id=%s by=%s", postId, currentUserId);
        events.fire(DomainEvent.action("post.deleted", actionId,
                Map.of("postId", postId)));
    }

    // =========================================================================
    // Writes — comments
    // =========================================================================

    @Transactional
    public CommentEntity createComment(Long postId, Long userId, String body) {
        var post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (body == null || body.isBlank()) {
            throw new BadRequestException("Comment body is required.");
        }

        var comment = new CommentEntity();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setBody(body.trim());
        commentRepository.persist(comment);
        LOG.debugf("Comment created id=%s postId=%s userId=%s", comment.getId(), postId, userId);

        events.fire(DomainEvent.action("comment.created", post.getActionId(),
                Map.of("postId", postId, "commentId", comment.getId())));
        return comment;
    }

    @Transactional
    public void deleteComment(Long commentId, Long currentUserId, boolean isAdmin) {
        var c = commentRepository.findByIdOptional(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        if (!isAdmin && !c.getUserId().equals(currentUserId)) {
            throw new ForbiddenException("Only the author (or an admin) can delete this comment.");
        }
        var post = postRepository.findByIdOptional(c.getPostId()).orElse(null);
        commentRepository.delete(c);
        LOG.debugf("Comment deleted id=%s by=%s", commentId, currentUserId);
        if (post != null) {
            events.fire(DomainEvent.action("comment.deleted", post.getActionId(),
                    Map.of("postId", c.getPostId(), "commentId", commentId)));
        }
    }

    // =========================================================================
    // Writes — reactions (set or clear, "upsert" pattern)
    // =========================================================================

    @Transactional
    public void setReaction(Long postId, Long userId, ReactionType type) {
        var post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        var existing = reactionRepository.findByPostAndUser(postId, userId).orElse(null);
        if (existing != null) {
            existing.setReaction(type.dbValue());
        } else {
            var r = new ReactionEntity();
            r.setId(new ReactionId(postId, userId));
            r.setReaction(type.dbValue());
            reactionRepository.persist(r);
        }
        events.fire(DomainEvent.action("reaction.changed", post.getActionId(),
                Map.of("postId", postId, "userId", userId, "reaction", type.dbValue())));
    }

    @Transactional
    public void clearReaction(Long postId, Long userId) {
        var post = postRepository.findByIdOptional(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        reactionRepository.findByPostAndUser(postId, userId)
                .ifPresent(reactionRepository::delete);
        events.fire(DomainEvent.action("reaction.changed", post.getActionId(),
                Map.of("postId", postId, "userId", userId, "reaction", "")));
    }
}
