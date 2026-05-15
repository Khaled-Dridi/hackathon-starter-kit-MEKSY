package com.inetum.starter.dto.mapper;

import com.inetum.starter.dto.response.UserResponseDTO;
import com.inetum.starter.entity.Role;
import com.inetum.starter.entity.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = MappingConstants.ComponentModel.JAKARTA_CDI)
public interface UserMapper {

    @Named("rolesToStrings")
    static Set<String> rolesToStrings(Set<Role> roles) {
        return roles == null ? Set.of()
                : roles.stream().map(Enum::name).collect(Collectors.toSet());
    }

    UserResponseDTO toResponse(UserEntity entity);
}
