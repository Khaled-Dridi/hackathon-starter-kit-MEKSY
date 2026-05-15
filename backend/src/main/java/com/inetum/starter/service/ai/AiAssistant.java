package com.inetum.starter.service.ai;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface AiAssistant {

    @SystemMessage("You are a concise, helpful assistant. Answer in the user's language.")
    String chat(@MemoryId Object sessionId, @UserMessage String message);
}
