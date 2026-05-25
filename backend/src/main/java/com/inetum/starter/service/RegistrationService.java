package com.inetum.starter.service;

import com.inetum.starter.entity.ActionEntity;
import com.inetum.starter.entity.RegistrationEntity;
import com.inetum.starter.events.DomainEvent;
import com.inetum.starter.exception.ActionClosedException;
import com.inetum.starter.exception.ActionFullException;
import com.inetum.starter.exception.AlreadyRegisteredException;
import com.inetum.starter.exception.AlreadyRegisteredThisYearException;
import com.inetum.starter.exception.NotRegisteredException;
import com.inetum.starter.repository.ActionRepository;
import com.inetum.starter.repository.RegistrationRepository;
import com.inetum.starter.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;

@ApplicationScoped
@RequiredArgsConstructor
public class RegistrationService {

    private static final Logger LOG = Logger.getLogger(RegistrationService.class);

    private final ActionRepository actionRepository;
    private final RegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final Event<DomainEvent> events;

    @Transactional
    public RegistrationEntity register(Long userId, Long actionId) {
        ActionEntity action = actionRepository.findByIdOptional(actionId)
                .orElseThrow(() -> new com.inetum.starter.exception.ResourceNotFoundException(
                        "Action not found"));

        if (Boolean.TRUE.equals(action.getIsClosed())) {
            throw new ActionClosedException();
        }
        if (registrationRepository.find(userId, actionId).isPresent()) {
            throw new AlreadyRegisteredException();
        }
        int actionYear = action.getActionDate().getYear();
        if (registrationRepository.userHasRegistrationInYear(userId, actionYear, actionId)) {
            throw new AlreadyRegisteredThisYearException(actionYear);
        }
        long count = registrationRepository.countForAction(actionId);
        if (count >= action.getCapacity()) {
            throw new ActionFullException();
        }

        var registration = new RegistrationEntity();
        registration.setUserId(userId);
        registration.setActionId(actionId);
        registrationRepository.persist(registration);
        LOG.debugf("Registration created userId=%s actionId=%s", userId, actionId);

        long newCount = count + 1;
        // Personal event so the registering user's other tabs update.
        events.fire(DomainEvent.userScoped("registration.created", actionId, userId,
                Map.of("registeredCount", newCount, "capacity", action.getCapacity())));
        // Broadcast seat change so the public list/detail refreshes for everyone.
        events.fire(DomainEvent.action("action.seats.changed", actionId,
                Map.of("registeredCount", newCount, "capacity", action.getCapacity())));
        return registration;
    }

    @Transactional
    public void unregister(Long userId, Long actionId) {
        var registration = registrationRepository.find(userId, actionId)
                .orElseThrow(NotRegisteredException::new);
        registrationRepository.delete(registration);
        LOG.debugf("Registration removed userId=%s actionId=%s", userId, actionId);

        long after = registrationRepository.countForAction(actionId);
        events.fire(DomainEvent.userScoped("registration.cancelled", actionId, userId,
                Map.of("registeredCount", after)));
        events.fire(DomainEvent.action("action.seats.changed", actionId,
                Map.of("registeredCount", after)));
    }

    public List<RegistrationEntity> listForAction(Long actionId) {
        return registrationRepository.listForAction(actionId);
    }

    public String emailForUser(Long userId) {
        return userRepository.findByIdOptional(userId)
                .map(u -> u.getEmail())
                .orElse("unknown");
    }
}
