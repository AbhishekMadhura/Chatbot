'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

interface Model {
  id: string;
  name: string;
  category: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('minimaxai/minimax-m2');
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/models`);
        const data = await response.json();
        setModels(data.models);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const currentModel = selectedModel;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, model: currentModel }]);
    setIsLoading(true);

    // Add loading message placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', model: currentModel }]);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const data = await response.json();

      // Replace the loading message with the actual response
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: data.response,
          model: currentModel,
        };
        return newMessages;
      });
    } catch (error) {
      // Remove loading message on error
      setMessages(prev => prev.slice(0, -1));

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${errorMessage}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom styling for code blocks
          code({ node, inline, className, children, ...props }: any) {
            return inline ? (
              <code className="inline-code" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-content">
          <div className="header-text">
            <h1>AI Chatbot</h1>
            <p>Powered by NVIDIA</p>
          </div>
          <div className="model-selector">
            <label htmlFor="model-select">Model:</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoading || isLoadingModels}
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : (
                (() => {
                  // Group models by category
                  const grouped = models.reduce((acc, model) => {
                    if (!acc[model.category]) {
                      acc[model.category] = [];
                    }
                    acc[model.category].push(model);
                    return acc;
                  }, {} as Record<string, Model[]>);

                  // Define category order for better organization
                  const categoryOrder = [
                    'General Purpose',
                    'NVIDIA',
                    'Vision',
                    'Code',
                    'Reasoning',
                    'Small Models',
                    'Embedding',
                    'Reranking',
                    'Audio',
                    'Medical',
                    'Enterprise',
                    'Japanese',
                    'Chinese',
                    'Multilingual',
                    'Biology',
                  ];

                  return categoryOrder
                    .filter(category => grouped[category])
                    .map((category) => (
                      <optgroup key={category} label={category}>
                        {grouped[category].map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </optgroup>
                    ));
                })()
              )}
            </select>
          </div>
        </div>
      </header>

      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2>Start a conversation</h2>
            <p>Type a message below to begin chatting with the AI</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-avatar">
                {message.role === 'user' ? 'U' : 'AI'}
              </div>
              <div className="message-bubble">
                {message.model && message.role === 'assistant' && (
                  <div className="message-model-tag">
                    {models.find(m => m.id === message.model)?.name || 'AI Model'}
                  </div>
                )}
                <div className="message-content">
                  {message.role === 'assistant' && isLoading && index === messages.length - 1 ? (
                    <div className="loading-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    formatMessage(message.content)
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            className="message-input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
