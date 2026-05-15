package com.inetum.starter.dto.mapper;

import com.inetum.starter.dto.response.MessageResponseDTO;
import com.inetum.starter.dto.response.SessionResponseDTO;
import com.inetum.starter.entity.ChatMessageEntity;
import com.inetum.starter.entity.ChatSessionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.JAKARTA_CDI)
public interface ChatMapper {

    SessionResponseDTO toResponse(ChatSessionEntity entity);

    MessageResponseDTO toResponse(ChatMessageEntity entity);
}
