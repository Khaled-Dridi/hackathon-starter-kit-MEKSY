package com.inetum.starter.auth;

import com.inetum.starter.dto.request.LoginRequestDTO;
import com.inetum.starter.dto.request.SignupRequestDTO;
import com.inetum.starter.dto.response.LoginResponseDTO;
import com.inetum.starter.entity.Role;
import com.inetum.starter.exception.EmailAlreadyRegisteredException;
import com.inetum.starter.exception.InvalidCredentialsException;
import com.inetum.starter.service.UserService;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.Set;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RequiredArgsConstructor
public class LoginResource {

    private static final Logger LOG = Logger.getLogger(LoginResource.class);

    private final UserService userService;
    private final JwtService jwtService;

    @POST
    @Path("/login")
    @PermitAll
    public RestResponse<LoginResponseDTO> login(@Valid LoginRequestDTO request) {
        var user = userService.authenticate(request.getEmail(), request.getPassword())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

        String token = jwtService.issue(user);
        LOG.debugf("Issued token for user=%s", user.getEmail());
        return RestResponse.ok(new LoginResponseDTO(token, jwtService.getTtlSeconds()));
    }

    @POST
    @Path("/signup")
    @PermitAll
    public RestResponse<LoginResponseDTO> signup(@Valid SignupRequestDTO request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userService.existsByEmail(email)) {
            throw new EmailAlreadyRegisteredException();
        }

        var user = userService.create(email, request.getPassword(), Set.of(Role.USER));
        String token = jwtService.issue(user);
        LOG.infof("Signup: created user=%s id=%d", email, user.getId());
        return RestResponse.ok(new LoginResponseDTO(token, jwtService.getTtlSeconds()));
    }
}
