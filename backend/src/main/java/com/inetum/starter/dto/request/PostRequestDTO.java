package com.inetum.starter.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostRequestDTO {

    /** May be empty/null IF mediaUrl is set; service rejects "neither body nor media". */
    @Size(max = 50_000)
    private String body;

    /** Optional. External URL or "/files/{uuid}". */
    @Size(max = 2000)
    private String mediaUrl;

    /** "image" or "video". Optional even when mediaUrl is set — client can leave null. */
    @Size(max = 20)
    private String mediaType;
}
