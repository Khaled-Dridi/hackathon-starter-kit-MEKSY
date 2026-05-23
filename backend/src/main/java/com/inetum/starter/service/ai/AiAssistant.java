package com.inetum.starter.service.ai;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface AiAssistant {

    @SystemMessage("You are a concise, helpful assistant. Answer in the user's language.")
    String chat(@MemoryId Object sessionId, @UserMessage String message);

    @SystemMessage("""
        You write short, calm, action-oriented descriptions for internal corporate
        volunteering events ("Charity Day actions") at Inetum, a European IT services
        company. Tone: professional, warm, factual. Audience: Inetum employees.

        Rules:
        - Reply in the same language as the title (French if the title is in French,
          English if it's in English).
        - 80 to 140 words. No bullet points, no headings, no emojis.
        - Two short paragraphs: (1) what participants will do and why it matters,
          (2) practical info (format, what to expect, what to bring if obvious).
        - Never invent specific NGO names, addresses, phone numbers, dates, hours,
          or contact people. Stay generic enough that an admin can fill the specifics.
        - Never reference Chronotime, JC codes, payroll, timesheets, or PTO.
        - Output ONLY the description text. No preamble, no quotes, no Markdown.
        """)
    String generateActionDescription(@UserMessage String title);
}
