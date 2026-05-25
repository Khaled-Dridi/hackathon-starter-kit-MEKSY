package com.inetum.starter.actions;

import com.inetum.starter.dto.mapper.ProposalMapper;
import com.inetum.starter.dto.request.ProposalRequestDTO;
import com.inetum.starter.dto.request.ProposalStatusDTO;
import com.inetum.starter.dto.response.ProposalResponseDTO;
import com.inetum.starter.entity.ProposalEntity;
import com.inetum.starter.entity.ProposalStatus;
import com.inetum.starter.service.ProposalService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
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

@Path("/proposals")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class ProposalResource {

    private final ProposalService proposalService;
    private final ProposalMapper proposalMapper;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    private ProposalResponseDTO toResponseWithAuthor(ProposalEntity entity) {
        var dto = proposalMapper.toResponse(entity);
        dto.setAuthorEmail(proposalService.emailForUser(entity.getUserId()));
        return dto;
    }

    @GET
    @Path("/mine")
    public RestResponse<List<ProposalResponseDTO>> mine() {
        var proposals = proposalService.listMine(currentUserId()).stream()
                .map(this::toResponseWithAuthor).toList();
        return RestResponse.ok(proposals);
    }

    @GET
    @RolesAllowed("ADMIN")
    public RestResponse<List<ProposalResponseDTO>> list(@QueryParam("status") ProposalStatus status) {
        var proposals = (status == null
                ? proposalService.listAll()
                : proposalService.listByStatus(status))
                .stream().map(this::toResponseWithAuthor).toList();
        return RestResponse.ok(proposals);
    }

    @POST
    public RestResponse<ProposalResponseDTO> create(@Valid ProposalRequestDTO body) {
        var proposal = proposalService.create(
                currentUserId(), body.getTitle(), body.getDescription(), body.getImageUrl());
        return RestResponse.ResponseBuilder
                .ok(toResponseWithAuthor(proposal))
                .status(RestResponse.Status.CREATED)
                .location(URI.create("/proposals/" + proposal.getId()))
                .build();
    }

    @PUT
    @Path("/{id}/status")
    @RolesAllowed("ADMIN")
    public RestResponse<ProposalResponseDTO> updateStatus(@RestPath Long id,
                                                          @Valid ProposalStatusDTO body) {
        var proposal = proposalService.updateStatus(id, body.getStatus());
        return RestResponse.ok(toResponseWithAuthor(proposal));
    }
}
