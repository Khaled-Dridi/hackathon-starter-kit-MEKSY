package com.inetum.starter.actions;

import com.inetum.starter.dto.mapper.ActionMapper;
import com.inetum.starter.dto.request.ActionRequestDTO;
import com.inetum.starter.dto.response.ActionResponseDTO;
import com.inetum.starter.entity.ActionEntity;
import com.inetum.starter.repository.RegistrationRepository;
import com.inetum.starter.service.ActionService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/actions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class ActionResource {

    private final ActionService actionService;
    private final RegistrationRepository registrationRepository;
    private final ActionMapper actionMapper;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    @GET
    public RestResponse<List<ActionResponseDTO>> list(@QueryParam("open") Boolean openOnly) {
        List<ActionEntity> actions = Boolean.TRUE.equals(openOnly)
                ? actionService.listOpen()
                : actionService.listAll();

        var ids = actions.stream().map(ActionEntity::getId).toList();
        Map<Long, Long> counts = registrationRepository.countsForActions(ids);
        Set<Long> myRegisteredActionIds =
                registrationRepository.actionIdsRegisteredByUser(currentUserId(), ids);

        var response = actions.stream()
                .map(a -> actionMapper.toResponseWithCounts(
                        a,
                        counts.getOrDefault(a.getId(), 0L).intValue(),
                        myRegisteredActionIds.contains(a.getId())))
                .toList();
        return RestResponse.ok(response);
    }

    @GET
    @Path("/{id}")
    public RestResponse<ActionResponseDTO> get(@RestPath Long id) {
        var action = actionService.get(id);
        int count = (int) registrationRepository.countForAction(id);
        boolean mine = registrationRepository.find(currentUserId(), id).isPresent();
        return RestResponse.ok(actionMapper.toResponseWithCounts(action, count, mine));
    }

    @POST
    @RolesAllowed("ADMIN")
    public RestResponse<ActionResponseDTO> create(@Valid ActionRequestDTO body) {
        var action = actionService.create(
                currentUserId(),
                body.getTitle(),
                body.getDescription(),
                body.getActionDate(),
                body.getLocation(),
                body.getLatitude(),
                body.getLongitude(),
                body.getCapacity(),
                body.getOddTag(),
                body.getImpactSummary(),
                body.getImageUrl());
        return RestResponse.ResponseBuilder
                .ok(actionMapper.toResponseWithCounts(action, 0, false))
                .status(RestResponse.Status.CREATED)
                .location(URI.create("/actions/" + action.getId()))
                .build();
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("ADMIN")
    public RestResponse<ActionResponseDTO> update(@RestPath Long id, @Valid ActionRequestDTO body) {
        var action = actionService.update(
                id,
                body.getTitle(),
                body.getDescription(),
                body.getActionDate(),
                body.getLocation(),
                body.getLatitude(),
                body.getLongitude(),
                body.getCapacity(),
                body.getOddTag(),
                body.getImpactSummary(),
                body.getImageUrl());
        int count = (int) registrationRepository.countForAction(id);
        boolean mine = registrationRepository.find(currentUserId(), id).isPresent();
        return RestResponse.ok(actionMapper.toResponseWithCounts(action, count, mine));
    }

    @POST
    @Path("/{id}/close")
    @RolesAllowed("ADMIN")
    public RestResponse<ActionResponseDTO> close(@RestPath Long id) {
        var action = actionService.close(id);
        int count = (int) registrationRepository.countForAction(id);
        return RestResponse.ok(actionMapper.toResponseWithCounts(action, count, false));
    }

    @POST
    @Path("/{id}/duplicate")
    @RolesAllowed("ADMIN")
    public RestResponse<ActionResponseDTO> duplicate(@RestPath Long id) {
        var copy = actionService.duplicate(id, currentUserId());
        return RestResponse.ResponseBuilder
                .ok(actionMapper.toResponseWithCounts(copy, 0, false))
                .status(RestResponse.Status.CREATED)
                .location(URI.create("/actions/" + copy.getId()))
                .build();
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("ADMIN")
    public RestResponse<Void> delete(@RestPath Long id) {
        actionService.delete(id);
        return RestResponse.noContent();
    }
}
