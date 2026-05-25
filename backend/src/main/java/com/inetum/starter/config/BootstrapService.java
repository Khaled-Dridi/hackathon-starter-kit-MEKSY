package com.inetum.starter.config;

import com.inetum.starter.entity.Role;
import com.inetum.starter.repository.ActionRepository;
import com.inetum.starter.repository.UserRepository;
import com.inetum.starter.service.ActionService;
import com.inetum.starter.service.UserService;
import io.quarkus.arc.profile.IfBuildProfile;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Dev-profile seeder: ensures the two known dev users exist (so the login
 * form's pre-filled credentials work on a fresh DB) and — if the actions
 * table is empty — also seeds a handful of demo charity actions spread
 * across France so the new map view has something to render on day one.
 *
 * <p>Idempotent: nothing happens if the records already exist. Safe to
 * call on every startup.
 */
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
    private final UserRepository userRepository;
    private final ActionRepository actionRepository;
    private final ActionService actionService;

    void onStart(@Observes StartupEvent event) {
        seedUser(ADMIN_EMAIL, ADMIN_PASSWORD, Set.of(Role.ADMIN, Role.USER));
        seedUser(USER_EMAIL, USER_PASSWORD, Set.of(Role.USER));
        seedActionsIfEmpty();
    }

    private void seedUser(String email, String rawPassword, Set<Role> roles) {
        if (userService.existsByEmail(email)) return;
        userService.create(email, rawPassword, roles);
        LOG.infof("Seeded dev user '%s' roles=%s (password masked)", email, roles);
    }

    /**
     * Seeds the demo actions if NO existing action has geographic coordinates.
     * <p>
     * This is intentionally laxer than "table is empty": a developer who has
     * been testing the app before the map feature shipped has a bunch of
     * actions without coords, and we want the map view to have something to
     * show on the next boot. As soon as one action with coords exists
     * (either from a successful previous seed or from an admin pinning a
     * location manually), this method becomes a no-op.
     */
    @Transactional
    void seedActionsIfEmpty() {
        long withCoords = actionRepository.find("latitude is not null and longitude is not null")
                .count();
        if (withCoords > 0) {
            return;
        }
        var adminId = userRepository.findByEmail(ADMIN_EMAIL)
                .map(u -> u.getId())
                .orElse(null);
        if (adminId == null) {
            LOG.warn("Cannot seed demo actions: admin user not found.");
            return;
        }

        // Pre-baked demo actions across France with realistic coordinates.
        // Dates are spread over the next ~3 months so the "This month"
        // filter on the actions list has something to show too.
        var now = LocalDateTime.now();
        List<DemoAction> demos = List.of(
                new DemoAction(
                        "Riverbank clean-up — quai de Seine",
                        "Join us for a morning along the Seine to collect plastic, " +
                        "glass and stray packaging. Gloves, bags and a coffee are " +
                        "provided. Bring sturdy shoes and a windbreaker; we work " +
                        "rain or shine. Roughly 3 hours of light effort, perfect " +
                        "for first-timers.",
                        now.plusDays(7).withHour(9).withMinute(0).withSecond(0).withNano(0),
                        "Paris 12ᵉ · quai de Bercy",
                        new BigDecimal("48.838800"), new BigDecimal("2.378600"),
                        18, "SDG_14"),
                new DemoAction(
                        "CV workshops with Restos du Cœur",
                        "Spend an afternoon coaching people re-entering the workforce: " +
                        "polishing CVs, preparing for interviews, mock-Q&A. No HR " +
                        "background needed — just patience and a friendly ear.",
                        now.plusDays(14).withHour(14).withMinute(0).withSecond(0).withNano(0),
                        "Lyon 3ᵉ · part-Dieu",
                        new BigDecimal("45.760500"), new BigDecimal("4.859700"),
                        12, "SDG_10"),
                new DemoAction(
                        "Tree planting on the city greenway",
                        "Help the city's green corridor program plant 200 saplings " +
                        "along the new northern greenway. Tools and refreshments " +
                        "provided. A great half-day outside, family-friendly.",
                        now.plusDays(21).withHour(10).withMinute(0).withSecond(0).withNano(0),
                        "Lille · parc de la Citadelle",
                        new BigDecimal("50.640000"), new BigDecimal("3.043300"),
                        25, "SDG_15"),
                new DemoAction(
                        "Coding club for middle-schoolers",
                        "One evening of running Scratch and micro:bit activities for " +
                        "30 kids from underserved schools. We pair you with an " +
                        "experienced animator — no prep on your side, just show up " +
                        "with energy.",
                        now.plusDays(28).withHour(17).withMinute(30).withSecond(0).withNano(0),
                        "Toulouse · Mirail",
                        new BigDecimal("43.580000"), new BigDecimal("1.402000"),
                        8, "SDG_04"),
                new DemoAction(
                        "Beach clean-up — Calanque de Sormiou",
                        "A full day in the Calanques National Park collecting marine " +
                        "litter from the rocky coves. Bring water, sunscreen and " +
                        "good walking shoes. Picnic provided. Limited seats — " +
                        "carpooling organised from the office.",
                        now.plusDays(35).withHour(9).withMinute(0).withSecond(0).withNano(0),
                        "Marseille · Calanque de Sormiou",
                        new BigDecimal("43.213000"), new BigDecimal("5.413000"),
                        15, "SDG_14"),
                new DemoAction(
                        "Soup kitchen at the docks",
                        "Prepare, serve and share a hot meal with people sleeping " +
                        "rough near the port. We start at 18:00 and wrap by 21:30. " +
                        "Hot drinks for volunteers afterwards.",
                        now.plusDays(42).withHour(18).withMinute(0).withSecond(0).withNano(0),
                        "Nantes · Île de Nantes",
                        new BigDecimal("47.205800"), new BigDecimal("-1.563900"),
                        10, "SDG_02")
        );

        for (var d : demos) {
            actionService.create(
                    adminId,
                    d.title, d.description, d.date, d.location,
                    d.latitude, d.longitude,
                    d.capacity, d.oddTag,
                    null, null);
        }
        LOG.infof("Seeded %d demo actions with geographic coordinates.", demos.size());
    }

    /** Inline value type — keeps the demo list readable. */
    private record DemoAction(
            String title,
            String description,
            LocalDateTime date,
            String location,
            BigDecimal latitude,
            BigDecimal longitude,
            int capacity,
            String oddTag) {}
}
