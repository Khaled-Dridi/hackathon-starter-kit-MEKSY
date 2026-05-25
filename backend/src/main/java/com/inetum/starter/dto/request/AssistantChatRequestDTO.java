package com.inetum.starter.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatRequestDTO {

    /**
     * Stable per-browser conversation id. The client generates a UUID
     * the first time the widget opens and reuses it for every message
     * in that conversation — that's how the server-side memory keeps
     * the dialogue coherent across turns.
     */
    @NotBlank
    @Size(max = 200)
    private String sessionId;

    @NotBlank
    @Size(max = 4000)
    private String message;
}
