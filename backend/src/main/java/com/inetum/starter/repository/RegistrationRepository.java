package com.inetum.starter.repository;

import com.inetum.starter.entity.RegistrationEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@ApplicationScoped
public class RegistrationRepository implements PanacheRepository<RegistrationEntity> {

    public Optional<RegistrationEntity> find(Long userId, Long actionId) {
        return find("userId = ?1 and actionId = ?2", userId, actionId).firstResultOptional();
    }

    public List<RegistrationEntity> listForAction(Long actionId) {
        return list("actionId", Sort.by("createdAt").ascending(), actionId);
    }

    public long countForAction(Long actionId) {
        return count("actionId", actionId);
    }

    public Map<Long, Long> countsForActions(List<Long> actionIds) {
        if (actionIds == null || actionIds.isEmpty()) return Map.of();
        return find("actionId in ?1", actionIds).list().stream()
                .collect(Collectors.groupingBy(
                        RegistrationEntity::getActionId,
                        Collectors.counting()));
    }

    public long distinctUsersSince(LocalDateTime since) {
        return getEntityManager()
                .createQuery("select count(distinct r.userId) from RegistrationEntity r " +
                             "where r.createdAt >= :since", Long.class)
                .setParameter("since", since)
                .getSingleResult();
    }

    /**
     * Returns true if the user already has a registration for any action
     * whose action_date falls in the given calendar year. RegistrationEntity
     * and ActionEntity are not JPA-linked so we cross-join via the id field.
     */
    public boolean userHasRegistrationInYear(Long userId, int year, Long excludeActionId) {
        var qs = "select count(r) from RegistrationEntity r, ActionEntity a " +
                "where r.actionId = a.id " +
                "and r.userId = :userId " +
                "and extract(year from a.actionDate) = :year";
        if (excludeActionId != null) {
            qs += " and r.actionId <> :exclude";
        }
        var q = getEntityManager().createQuery(qs, Long.class)
                .setParameter("userId", userId)
                .setParameter("year", year);
        if (excludeActionId != null) {
            q.setParameter("exclude", excludeActionId);
        }
        return q.getSingleResult() > 0;
    }
}
