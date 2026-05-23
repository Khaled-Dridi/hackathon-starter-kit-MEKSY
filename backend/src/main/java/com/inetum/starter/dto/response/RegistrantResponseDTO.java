package com.inetum.starter.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistrantResponseDTO {
    private Long userId;
    private String email;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime registeredAt;
}
