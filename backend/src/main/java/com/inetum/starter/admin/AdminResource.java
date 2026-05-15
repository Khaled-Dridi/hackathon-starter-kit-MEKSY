package com.inetum.starter.admin;

import com.inetum.starter.dto.mapper.UserMapper;
import com.inetum.starter.dto.response.UserResponseDTO;
import com.inetum.starter.service.UserService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;

@Path("/admin")
@Produces(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed("ADMIN")
@RequiredArgsConstructor
public class AdminResource {

    private static final Logger LOG = Logger.getLogger(AdminResource.class);

    private final UserService userService;
    private final UserMapper userMapper;

    @GET
    @Path("/users")
    public RestResponse<List<UserResponseDTO>> listUsers() {
        var users = userService.listAll().stream().map(userMapper::toResponse).toList();
        LOG.debugf("Admin listed %d users", users.size());
        return RestResponse.ok(users);
    }
}
