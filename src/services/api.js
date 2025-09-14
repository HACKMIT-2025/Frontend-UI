// API Service for OpenRouter and Anthropic Integration

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Model configurations
const MODELS = {
  text: 'cerebras/llama3.1-70b', // Cerebras Llama 70B for text
  vision: 'claude-3-5-sonnet-20241022' // Anthropic Claude for image recognition
};

class ChatAPI {
  constructor() {
    this.openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    this.anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  }

  // Send text message using Cerebras Llama 70B via OpenRouter
  async sendTextMessage(message, conversationHistory = []) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Chat Assistant',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS.text,
          messages: [
            ...conversationHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  }

  // Send image with message using Anthropic Claude
  async sendImageMessage(message, imageBase64, conversationHistory = []) {
    try {
      // Format messages for Anthropic API
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS.vision,
          max_tokens: 2000,
          messages: [
            ...formattedHistory,
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
                  }
                },
                {
                  type: 'text',
                  text: message || 'What is in this image?'
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  }

  // Stream text response from Cerebras Llama 70B
  async streamTextMessage(message, conversationHistory = [], onChunk) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Chat Assistant',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS.text,
          messages: [
            ...conversationHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error streaming text message:', error);
      throw error;
    }
  }

  // Check if API keys are configured
  isConfigured() {
    return {
      openRouter: !!this.openRouterKey,
      anthropic: !!this.anthropicKey,
      ready: !!this.openRouterKey || !!this.anthropicKey
    };
  }

  // Update API keys
  updateKeys(openRouterKey, anthropicKey) {
    if (openRouterKey) this.openRouterKey = openRouterKey;
    if (anthropicKey) this.anthropicKey = anthropicKey;
  }
}

export default new ChatAPI();