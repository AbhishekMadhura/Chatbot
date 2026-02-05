require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Initialize OpenAI client with NVIDIA configuration
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

app.post('/api/v1/chat', async (req, res) => {
  const { message, history, model } = req.body;
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY not configured' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Use provided model or default to minimax
  const selectedModel = model || 'minimaxai/minimax-m2';

  try {
    // Build messages array with history and current message
    const messages = [];

    // Add conversation history
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Call NVIDIA API using OpenAI SDK
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: messages,
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 8192,
      stream: false
    });

    // Extract the assistant's response
    const assistantMessage = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({ response: assistantMessage });

  } catch (error) {
    console.error('Error calling NVIDIA API:', error);
    res.status(500).json({
      error: 'Failed to communicate with NVIDIA API',
      details: error.message
    });
  }
});

// Endpoint to get available models
app.get('/api/v1/models', (req, res) => {
  const models = [
    { id: 'minimaxai/minimax-m2', name: 'MiniMax M2', category: 'General Purpose' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', category: 'General Purpose' },
    { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', category: 'General Purpose' },
    { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', category: 'General Purpose' },
    { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', category: 'General Purpose' },
    { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2', category: 'General Purpose' },
    { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B Instruct', category: 'General Purpose' },
    { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', category: 'General Purpose' },
    { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', category: 'General Purpose' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B Instruct', category: 'NVIDIA' },
    { id: 'nvidia/nemotron-nano-12b-v2-vl', name: 'Nemotron Nano 12B Vision', category: 'NVIDIA Vision' },
    { id: 'deepseek-ai/deepseek-coder-6.7b-instruct', name: 'DeepSeek Coder 6.7B', category: 'Code' },
    { id: 'qwen/qwen2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', category: 'Code' },
    { id: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', category: 'General Purpose' },
    { id: 'qwen/qwen3-next-80b-a3b-instruct', name: 'Qwen 3 Next 80B', category: 'General Purpose' },
    { id: 'writer/palmyra-med-70b', name: 'Palmyra Med 70B', category: 'Medical' },
    { id: 'ibm/granite-3.0-8b-instruct', name: 'Granite 3.0 8B', category: 'Enterprise' },
    { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Phi-3 Medium 128K', category: 'General Purpose' },
    { id: 'microsoft/phi-4', name: 'Phi-4', category: 'General Purpose' },
    { id: 'snowflake/arctic', name: 'Arctic', category: 'Enterprise' },
    { id: 'upstage/solar-10.7b-instruct', name: 'Solar 10.7B Instruct', category: 'General Purpose' },
];

  res.json({ models });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
