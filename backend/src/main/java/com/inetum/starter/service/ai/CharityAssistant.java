package com.inetum.starter.service.ai;

/**
 * Placeholder marker file. The conversational Charity Day assistant is
 * implemented directly in {@link CharityAssistantService} using the
 * lower-level langchain4j {@code ChatModel} bean, NOT via
 * {@code @RegisterAiService}.
 *
 * <p>Why: {@code @RegisterAiService} generates an implementation that
 * routes the system message through Qute templating. With {@code @MemoryId}
 * + missing javac {@code -parameters} (which Quarkus dev mode strips
 * regardless of pom.xml settings), it throws a NullPointerException in
 * TemplateInstanceBase.data because parameter names resolve to null and
 * Qute receives a null variable key.
 *
 * <p>Going direct gives us full control over the message list and
 * conversation memory, with zero magic.
 */
class CharityAssistant {
    private CharityAssistant() { /* no-op */ }
}
