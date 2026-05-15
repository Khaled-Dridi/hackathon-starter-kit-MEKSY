package com.inetum.starter.config;

import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

@ApplicationScoped
public class ChatMemoryConfig {

    private static final int MAX_MESSAGES_PER_SESSION = 20;

    @Produces
    @ApplicationScoped
    ChatMemoryProvider chatMemoryProvider() {
        return memoryId -> MessageWindowChatMemory.withMaxMessages(MAX_MESSAGES_PER_SESSION);
    }
}
