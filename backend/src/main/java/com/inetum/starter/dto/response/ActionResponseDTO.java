package com.inetum.starter.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActionResponseDTO {

    private Long id;
    private String title;
    private String description;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime actionDate;

    private String location;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Integer capacity;
    private String oddTag;
    private Boolean isClosed;
    private String impactSummary;
    private String imageUrl;

    private Integer registeredCount;
    private Integer seatsRemaining;
    private Boolean currentUserRegistered;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime updatedAt;
}
