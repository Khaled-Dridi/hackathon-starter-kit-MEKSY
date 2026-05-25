package com.inetum.starter.repository;

import com.inetum.starter.entity.RegistrationEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

    /**
     * Returns a map of actionId → registration count for the given action ids.
     * <p>
     * Implementation note: this uses a single SQL aggregate ({@code GROUP BY action_id})
     * and returns at most {@code actionIds.size()} rows. Previously this method
     * hydrated every matching {@link RegistrationEntity} row as a managed JPA
     * entity and counted them in Java, which made the list-actions endpoint
     * O(total-registrations) and very slow as soon as the registrations table
     * grew. The grouped query is index-friendly (idx_registrations_action).
     */
    public Map<Long, Long> countsForActions(List<Long> actionIds) {
        if (actionIds == null || actionIds.isEmpty()) return Map.of();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = getEntityManager()
                .createQuery(
                        "select r.actionId, count(r) " +
                        "from RegistrationEntity r " +
                        "where r.actionId in :ids " +
                        "group by r.actionId")
                .setParameter("ids", actionIds)
                .getResultList();
        Map<Long, Long> result = new HashMap<>(rows.size());
        for (Object[] row : rows) {
            result.put((Long) row[0], (Long) row[1]);
        }
        return result;
    }

    /**
     * Returns the subset of {@code actionIds} that the given user is registered
     * for. Uses a projection on {@code action_id} only — no entity hydration —
     * because the caller only needs ids. Backed by the unique
     * (user_id, action_id) index, so this is a cheap index scan.
     */
    public Set<Long> actionIdsRegisteredByUser(Long userId, List<Long> actionIds) {
        if (actionIds == null || actionIds.isEmpty()) return Set.of();
        List<Long> rows = getEntityManager()
                .createQuery(
                        "select r.actionId " +
                        "from RegistrationEntity r " +
                        "where r.userId = :userId and r.actionId in :ids",
                        Long.class)
                .setParameter("userId", userId)
                .setParameter("ids", actionIds)
                .getResultList();
        return rows.stream().collect(Collectors.toSet());
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
