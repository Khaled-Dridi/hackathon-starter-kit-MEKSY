package com.inetum.starter.repository;

import com.inetum.starter.entity.ProposalEntity;
import com.inetum.starter.entity.ProposalStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ProposalRepository implements PanacheRepository<ProposalEntity> {

    public List<ProposalEntity> listAll() {
        return listAll(Sort.by("createdAt").descending());
    }

    public List<ProposalEntity> listByStatus(ProposalStatus status) {
        return list("status", Sort.by("createdAt").descending(), status);
    }

    public List<ProposalEntity> listByUser(Long userId) {
        return list("userId", Sort.by("createdAt").descending(), userId);
    }
}
