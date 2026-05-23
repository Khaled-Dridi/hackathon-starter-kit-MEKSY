package com.inetum.starter.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.inetum.starter.entity.ProposalStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProposalResponseDTO {

    private Long id;
    private Long userId;
    private String authorEmail;
    private String title;
    private String description;
    private ProposalStatus status;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime updatedAt;
}
