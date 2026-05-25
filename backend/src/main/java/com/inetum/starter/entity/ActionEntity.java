package com.inetum.starter.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "actions")
@Getter
@Setter
@NoArgsConstructor
public class ActionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description = "";

    @Column(name = "action_date", nullable = false)
    private LocalDateTime actionDate;

    @Column(length = 200)
    private String location;

    /** Geographic coordinates for the map view. Nullable for legacy rows. */
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "odd_tag", length = 80)
    private String oddTag;

    @Column(name = "is_closed", nullable = false)
    private Boolean isClosed = false;

    @Column(name = "impact_summary", columnDefinition = "text")
    private String impactSummary;

    /**
     * Cover image. Either a fully-qualified external URL ("https://…")
     * or a relative path to an uploaded file ("/files/{uuid}"). Frontend
     * renders both the same way via {@code <img src>}.
     */
    @Column(name = "image_url", length = 2000)
    private String imageUrl;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (isClosed == null) isClosed = false;
        if (description == null) description = "";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
