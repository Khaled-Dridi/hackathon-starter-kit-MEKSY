package com.inetum.starter.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActionRequestDTO {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 50_000)
    private String description;

    @NotNull
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime actionDate;

    @Size(max = 200)
    private String location;

    /** Optional map coordinates. Both must be present together (or both null). */
    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private BigDecimal latitude;

    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private BigDecimal longitude;

    @NotNull
    @Min(1)
    private Integer capacity;

    @Size(max = 80)
    private String oddTag;

    @Size(max = 50_000)
    private String impactSummary;

    /** Either an "https://…" URL or a "/files/{uuid}" relative path. */
    @Size(max = 2000)
    private String imageUrl;
}
