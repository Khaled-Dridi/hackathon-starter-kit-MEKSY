package com.inetum.starter.dto.request;

import com.inetum.starter.entity.ReactionType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReactionRequestDTO {

    @NotNull
    private ReactionType reaction;
}
