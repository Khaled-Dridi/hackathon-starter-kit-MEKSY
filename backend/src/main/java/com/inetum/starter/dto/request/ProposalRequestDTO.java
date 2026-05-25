package com.inetum.starter.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProposalRequestDTO {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 50_000)
    private String description;

    /** Optional cover image — external URL or "/files/{uuid}". */
    @Size(max = 2000)
    private String imageUrl;
}
