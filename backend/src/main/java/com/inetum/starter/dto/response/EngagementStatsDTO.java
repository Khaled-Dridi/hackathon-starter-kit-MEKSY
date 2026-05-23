package com.inetum.starter.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EngagementStatsDTO {

    private long distinctParticipants;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDate since;
}
