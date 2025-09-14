# AI Chat API Configuration

This application uses two different AI services:
- **Cerebras Llama 3.1 70B** via OpenRouter for text chat
- **Anthropic Claude 3.5 Sonnet** for image recognition

## Setup Instructions

1. **Copy the environment variables template:**
   ```bash
   cp .env.example .env
   ```

2. **Get your API keys:**

   **OpenRouter (for Cerebras Llama 70B):**
   - Sign up at [OpenRouter](https://openrouter.ai)
   - Go to [API Keys](https://openrouter.ai/keys)
   - Create a new API key
   - Add it to `.env` as `VITE_OPENROUTER_API_KEY`

   **Anthropic (for Claude image recognition):**
   - Sign up at [Anthropic Console](https://console.anthropic.com)
   - Go to [API Keys](https://console.anthropic.com/account/keys)
   - Create a new API key
   - Add it to `.env` as `VITE_ANTHROPIC_API_KEY`

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## API Features

### Text Chat (Cerebras Llama 3.1 70B)
- Fast, efficient text generation
- Context-aware conversations
- Maintains conversation history

### Image Recognition (Anthropic Claude 3.5 Sonnet)
- Advanced image analysis
- Detailed descriptions
- Context understanding with images

## Usage

- **Text messages** are automatically processed using Cerebras Llama 70B
- **Messages with images** are processed using Anthropic Claude for image recognition
- The system will notify you if API keys are missing

## Troubleshooting

If you see API key errors:
1. Make sure your `.env` file exists
2. Verify both API keys are correctly set
3. Restart the development server after adding keys
4. Check that your API keys have sufficient credits/quota