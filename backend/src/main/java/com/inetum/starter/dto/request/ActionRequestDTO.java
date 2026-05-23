package com.inetum.starter.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @NotNull
    @Min(1)
    private Integer capacity;

    @Size(max = 80)
    private String oddTag;

    @Size(max = 50_000)
    private String impactSummary;
}
