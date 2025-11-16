# RHEA AI Agent Setup Guide

## Overview

RHEA now includes a true AI agent that can:
- **Understand natural language** - Not just keyword matching
- **Remember context** - Maintains conversation history
- **Reason about commands** - Understands intent, not just exact phrases
- **Have conversations** - Can ask for clarification, provide suggestions
- **Multi-step planning** - Can break down complex requests

## Quick Start

### Option 1: OpenAI (Recommended for Best Quality)

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Open DAWRV
3. Click **🤖 AI Settings** button
4. Enter your API key
5. Select provider: **OpenAI**
6. Model: `gpt-4o-mini` (cheap, fast) or `gpt-4o` (best quality)
7. Click **Save**

### Option 2: Anthropic Claude

1. Get an API key from [Anthropic](https://console.anthropic.com/)
2. Open DAWRV
3. Click **🤖 AI Settings** button
4. Select provider: **Anthropic**
5. Enter your API key
6. Model: `claude-3-haiku` (fast) or `claude-3-sonnet` (better)
7. Click **Save**

### Option 3: Local LLM (Free, Private)

1. Install [Ollama](https://ollama.ai/) or [LM Studio](https://lmstudio.ai/)
2. Download a model (e.g., `ollama pull llama3`)
3. Open DAWRV
4. Click **🤖 AI Settings** button
5. Select provider: **Local LLM**
6. Base URL: `http://localhost:11434/v1` (Ollama) or your LM Studio URL
7. Model: `llama3` (or your model name)
8. Leave API key empty
9. Click **Save**

## Features

### Natural Language Understanding

**Before (Keyword Matching):**
- User: "Can you start the playback?"
- RHEA: ❌ Not recognized

**After (AI Agent):**
- User: "Can you start the playback?"
- RHEA: ✅ "Starting playback" (understands intent)

### Context Awareness

RHEA remembers:
- Previous commands in the conversation
- Current project state
- Last actions performed
- User preferences

**Example:**
```
User: "Play the track"
RHEA: "Starting playback"

User: "Now record"
RHEA: "Recording started" (knows you mean "record while playing")
```

### Conversational Responses

RHEA can:
- Ask for clarification
- Provide suggestions
- Explain what it can do
- Acknowledge requests naturally

**Example:**
```
User: "Make it louder"
RHEA: "I can't directly adjust volume, but I can mute or unmute tracks. Would you like me to unmute a track?"

User: "What can you do?"
RHEA: "I can control playback, create tracks, save projects, and more. Try: play, stop, record, save, or new track."
```

### Multi-Step Planning

RHEA can break down complex requests:
```
User: "Set up a new project and start recording"
RHEA: [Creates project] → [Starts recording]
```

## Configuration Options

### Temperature
- **0.0-0.3**: Very focused, deterministic
- **0.7** (default): Balanced, natural
- **0.8-1.0**: More creative, varied responses

### Memory
- **Enabled**: Remembers last 10 interactions
- **Disabled**: Each command is independent

### Tool Calling
- **Enabled**: AI can execute REAPER actions
- **Disabled**: AI only provides conversational responses

### Fallback
- **Enabled**: Uses keyword matching if AI fails
- **Disabled**: Only uses AI (may fail if API is down)

## Cost Considerations

### OpenAI
- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4o**: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- Typical command: ~100-200 tokens = $0.0001-0.0005 per command

### Anthropic
- **claude-3-haiku**: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens
- **claude-3-sonnet**: ~$3 per 1M input tokens, ~$15 per 1M output tokens

### Local LLM
- **Free** - No API costs
- Requires local hardware (GPU recommended)
- Privacy: All processing happens locally

## Troubleshooting

### "AIAgent not available"
- Make sure `ai-agent.js` is loaded in `index.html`
- Check browser console for errors

### "Connection failed"
- **OpenAI/Anthropic**: Check API key is correct
- **Local LLM**: Make sure Ollama/LM Studio is running
- Check base URL is correct (for local LLM)

### "AI processing failed"
- Check internet connection (for cloud APIs)
- Verify API key has credits/quota
- Check model name is correct
- Falls back to keyword matching automatically

### Slow responses
- Use smaller models (gpt-4o-mini, claude-3-haiku)
- Reduce `maxTokens` in config
- Use local LLM for faster response (if hardware allows)

## Advanced Usage

### Programmatic Configuration

```javascript
// In browser console
rhea.saveAIConfig({
    provider: 'openai',
    apiKey: 'sk-...',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    enableMemory: true,
    enableTools: true
});

// Reinitialize
rhea.initAIAgent();
```

### Testing AI Agent

```javascript
// Test AI directly
const response = await rhea.aiAgent.processInput('play the track', rhea.reaperActions);
console.log(response);
```

### Updating DAW Context

```javascript
// Update context manually
rhea.aiAgent.updateDAWContext({
    projectName: 'My Project',
    isPlaying: true,
    trackCount: 5
});
```

## Privacy & Security

- **API Keys**: Stored locally in browser localStorage (not sent to any server)
- **Conversation History**: Stored locally, never sent to external services
- **Local LLM**: Complete privacy - no data leaves your computer
- **Cloud APIs**: Commands sent to OpenAI/Anthropic (check their privacy policies)

## Best Practices

1. **Start with gpt-4o-mini** - Cheap and fast for testing
2. **Enable fallback** - Ensures commands work even if AI fails
3. **Use local LLM** - For privacy-sensitive work
4. **Adjust temperature** - Lower for precise commands, higher for natural conversation
5. **Monitor costs** - Set usage limits on API keys

## Next Steps

- Try natural language commands: "Can you play the track?"
- Ask questions: "What can you do?"
- Give complex requests: "Set up a new project and start recording"
- Experiment with different models and settings

Enjoy your AI-powered RHEA! 🚀

