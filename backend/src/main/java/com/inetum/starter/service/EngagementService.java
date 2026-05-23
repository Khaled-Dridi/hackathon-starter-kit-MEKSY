package com.inetum.starter.service;

import com.inetum.starter.repository.RegistrationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@ApplicationScoped
@RequiredArgsConstructor
public class EngagementService {

    private static final LocalDate SEASON_START = LocalDate.of(2026, 1, 1);

    private final RegistrationRepository registrationRepository;

    public LocalDate seasonStart() {
        return SEASON_START;
    }

    public long distinctParticipantsThisSeason() {
        return registrationRepository.distinctUsersSince(SEASON_START.atStartOfDay());
    }

    public long distinctParticipantsSince(LocalDateTime since) {
        return registrationRepository.distinctUsersSince(since);
    }
}
