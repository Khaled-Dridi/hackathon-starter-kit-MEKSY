package com.inetum.starter.actions;

import com.inetum.starter.service.FileService;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.RestPath;
import org.jboss.resteasy.reactive.RestResponse;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;

/**
 * Image upload + retrieval.
 *
 * <h3>Auth model</h3>
 * <ul>
 *   <li><b>{@code POST /files}</b> requires USER/ADMIN — only logged-in
 *       colleagues can push bytes onto our disk.</li>
 *   <li><b>{@code GET /files/{id}}</b> is {@code @PermitAll} because
 *       browsers cannot send the Authorization header through a plain
 *       {@code <img src>} tag. The trade-off: anyone with a file's exact
 *       UUID can fetch it. UUIDs are not enumerable, and the content is
 *       imagery the admin already chose to publish for everyone in the
 *       app to see, so the practical risk is small.</li>
 * </ul>
 */
@Path("/files")
@ApplicationScoped
@RequiredArgsConstructor
public class FileResource {

    private final FileService fileService;
    private final JsonWebToken jwt;

    private Long currentUserId() {
        return Long.parseLong(jwt.getSubject());
    }

    @POST
    @RolesAllowed({"USER", "ADMIN"})
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public RestResponse<UploadResponse> upload(@RestForm("file") @PartType(MediaType.APPLICATION_OCTET_STREAM)
                                               FileUpload upload) throws IOException {
        if (upload == null) {
            throw new jakarta.ws.rs.BadRequestException("Missing 'file' part");
        }
        try (InputStream in = java.nio.file.Files.newInputStream(upload.uploadedFile())) {
            var entity = fileService.store(
                    upload.fileName(),
                    upload.contentType(),
                    upload.size(),
                    in,
                    currentUserId());
            return RestResponse.status(RestResponse.Status.CREATED,
                    new UploadResponse(entity.getId().toString(), "/files/" + entity.getId()));
        }
    }

    @GET
    @Path("/{id}")
    @PermitAll
    public RestResponse<InputStream> download(@RestPath UUID id) {
        var loaded = fileService.load(id);
        return RestResponse.ResponseBuilder
                .ok(loaded.bytes(), loaded.entity().getContentType())
                .header("Cache-Control", "public, max-age=86400")  // 1 day — images don't change
                .header("Content-Length", String.valueOf(loaded.entity().getSizeBytes()))
                .build();
    }

    /** Returned to the uploader so the form can store the URL in its draft. */
    public record UploadResponse(String id, String url) {}
}
