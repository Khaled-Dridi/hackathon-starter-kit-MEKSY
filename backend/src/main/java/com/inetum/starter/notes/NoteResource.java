package com.inetum.starter.notes;

import com.inetum.starter.dto.mapper.NoteMapper;
import com.inetum.starter.dto.request.NoteRequestDTO;
import com.inetum.starter.dto.response.NoteResponseDTO;
import com.inetum.starter.service.NoteService;
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
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;

import java.net.URI;
import java.util.List;

@Path("/notes")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
@RolesAllowed({"USER", "ADMIN"})
@RequiredArgsConstructor
public class NoteResource {

    private final NoteService noteService;
    private final NoteMapper noteMapper;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    @GET
    public RestResponse<List<NoteResponseDTO>> list() {
        var notes = noteService.listForUser(currentUserId()).stream()
                .map(noteMapper::toResponse).toList();
        return RestResponse.ok(notes);
    }

    @GET
    @Path("/{id}")
    public RestResponse<NoteResponseDTO> get(@RestPath Long id) {
        return RestResponse.ok(noteMapper.toResponse(noteService.getOwned(id, currentUserId())));
    }

    @POST
    public RestResponse<NoteResponseDTO> create(@Valid NoteRequestDTO body) {
        var note = noteService.create(currentUserId(), body.getTitle(), body.getContent());
        return RestResponse.ResponseBuilder
                .ok(noteMapper.toResponse(note))
                .status(RestResponse.Status.CREATED)
                .location(URI.create("/notes/" + note.getId()))
                .build();
    }

    @PUT
    @Path("/{id}")
    public RestResponse<NoteResponseDTO> update(@RestPath Long id, @Valid NoteRequestDTO body) {
        var note = noteService.update(id, currentUserId(), body.getTitle(), body.getContent());
        return RestResponse.ok(noteMapper.toResponse(note));
    }

    @DELETE
    @Path("/{id}")
    public RestResponse<Void> delete(@RestPath Long id) {
        noteService.delete(id, currentUserId());
        return RestResponse.noContent();
    }
}
