package com.inetum.starter.actions;

import com.inetum.starter.dto.response.RegistrantResponseDTO;
import com.inetum.starter.service.RegistrationService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;

@Path("/actions/{id}")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class RegistrationResource {

    private final RegistrationService registrationService;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    @POST
    @Path("/register")
    public RestResponse<Void> register(@RestPath Long id) {
        registrationService.register(currentUserId(), id);
        return RestResponse.status(RestResponse.Status.CREATED);
    }

    @DELETE
    @Path("/register")
    public RestResponse<Void> unregister(@RestPath Long id) {
        registrationService.unregister(currentUserId(), id);
        return RestResponse.noContent();
    }

    @GET
    @Path("/registrations")
    @RolesAllowed("ADMIN")
    public RestResponse<List<RegistrantResponseDTO>> listRegistrants(@RestPath Long id) {
        var registrants = registrationService.listForAction(id).stream()
                .map(r -> new RegistrantResponseDTO(
                        r.getUserId(),
                        registrationService.emailForUser(r.getUserId()),
                        r.getCreatedAt()))
                .toList();
        return RestResponse.ok(registrants);
    }
}
