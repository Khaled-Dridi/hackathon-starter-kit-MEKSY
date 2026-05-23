package com.inetum.starter.dto.mapper;

import com.inetum.starter.dto.response.ActionResponseDTO;
import com.inetum.starter.entity.ActionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

@Mapper(componentModel = MappingConstants.ComponentModel.JAKARTA_CDI)
public interface ActionMapper {

    @Mapping(target = "registeredCount", ignore = true)
    @Mapping(target = "seatsRemaining", ignore = true)
    @Mapping(target = "currentUserRegistered", ignore = true)
    ActionResponseDTO toResponse(ActionEntity entity);

    @Named("withCounts")
    default ActionResponseDTO toResponseWithCounts(ActionEntity entity,
                                                   int registeredCount,
                                                   boolean currentUserRegistered) {
        var dto = toResponse(entity);
        dto.setRegisteredCount(registeredCount);
        dto.setSeatsRemaining(Math.max(0, entity.getCapacity() - registeredCount));
        dto.setCurrentUserRegistered(currentUserRegistered);
        return dto;
    }
}
