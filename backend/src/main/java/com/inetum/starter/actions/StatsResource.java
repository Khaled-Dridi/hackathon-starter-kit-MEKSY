package com.inetum.starter.actions;

import com.inetum.starter.dto.response.EngagementStatsDTO;
import com.inetum.starter.service.EngagementService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/stats")
@Produces(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class StatsResource {

    private final EngagementService engagementService;

    @GET
    @Path("/engagement")
    public RestResponse<EngagementStatsDTO> engagement() {
        var stats = new EngagementStatsDTO(
                engagementService.distinctParticipantsThisSeason(),
                engagementService.seasonStart());
        return RestResponse.ok(stats);
    }
}
