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
 * table is empty — also seeds a roster of Tunisia-themed charity actions
 * so the new map view and date filters have something realistic to render
 * on day one.
 *
 * <p>Idempotent: nothing happens if matching records already exist. Safe
 * to call on every startup. The action-seed step is gated on "no action
 * has coords yet", which is both the fresh-DB case and the case after
 * Flyway V9 wipes the legacy French demo data.
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
     * Seeds the Tunisia-themed demo actions if NO existing action has
     * geographic coordinates. The check is laxer than "table is empty"
     * deliberately — a dev who had been testing the app before the map
     * feature shipped has actions without coords, and we want the map
     * view to have something to render after their next boot.
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

        // Tunisia-themed demo actions across the country, spanning Q2–Q4 2026.
        // One action sits intentionally in the past so the "Passée / Past"
        // pill + the deadline-locked CTA have something to demo against.
        // Photos use LoremFlickr — Creative-Commons Flickr photos matched by
        // keyword, deterministic via ?lock=N so the same lock always returns
        // the same image (cards stay visually consistent across reloads).
        // Keywords are chosen to match the action's actual topic rather than
        // pulling generic stock photos.
        var now = LocalDateTime.now();
        List<DemoAction> demos = List.of(
                new DemoAction(
                        "Iftar partagé — Sidi Hassine",
                        "Cuisinez et servez un iftar pour 80 personnes au centre " +
                        "communautaire de Sidi Hassine pendant le mois de Ramadan. " +
                        "L'équipe arrive à 16h pour la préparation, sert à partir de " +
                        "18h30. Tenue confortable, on travaille debout. Une expérience " +
                        "humaine forte, à vivre au moins une fois.",
                        LocalDateTime.of(2026, 3, 15, 16, 0),
                        "Sidi Hassine · centre communautaire",
                        new BigDecimal("36.772300"), new BigDecimal("10.129400"),
                        20, "SDG_02",
                        "https://loremflickr.com/1200/675/food,sharing,community,dinner?lock=1101"),
                new DemoAction(
                        "Plantation d'arbres — Cap Bon",
                        "Une matinée à reboiser les coteaux du Cap Bon avec l'association " +
                        "Tunisie Verte. 300 plants d'arganier et de caroubier à mettre " +
                        "en terre. Outils, gants et collation fournis. Prévoyez chapeau, " +
                        "crème solaire et chaussures fermées. Covoiturage organisé depuis " +
                        "le bureau Lac 2.",
                        now.plusDays(11).withHour(8).withMinute(30).withSecond(0).withNano(0),
                        "Nabeul · coteaux du Cap Bon",
                        new BigDecimal("36.456100"), new BigDecimal("10.737600"),
                        25, "SDG_15",
                        "https://loremflickr.com/1200/675/planting,trees,sapling,forest?lock=1102"),
                new DemoAction(
                        "Nettoyage de plage — La Marsa",
                        "Une matinée le long de la corniche de La Marsa pour ramasser " +
                        "plastiques, verre et emballages échoués. Gants, sacs et café " +
                        "sont fournis. Prévoyez des chaussures fermées et un coupe-vent. " +
                        "Environ 3 heures d'effort léger, idéal pour les premières fois.",
                        now.plusDays(19).withHour(9).withMinute(0).withSecond(0).withNano(0),
                        "La Marsa · corniche",
                        new BigDecimal("36.878400"), new BigDecimal("10.324700"),
                        30, "SDG_14",
                        "https://loremflickr.com/1200/675/beach,ocean,plastic,cleanup?lock=1103"),
                new DemoAction(
                        "Don du sang à Inetum — Tunis Lac 2",
                        "Le Centre national de transfusion sanguine s'installe au bureau " +
                        "pour la journée. Don rapide (45 min avec le bilan), collation " +
                        "fournie. Aucun rendez-vous nécessaire — venez sur votre " +
                        "créneau préféré. Important : pas à jeun, mais évitez les " +
                        "repas trop gras le matin.",
                        now.plusDays(26).withHour(10).withMinute(0).withSecond(0).withNano(0),
                        "Tunis · Lac 2, bureau Inetum",
                        new BigDecimal("36.833600"), new BigDecimal("10.245300"),
                        40, "SDG_03",
                        "https://loremflickr.com/1200/675/blood,donation,medical,hospital?lock=1104"),
                new DemoAction(
                        "Atelier code pour collégiens — Médina de Tunis",
                        "Une soirée à animer des activités Scratch et micro:bit pour 25 " +
                        "élèves d'un collège du centre-ville. Vous êtes en binôme avec " +
                        "un animateur expérimenté — pas de préparation de votre côté, " +
                        "venez juste avec de l'énergie et l'envie de transmettre.",
                        now.plusDays(33).withHour(17).withMinute(30).withSecond(0).withNano(0),
                        "Médina de Tunis · maison de jeunes",
                        new BigDecimal("36.797500"), new BigDecimal("10.173300"),
                        8, "SDG_04",
                        "https://loremflickr.com/1200/675/children,laptop,classroom,coding?lock=1105"),
                new DemoAction(
                        "Ateliers CV pour femmes en reconversion — Sfax",
                        "Un après-midi à coacher des femmes qui retournent sur le marché " +
                        "du travail : relecture de CV, préparation aux entretiens, mock-" +
                        "Q&A. Aucun background RH requis — juste de la patience et une " +
                        "oreille bienveillante. Partenariat avec l'UNFT.",
                        now.plusDays(40).withHour(14).withMinute(0).withSecond(0).withNano(0),
                        "Sfax · UNFT, centre-ville",
                        new BigDecimal("34.740600"), new BigDecimal("10.760300"),
                        12, "SDG_05",
                        "https://loremflickr.com/1200/675/workshop,women,meeting,mentoring?lock=1106"),
                new DemoAction(
                        "Cours d'anglais à l'orphelinat SOS — Kairouan",
                        "Trois heures de cours d'anglais ludiques (jeux, chansons, " +
                        "dialogues) avec 20 enfants de l'orphelinat SOS de Kairouan. " +
                        "Niveau adapté à chaque âge. Le matériel pédagogique est prêt, " +
                        "il suffit de venir avec votre énergie. Goûter offert aux " +
                        "bénévoles après.",
                        now.plusDays(47).withHour(14).withMinute(0).withSecond(0).withNano(0),
                        "Kairouan · orphelinat SOS Villages",
                        new BigDecimal("35.678100"), new BigDecimal("10.096300"),
                        6, "SDG_04",
                        "https://loremflickr.com/1200/675/children,classroom,teacher,books?lock=1107"),
                new DemoAction(
                        "Journée au refuge animalier — Bizerte",
                        "Une journée au refuge SPCA de Bizerte : promenade des chiens, " +
                        "nettoyage des box, socialisation avec les chats, petits travaux " +
                        "de bricolage. Idéal en famille (à partir de 10 ans). Le refuge " +
                        "fournit le déjeuner. Prévoyez tenue qui ne craint rien.",
                        now.plusDays(54).withHour(9).withMinute(30).withSecond(0).withNano(0),
                        "Bizerte · refuge SPCA",
                        new BigDecimal("37.274600"), new BigDecimal("9.874800"),
                        10, "SDG_15",
                        "https://loremflickr.com/1200/675/dog,puppy,shelter,rescue?lock=1108"),
                new DemoAction(
                        "Distribution de fournitures scolaires — Kasserine",
                        "Préparation et distribution de 500 kits scolaires (cartables, " +
                        "cahiers, stylos) aux enfants de Kasserine avant la rentrée. " +
                        "Préparation des paquets le matin, distribution l'après-midi. " +
                        "Une logistique simple, un impact direct.",
                        now.plusDays(95).withHour(9).withMinute(0).withSecond(0).withNano(0),
                        "Kasserine · centre culturel",
                        new BigDecimal("35.167500"), new BigDecimal("8.836300"),
                        30, "SDG_04",
                        "https://loremflickr.com/1200/675/school,supplies,backpack,pencils?lock=1109"),
                new DemoAction(
                        "Rénovation des remparts — Médina de Sousse",
                        "Une journée avec l'INP à participer à la restauration légère " +
                        "des remparts UNESCO de la Médina de Sousse : ponçage, " +
                        "rejointoiement, peinture. Encadrement par des artisans " +
                        "qualifiés. Travail physique, mais accessible à tous.",
                        now.plusDays(110).withHour(8).withMinute(30).withSecond(0).withNano(0),
                        "Sousse · Médina, porte de la Kasbah",
                        new BigDecimal("35.827300"), new BigDecimal("10.640600"),
                        15, "SDG_11",
                        "https://loremflickr.com/1200/675/medina,sousse,architecture,arch?lock=1110"),
                new DemoAction(
                        "Récolte d'olives — coopérative de Sfax",
                        "Trois jours dans les oliveraies d'une coopérative familiale " +
                        "près de Sfax, en pleine saison de récolte. Hébergement et " +
                        "repas chez l'habitant. Apprenez le geste traditionnel du " +
                        "gaulage, partagez la table, repartez avec une bouteille " +
                        "d'huile pressée à froid.",
                        now.plusDays(145).withHour(8).withMinute(0).withSecond(0).withNano(0),
                        "Sfax · oliveraies d'Agareb",
                        new BigDecimal("34.732000"), new BigDecimal("10.529000"),
                        12, "SDG_02",
                        "https://loremflickr.com/1200/675/olive,harvest,trees,farm?lock=1111"),
                new DemoAction(
                        "Après-midi à la maison de retraite — Sousse",
                        "Un après-midi de partage avec les résidents de la maison de " +
                        "retraite Dar El Mouwasset : lectures, jeux de société, " +
                        "musique, discussions. Aucune compétence requise — juste " +
                        "votre présence et un peu de temps. Goûter offert. Une " +
                        "expérience étonnamment ressourçante.",
                        now.plusDays(165).withHour(14).withMinute(30).withSecond(0).withNano(0),
                        "Sousse · Dar El Mouwasset",
                        new BigDecimal("35.825400"), new BigDecimal("10.636000"),
                        10, "SDG_03",
                        "https://loremflickr.com/1200/675/elderly,senior,hands,grandparent?lock=1112")
        );

        for (var d : demos) {
            actionService.create(
                    adminId,
                    d.title, d.description, d.date, d.location,
                    d.latitude, d.longitude,
                    d.capacity, d.oddTag,
                    null, d.imageUrl);
        }
        LOG.infof("Seeded %d Tunisia-themed demo actions with coordinates and photos.", demos.size());
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
            String oddTag,
            String imageUrl) {}
}
