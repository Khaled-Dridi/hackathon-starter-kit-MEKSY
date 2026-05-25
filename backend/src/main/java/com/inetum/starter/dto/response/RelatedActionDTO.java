package com.inetum.starter.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Slim view of an action returned alongside an assistant reply, so the
 * UI can render quick-action buttons (Open / Register / Cancel) without
 * a second round-trip to {@code GET /actions/{id}}.
 *
 * <p>The fields are everything the chat-widget action chip needs.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RelatedActionDTO {
    private Long id;
    private String title;
    private String location;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime actionDate;

    private Boolean isClosed;
    private Integer seatsRemaining;
    /** True if the current user is registered for this action. */
    private Boolean currentUserRegistered;
}
