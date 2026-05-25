package com.inetum.starter.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * A post enriched with everything the feed UI needs in one shot:
 * author email, comments, reaction counts, and the current user's own
 * reaction (so the matching emoji button can render in the "pressed" state).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostResponseDTO {

    private Long id;
    private Long actionId;
    private Long authorId;
    private String authorEmail;
    private String body;
    private String mediaUrl;
    private String mediaType;

    /** {reactionName → count}. Lowercase keys: "like", "love", "haha", "wow", "sad", "angry". */
    private Map<String, Long> reactionCounts;

    /** The current user's reaction, or null. */
    private String myReaction;

    private List<CommentResponseDTO> comments;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime updatedAt;
}
