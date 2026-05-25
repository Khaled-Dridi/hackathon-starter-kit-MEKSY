package com.inetum.starter.service;

import com.inetum.starter.entity.FileEntity;
import com.inetum.starter.exception.ResourceNotFoundException;
import com.inetum.starter.repository.FileRepository;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Stores and retrieves user-uploaded files (images for actions and proposals).
 *
 * <h3>Validation</h3>
 * Two cheap, defensive checks: <b>content type</b> must be one of the
 * allowed image MIME types, and <b>size</b> must be at or below the
 * configured limit (default 5 MB). These are the bare minimum — we don't
 * sniff magic bytes or run an image-decoder check, which would be the next
 * level if we ever serve files publicly to the internet.
 *
 * <h3>Storage layout</h3>
 * Each file lands at {@code <upload-dir>/<uuid>.<ext>} where the extension
 * is derived from the content type. We persist the absolute on-disk path
 * on the {@link FileEntity} row so retrieval is a single DB lookup followed
 * by a stream read — no path-computation logic at read time.
 */
@ApplicationScoped
@RequiredArgsConstructor
public class FileService {

    private static final Logger LOG = Logger.getLogger(FileService.class);

    /** Hard upper bound on any upload, regardless of type. */
    private static final long MAX_BYTES_VIDEO = 20 * 1024 * 1024L;
    private static final long MAX_BYTES_IMAGE = 5  * 1024 * 1024L;

    /** Image MIME types — capped at 5 MB. */
    private static final Set<String> ALLOWED_IMAGES = Set.of(
            "image/jpeg", "image/pjpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    /** Video MIME types — capped at 20 MB. Anything bigger should go on
     *  YouTube/Vimeo and be embedded via URL instead. */
    private static final Set<String> ALLOWED_VIDEOS = Set.of(
            "video/mp4",
            "video/webm",
            "video/quicktime"  // .mov from iPhone
    );

    private final FileRepository fileRepository;

    /** Configured via {@code app.uploads.dir}; defaults to {@code /app/uploads}. */
    @ConfigProperty(name = "app.uploads.dir", defaultValue = "/app/uploads")
    String uploadsDir;

    @PostConstruct
    void ensureDirectoryExists() {
        try {
            Files.createDirectories(Path.of(uploadsDir));
            LOG.infof("File upload directory: %s", uploadsDir);
        } catch (IOException e) {
            LOG.errorf(e, "Could not create upload directory: %s", uploadsDir);
        }
    }

    /**
     * Persists an uploaded file to disk and creates a {@link FileEntity}
     * row. Returns the entity so the caller can derive the public URL.
     *
     * @param originalName the client-provided filename — kept for display only
     * @param contentType  must be in {@link #ALLOWED}
     * @param sizeBytes    must be &le; {@link #MAX_BYTES}
     * @param bytes        the file contents stream
     * @param uploaderId   logged-in user's id, for the audit trail
     */
    @Transactional
    public FileEntity store(String originalName, String contentType, long sizeBytes,
                            InputStream bytes, Long uploaderId) {
        String ct = contentType == null ? "" : contentType.toLowerCase();
        boolean isImage = ALLOWED_IMAGES.contains(ct);
        boolean isVideo = ALLOWED_VIDEOS.contains(ct);
        if (!isImage && !isVideo) {
            throw new BadRequestException(
                    "Unsupported file type: " + contentType
                    + ". Images: " + String.join(", ", ALLOWED_IMAGES)
                    + ". Videos: " + String.join(", ", ALLOWED_VIDEOS));
        }
        long cap = isImage ? MAX_BYTES_IMAGE : MAX_BYTES_VIDEO;
        if (sizeBytes <= 0 || sizeBytes > cap) {
            throw new BadRequestException(
                    String.format("File size %d bytes exceeds the %s cap of %d MB.",
                            sizeBytes, isImage ? "image" : "video", cap / (1024 * 1024)));
        }

        var id = UUID.randomUUID();
        var ext = extensionFor(contentType);
        var path = Path.of(uploadsDir, id + ext);
        try {
            Files.copy(bytes, path, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write uploaded file", e);
        }

        var entity = new FileEntity();
        entity.setId(id);
        entity.setOriginalName(originalName == null ? "unnamed" : originalName);
        entity.setContentType(contentType);
        entity.setSizeBytes(sizeBytes);
        entity.setStoragePath(path.toAbsolutePath().toString());
        entity.setCreatedBy(uploaderId);
        fileRepository.persist(entity);
        LOG.debugf("Stored upload id=%s size=%d by=%s", id, sizeBytes, uploaderId);
        return entity;
    }

    /** Loads metadata + opens an InputStream on the on-disk bytes. */
    public FileWithStream load(UUID id) {
        var entity = fileRepository.findByIdOptional(id)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        var path = Path.of(entity.getStoragePath());
        try {
            return new FileWithStream(entity, Files.newInputStream(path));
        } catch (IOException e) {
            throw new RuntimeException("File metadata exists but bytes are missing: " + path, e);
        }
    }

    private static String extensionFor(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/png"        -> ".png";
            case "image/webp"       -> ".webp";
            case "image/gif"        -> ".gif";
            case "video/mp4"        -> ".mp4";
            case "video/webm"       -> ".webm";
            case "video/quicktime"  -> ".mov";
            default                 -> ".jpg";  // image/jpeg, image/pjpeg, fallback
        };
    }

    /** Pair of file metadata + open stream. Caller closes the stream. */
    public record FileWithStream(FileEntity entity, InputStream bytes) {}
}
