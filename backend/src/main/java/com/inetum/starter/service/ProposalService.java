package com.inetum.starter.service;

import com.inetum.starter.entity.ProposalEntity;
import com.inetum.starter.entity.ProposalStatus;
import com.inetum.starter.events.DomainEvent;
import com.inetum.starter.exception.ResourceNotFoundException;
import com.inetum.starter.repository.ProposalRepository;
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
public class ProposalService {

    private static final Logger LOG = Logger.getLogger(ProposalService.class);

    private final ProposalRepository proposalRepository;
    private final UserRepository userRepository;
    private final Event<DomainEvent> events;

    public List<ProposalEntity> listAll() {
        return proposalRepository.listAll();
    }

    public List<ProposalEntity> listByStatus(ProposalStatus status) {
        return proposalRepository.listByStatus(status);
    }

    public List<ProposalEntity> listMine(Long userId) {
        return proposalRepository.listByUser(userId);
    }

    public ProposalEntity get(Long id) {
        return proposalRepository.findByIdOptional(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal not found"));
    }

    @Transactional
    public ProposalEntity create(Long userId, String title, String description, String imageUrl) {
        var proposal = new ProposalEntity();
        proposal.setUserId(userId);
        proposal.setTitle(title);
        proposal.setDescription(description == null ? "" : description);
        proposal.setImageUrl(imageUrl);
        proposalRepository.persist(proposal);
        LOG.debugf("Proposal created id=%s userId=%s", proposal.getId(), userId);
        events.fire(DomainEvent.userScoped("proposal.created", null, userId,
                Map.of("id", proposal.getId(), "title", proposal.getTitle())));
        return proposal;
    }

    @Transactional
    public ProposalEntity updateStatus(Long id, ProposalStatus status) {
        var proposal = get(id);
        proposal.setStatus(status);
        LOG.debugf("Proposal status changed id=%s status=%s", id, status);
        events.fire(DomainEvent.userScoped("proposal.status.changed", null, proposal.getUserId(),
                Map.of("id", id, "status", status.name())));
        return proposal;
    }

    public String emailForUser(Long userId) {
        return userRepository.findByIdOptional(userId)
                .map(u -> u.getEmail())
                .orElse("unknown");
    }
}
