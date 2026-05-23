package com.inetum.starter.dto.mapper;

import com.inetum.starter.dto.response.ProposalResponseDTO;
import com.inetum.starter.entity.ProposalEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.JAKARTA_CDI)
public interface ProposalMapper {

    @Mapping(target = "authorEmail", ignore = true)
    ProposalResponseDTO toResponse(ProposalEntity entity);
}
