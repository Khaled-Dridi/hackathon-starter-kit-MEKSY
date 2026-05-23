package com.inetum.starter.service;

import com.inetum.starter.entity.ActionEntity;
import com.inetum.starter.exception.ResourceNotFoundException;
import com.inetum.starter.repository.ActionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.time.LocalDateTime;
import java.util.List;

@ApplicationScoped
@RequiredArgsConstructor
public class ActionService {

    private static final Logger LOG = Logger.getLogger(ActionService.class);

    private final ActionRepository actionRepository;

    public List<ActionEntity> listAll() {
        return actionRepository.listAll();
    }

    public List<ActionEntity> listOpen() {
        return actionRepository.listOpen();
    }

    public ActionEntity get(Long id) {
        return actionRepository.findByIdOptional(id)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found"));
    }

    @Transactional
    public ActionEntity create(Long creatorUserId,
                               String title,
                               String description,
                               LocalDateTime actionDate,
                               String location,
                               Integer capacity,
                               String oddTag,
                               String impactSummary) {
        var action = new ActionEntity();
        action.setTitle(title);
        action.setDescription(description == null ? "" : description);
        action.setActionDate(actionDate);
        action.setLocation(location);
        action.setCapacity(capacity);
        action.setOddTag(oddTag);
        action.setImpactSummary(impactSummary);
        action.setCreatedBy(creatorUserId);
        actionRepository.persist(action);
        LOG.debugf("Action created id=%s title=%s", action.getId(), title);
        return action;
    }

    @Transactional
    public ActionEntity update(Long id,
                               String title,
                               String description,
                               LocalDateTime actionDate,
                               String location,
                               Integer capacity,
                               String oddTag,
                               String impactSummary) {
        var action = get(id);
        action.setTitle(title);
        action.setDescription(description == null ? "" : description);
        action.setActionDate(actionDate);
        action.setLocation(location);
        action.setCapacity(capacity);
        action.setOddTag(oddTag);
        action.setImpactSummary(impactSummary);
        return action;
    }

    @Transactional
    public ActionEntity close(Long id) {
        var action = get(id);
        action.setIsClosed(true);
        LOG.debugf("Action closed id=%s", id);
        return action;
    }

    @Transactional
    public ActionEntity duplicate(Long sourceId, Long creatorUserId) {
        var src = get(sourceId);
        var copy = new ActionEntity();
        copy.setTitle(src.getTitle() + " (copy)");
        copy.setDescription(src.getDescription());
        copy.setActionDate(src.getActionDate());
        copy.setLocation(src.getLocation());
        copy.setCapacity(src.getCapacity());
        copy.setOddTag(src.getOddTag());
        copy.setIsClosed(false);
        copy.setCreatedBy(creatorUserId);
        actionRepository.persist(copy);
        LOG.debugf("Action duplicated source=%s new=%s", sourceId, copy.getId());
        return copy;
    }

    @Transactional
    public void delete(Long id) {
        var action = get(id);
        actionRepository.delete(action);
        LOG.debugf("Action deleted id=%s", id);
    }
}
