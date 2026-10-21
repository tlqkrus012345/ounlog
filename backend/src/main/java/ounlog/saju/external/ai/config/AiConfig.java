package ounlog.saju.external.ai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class AiConfig {

    //@Bean("openAiChatClient")
    ChatClient openAiChatClient(OpenAiChatModel openAiChatModel) {
        return ChatClient.builder(openAiChatModel).build();
    }

    @Bean("geminiChatClient")
    ChatClient geminiChatClient(GoogleGenAiChatModel googleGenAiChatModel) {
        return ChatClient.builder(googleGenAiChatModel).build();
    }
}
