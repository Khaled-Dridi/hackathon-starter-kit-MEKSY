package com.inetum.starter.dto.request;

import com.inetum.starter.entity.ProposalStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProposalStatusDTO {

    @NotNull
    private ProposalStatus status;
}
