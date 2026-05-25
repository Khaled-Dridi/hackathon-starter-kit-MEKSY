package com.inetum.starter.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response shape for the conversational assistant — extends the plain
 * chat reply with the actions the assistant referenced via the
 * {@code [[action:ID]]} markers in its text. The frontend uses
 * {@link #relatedActions} to render quick-action buttons (Open /
 * Register / Cancel) under the assistant's message.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatResponseDTO {

    /** The assistant's text, with all {@code [[action:N]]} markers stripped. */
    private String reply;

    /** Actions referenced in the reply, in order of first appearance. */
    private List<RelatedActionDTO> relatedActions;
}
