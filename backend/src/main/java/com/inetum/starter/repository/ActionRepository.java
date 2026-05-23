package com.inetum.starter.repository;

import com.inetum.starter.entity.ActionEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class ActionRepository implements PanacheRepository<ActionEntity> {

    public List<ActionEntity> listAll() {
        return listAll(Sort.by("actionDate").ascending());
    }

    public List<ActionEntity> listOpen() {
        return list("isClosed = false", Sort.by("actionDate").ascending());
    }
}
