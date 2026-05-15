package com.inetum.starter.config;

import com.inetum.starter.entity.Role;
import com.inetum.starter.service.UserService;
import io.quarkus.arc.profile.IfBuildProfile;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.Set;

@ApplicationScoped
@IfBuildProfile("dev")
@RequiredArgsConstructor
public class BootstrapService {

    private static final Logger LOG = Logger.getLogger(BootstrapService.class);

    private static final String ADMIN_EMAIL = "admin@local";
    private static final String ADMIN_PASSWORD = "admin";
    private static final String USER_EMAIL = "user@local";
    private static final String USER_PASSWORD = "user";

    private final UserService userService;

    void onStart(@Observes StartupEvent event) {
        seed(ADMIN_EMAIL, ADMIN_PASSWORD, Set.of(Role.ADMIN, Role.USER));
        seed(USER_EMAIL, USER_PASSWORD, Set.of(Role.USER));
    }

    private void seed(String email, String rawPassword, Set<Role> roles) {
        if (userService.existsByEmail(email)) return;
        userService.create(email, rawPassword, roles);
        LOG.infof("Seeded dev user '%s' roles=%s (password masked)", email, roles);
    }
}
