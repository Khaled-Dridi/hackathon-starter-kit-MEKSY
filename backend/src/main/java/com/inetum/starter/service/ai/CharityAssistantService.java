package com.inetum.starter.service.ai;

import com.inetum.starter.dto.response.AssistantChatResponseDTO;
import com.inetum.starter.dto.response.RelatedActionDTO;
import com.inetum.starter.entity.ActionEntity;
import com.inetum.starter.repository.ActionRepository;
import com.inetum.starter.repository.RegistrationRepository;
import com.inetum.starter.repository.UserRepository;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Conversational AI assistant for the Charity Day platform.
 *
 * <h3>Talks to the chat model directly (no {@code @RegisterAiService})</h3>
 * Quarkus-LangChain4j's {@code @RegisterAiService} routes the system
 * message through Qute templating and looks up method-parameter names
 * via reflection. In Quarkus dev mode the {@code -parameters} javac
 * flag does NOT make it through (verified — the warning persists even
 * after setting {@code maven.compiler.parameters=true} in pom.xml), so
 * any AI service that uses {@code @MemoryId} explodes with
 * {@code NullPointerException} in {@code TemplateInstanceBase.data}.
 *
 * <p>We work around this by talking to the lower-level {@link ChatModel}
 * bean directly — no reflection, no Qute, full control.
 *
 * <h3>Action references</h3>
 * The system prompt teaches the LLM a tiny inline syntax — {@code [[action:N]]}
 * — for naming actions it wants the user to consider. After each
 * response we parse those markers out (regex), look up the matching
 * actions, and return them in {@link AssistantChatResponseDTO#getRelatedActions()}.
 * The frontend renders each as a card with Open / Register / Cancel
 * buttons. We strip the markers from the user-facing text so they
 * never see the raw syntax.
 *
 * <h3>Memory</h3>
 * Per-session conversation history is held in an in-memory
 * {@link ConcurrentHashMap}, capped at the last {@link #MAX_MEMORY_TURNS}
 * user/assistant message pairs. Sessions disappear on backend restart —
 * fine for hackathon scope.
 */
@ApplicationScoped
@RequiredArgsConstructor
public class CharityAssistantService {

    private static final Logger LOG = Logger.getLogger(CharityAssistantService.class);

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("EEE, MMM d 'at' HH:mm");

    /** Keep the last N user+assistant pairs per session — older turns are evicted. */
    private static final int MAX_MEMORY_TURNS = 12;

    /** Inline marker the LLM emits to reference an action. We strip these
     *  from the user-facing reply text and return the IDs separately. */
    private static final Pattern ACTION_MARKER = Pattern.compile("\\[\\[action:(\\d+)]]");

    @Inject
    ChatModel chatModel;

    private final ActionRepository actionRepository;
    private final RegistrationRepository registrationRepository;
    private final UserRepository userRepository;

    /** sessionId → ordered conversation history (alternating user/AI, no system). */
    private final Map<String, Deque<ChatMessage>> memoryBySession = new ConcurrentHashMap<>();

    public AssistantChatResponseDTO chat(String sessionId, Long currentUserId, String userMessage) {
        // Fresh system prompt each turn so actions context is current.
        var systemPrompt = buildSystemPrompt(currentUserId);

        var history = memoryBySession.computeIfAbsent(sessionId, k -> new ArrayDeque<>());

        var messages = new ArrayList<ChatMessage>(history.size() + 2);
        messages.add(SystemMessage.from(systemPrompt));
        messages.addAll(history);
        messages.add(UserMessage.from(userMessage));

        LOG.debugf("Assistant chat session=%s user=%s history=%d",
                sessionId, currentUserId, history.size());

        ChatResponse response = chatModel.chat(messages);
        String rawReply = response.aiMessage().text();

        // Extract referenced action ids in order of first appearance.
        var referencedIds = extractActionIds(rawReply);
        // Strip the markers from the user-facing text. We replace each
        // [[action:N]] with nothing — the assistant should have written
        // the action title alongside it, so the text reads cleanly.
        var cleanReply = ACTION_MARKER.matcher(rawReply).replaceAll("").trim();
        // Collapse "word  ," / double-spaces left over after stripping.
        cleanReply = cleanReply.replaceAll(" +([,.;:])", "$1").replaceAll("  +", " ");

        // Persist BOTH the user turn and the AI's RAW (with markers) reply
        // in memory — keeping the markers lets the model self-reference its
        // earlier suggestions when answering follow-ups.
        history.addLast(UserMessage.from(userMessage));
        history.addLast(AiMessage.from(rawReply));
        trimMemory(history);

        var related = resolveActions(referencedIds, currentUserId);
        return new AssistantChatResponseDTO(cleanReply, related);
    }

    /** Reset session memory (frontend "Start a new conversation" button). */
    public void resetMemory(String sessionId) {
        memoryBySession.remove(sessionId);
    }

    private static List<Long> extractActionIds(String text) {
        var matcher = ACTION_MARKER.matcher(text);
        // LinkedHashSet preserves first-appearance order AND dedupes.
        Set<Long> ordered = new LinkedHashSet<>();
        while (matcher.find()) {
            try {
                ordered.add(Long.parseLong(matcher.group(1)));
            } catch (NumberFormatException ignore) { /* skip malformed */ }
        }
        return new ArrayList<>(ordered);
    }

    private List<RelatedActionDTO> resolveActions(List<Long> ids, Long currentUserId) {
        if (ids.isEmpty()) return List.of();
        var registeredIds =
                registrationRepository.actionIdsRegisteredByUser(currentUserId, ids);
        var counts = registrationRepository.countsForActions(ids);
        var out = new ArrayList<RelatedActionDTO>(ids.size());
        for (Long id : ids) {
            var a = actionRepository.findByIdOptional(id).orElse(null);
            if (a == null) continue;  // LLM hallucinated an id; skip silently
            long registered = counts.getOrDefault(id, 0L);
            int seatsLeft = Math.max(0, a.getCapacity() - (int) registered);
            out.add(new RelatedActionDTO(
                    a.getId(), a.getTitle(), a.getLocation(), a.getActionDate(),
                    Boolean.TRUE.equals(a.getIsClosed()),
                    seatsLeft,
                    registeredIds.contains(id)));
        }
        return out;
    }

    private static void trimMemory(Deque<ChatMessage> history) {
        int cap = MAX_MEMORY_TURNS * 2;
        while (history.size() > cap) {
            history.removeFirst();
        }
    }

    private String buildSystemPrompt(Long currentUserId) {
        return """
                You are the AI assistant on Inetum Charity Day platform, an
                internal mobilisation tool that helps colleagues register for
                volunteer actions. Your job is to help the user find and pick
                the single action that fits them best this year, and to point
                them to the right action page when they want to register.

                Rules you must follow:
                - Each employee can register for ONE action per calendar year.
                  Cancelling a registration frees the slot. Frame your advice
                  around helping the user choose wisely.
                - Only suggest actions from the list below. Never invent
                  actions, NGOs, dates, locations, phone numbers, or addresses.
                - You CANNOT register, unregister, edit, or perform any action
                  on the user behalf. The user has buttons to do that — your
                  job is to recommend.
                - Reply in the same language the user wrote in, French or
                  English. Warm but concise tone.
                - Use plain text only. No markdown, no bullet lists with stars.
                  Short paragraphs and natural sentences.
                - Do not talk about politics, religion, salaries, Chronotime,
                  JC codes, timesheets, or PTO. Charity Day is independent
                  from all of that.
                - If the user asks about something off-topic, politely steer
                  back to Charity Day in one sentence.

                IMPORTANT — how to reference an action:
                Every action below has an id in square brackets like [Action #14].
                When you mention an action in your reply, ALSO append the
                inline marker [[action:N]] right after its title (replacing N
                with the id). The user-facing UI strips these markers and
                turns them into clickable action cards with Open / Register /
                Cancel buttons. Examples:
                  - "I'd suggest the Riverbank clean-up [[action:8]] — it's on Sunday morning."
                  - "Between [[action:9]] and [[action:11]], the second one is closer to Toulouse."
                Only mark actions you are actually recommending or comparing —
                don't dump every id at the end. If you have nothing concrete
                to recommend, don't emit any markers.

                Current open actions:
                """ + buildActionsContext() + """

                About the user:
                """ + buildUserContext(currentUserId);
    }

    private String buildActionsContext() {
        List<ActionEntity> open = actionRepository.listOpen();
        if (open.isEmpty()) {
            return "(There are no open actions right now. Tell the user to check back soon.)";
        }
        var ids = open.stream().map(ActionEntity::getId).toList();
        var counts = registrationRepository.countsForActions(ids);
        var sb = new StringBuilder();
        for (var a : open) {
            long registered = counts.getOrDefault(a.getId(), 0L);
            int seatsLeft = Math.max(0, a.getCapacity() - (int) registered);
            // Lead each block with the id so the LLM has it handy for the marker.
            sb.append("- [Action #").append(a.getId()).append("] \"")
              .append(a.getTitle()).append("\"\n");
            sb.append("  Date: ").append(a.getActionDate().format(DATE_FMT)).append('\n');
            if (a.getLocation() != null && !a.getLocation().isBlank()) {
                sb.append("  Location: ").append(a.getLocation()).append('\n');
            }
            if (a.getOddTag() != null && !a.getOddTag().isBlank()) {
                sb.append("  SDG / theme: ").append(a.getOddTag()).append('\n');
            }
            sb.append("  Seats: ")
              .append(seatsLeft).append(" left out of ").append(a.getCapacity()).append('\n');
            if (a.getDescription() != null && !a.getDescription().isBlank()) {
                String desc = a.getDescription().trim().replaceAll("\\s+", " ");
                if (desc.length() > 240) desc = desc.substring(0, 237) + "…";
                sb.append("  Summary: ").append(desc).append('\n');
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    private String buildUserContext(Long userId) {
        var user = userRepository.findByIdOptional(userId).orElse(null);
        if (user == null) return "(Unknown user.)";
        int year = LocalDate.now().getYear();
        boolean usedRegistration =
                registrationRepository.userHasRegistrationInYear(userId, year, null);
        var sb = new StringBuilder();
        sb.append("Email: ").append(user.getEmail()).append('\n');
        if (usedRegistration) {
            sb.append("Already registered for an action this year (").append(year)
              .append("). Would need to cancel that registration first to switch.\n");
        } else {
            sb.append("Has NOT used their yearly registration yet — free to pick any open action.\n");
        }
        return sb.toString();
    }
}
