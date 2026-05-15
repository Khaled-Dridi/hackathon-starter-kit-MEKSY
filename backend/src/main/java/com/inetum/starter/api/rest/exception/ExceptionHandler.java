package com.inetum.starter.api.rest.exception;

import com.inetum.starter.dto.response.ErrorResponseDTO;
import com.inetum.starter.exception.AppException;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

@Provider
public class ExceptionHandler implements ExceptionMapper<Throwable> {

    private static final Logger LOG = Logger.getLogger(ExceptionHandler.class);

    @Override
    public Response toResponse(Throwable e) {
        if (e instanceof AppException app) {
            LOG.debugf("Mapped AppException code=%s status=%d", app.getCode(), app.getHttpStatus());
            return Response.status(app.getHttpStatus())
                    .entity(new ErrorResponseDTO(app.getHttpStatus(), app.getCode(), app.getMessage()))
                    .build();
        }
        if (e instanceof ConstraintViolationException cve) {
            String detail = cve.getConstraintViolations().stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .reduce((a, b) -> a + "; " + b)
                    .orElse("validation failed");
            return Response.status(400)
                    .entity(new ErrorResponseDTO(400, "validation_failed", detail))
                    .build();
        }
        if (e instanceof WebApplicationException wae) {
            int status = wae.getResponse().getStatus();
            return Response.status(status)
                    .entity(new ErrorResponseDTO(status, "http_error", e.getMessage()))
                    .build();
        }
        LOG.errorf(e, "Unhandled exception: %s", e.getClass().getSimpleName());
        return Response.status(500)
                .entity(new ErrorResponseDTO(500, "internal_error", "Internal server error"))
                .build();
    }
}
