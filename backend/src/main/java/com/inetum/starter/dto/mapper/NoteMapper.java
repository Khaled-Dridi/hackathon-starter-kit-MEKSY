package com.inetum.starter.dto.mapper;

import com.inetum.starter.dto.response.NoteResponseDTO;
import com.inetum.starter.entity.NoteEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.JAKARTA_CDI)
public interface NoteMapper {
    NoteResponseDTO toResponse(NoteEntity entity);
}
