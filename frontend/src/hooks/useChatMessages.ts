import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3007/api';

// Log API configuration on module load
if (typeof window !== 'undefined') {
  console.log('📋 Frontend API Configuration:');
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Env Var: ${import.meta.env.VITE_API_BASE_URL || 'NOT SET'}`);
}

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!sessionId || !token) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const url = `${API_URL}/chat/sessions/${sessionId}/messages`;
      console.log('📡 Fetching messages from:', url);

      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const normalizedMessages = data.map((m: any) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        created_at: m.createdAt
      }));

      setMessages(normalizedMessages);
    } catch (error: any) {
      console.error('❌ Error fetching messages:', error);
      console.error('URL:', `${API_URL}/chat/sessions/${sessionId}/messages`);
      console.error('Status:', error.response?.status);
      console.error('Response:', error.response?.data);

      if (error.response?.status === 404) {
        toast({
          title: "Session not found",
          description: "This chat session may have been deleted.",
          variant: "destructive",
        });
      } else if (error.response?.status === 401) {
        toast({
          title: "Authentication error",
          description: "Please log in again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, token, toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!sessionId || !token) return null;

    try {
      const url = `${API_URL}/chat/messages`;
      console.log('📡 Saving message to:', url);

      const { data } = await axios.post(url,
        { sessionId, role, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return {
        id: data._id,
        role: data.role,
        content: data.content,
        created_at: data.createdAt
      } as ChatMessage;
    } catch (error: any) {
      console.error('❌ Error saving message:', error);
      console.error('URL:', `${API_URL}/chat/messages`);
      console.error('Status:', error.response?.status);
      console.error('Response:', error.response?.data);

      if (error.response?.status === 404) {
        toast({
          title: "Session not found",
          description: "Unable to save message. Session may have been deleted.",
          variant: "destructive",
        });
      }
      return null;
    }
  };

  const sendMessage = async (content: string) => {
    if (!sessionId || streaming || !token) return;

    // Add user message to UI immediately
    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Validates duplicate save logic removal
    // Backend /api/chat endpoint already saves the user message
    // We strictly rely on the final backend sync to update the ID


    // AI Response with streaming - OPTIMIZED
    setStreaming(true);
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    let rawText = ''; // Store raw text during streaming
    let lastUpdateTime = Date.now();
    const UPDATE_THROTTLE = 40; // ~25fps (balanced reading speed)

    // Add temporary assistant message for streaming (immediate UI feedback)
    const tempAssistantMsg: ChatMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempAssistantMsg]);

    try {
      // Use AbortController for better error handling
      const controller = new AbortController();
      const url = `${API_URL}/chat`;
      console.log('📡 Sending chat request to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: content, sessionId }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Chat endpoint error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let pendingUpdate: (() => void) | null = null;

      // Optimized update function with throttling
      const updateStreamingMessage = (newContent: string) => {
        const now = Date.now();
        if (now - lastUpdateTime >= UPDATE_THROTTLE) {
          setMessages(prev =>
            prev.map(m =>
              m.id === tempAssistantId
                ? { ...m, content: newContent }
                : m
            )
          );
          lastUpdateTime = now;
          pendingUpdate = null;
        } else {
          // Schedule update for next frame
          if (!pendingUpdate) {
            pendingUpdate = () => {
              setMessages(prev =>
                prev.map(m =>
                  m.id === tempAssistantId
                    ? { ...m, content: newContent }
                    : m
                )
              );
            };
            setTimeout(() => {
              if (pendingUpdate) {
                pendingUpdate();
                pendingUpdate = null;
              }
            }, UPDATE_THROTTLE - (now - lastUpdateTime));
          }
        }
      };

      // Helper to deduplicate messages by ID to ensure safety
      const deduplicateMessages = (msgs: ChatMessage[]) => {
        const seen = new Set();
        return msgs.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '') continue;

            try {
              const parsed = JSON.parse(data);

              // Handle "thinking" signal for immediate feedback
              if (parsed.type === 'thinking') {
                setMessages(prev =>
                  deduplicateMessages(prev.map(m =>
                    m.id === tempAssistantId
                      ? { ...m, content: '...' }
                      : m
                  ))
                );
                continue;
              }

              if (parsed.error) {
                // Handle error from stream
                setMessages(prev =>
                  deduplicateMessages(prev.map(m =>
                    m.id === tempAssistantId
                      ? { ...m, content: parsed.error }
                      : m
                  ))
                );
                setStreaming(false);
                toast({
                  title: "Error",
                  description: parsed.error,
                  variant: "destructive",
                });
                controller.abort();
                return;
              }

              if (parsed.content) {
                // Buffer tokens to prevent frequent re-renders
                buffer += parsed.content;
                const now = Date.now();

                // Flush buffer only every ~40-60ms (anti-flicker)
                if (now - lastUpdateTime >= UPDATE_THROTTLE) {
                  rawText += buffer;
                  updateStreamingMessage(rawText);
                  buffer = '';
                  lastUpdateTime = now;
                }
              }

              // Handle completion with FULL sync from backend
              if (parsed.done) {
                // Flush any remaining buffer
                if (buffer.length > 0) {
                  rawText += buffer;
                  updateStreamingMessage(rawText);
                  buffer = '';
                }

                if (parsed.messages) {
                  // ✅ EXPLICIT SINGLE SOURCE OF TRUTH (User Requirement 1 & 4)
                  // Replace entire state with backend state
                  const serverMessages = parsed.messages.map((m: any) => ({
                    id: m._id,
                    role: m.role,
                    content: m.content,
                    created_at: m.createdAt
                  }));

                  setMessages(serverMessages); // Completely replace, no merging
                } else {
                  // Fallback if backend doesn't send messages (shouldn't happen with new backend)
                  if (pendingUpdate) pendingUpdate();

                  setMessages(prev =>
                    deduplicateMessages(prev.map(m =>
                      m.id === tempAssistantId
                        ? { ...m, content: rawText }
                        : m
                    ))
                  );
                }

                setStreaming(false);
                return;
              }
            } catch (e) {
              // Skip invalid JSON (common in streaming)
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // If we exit the loop without done=true, something went wrong
      setStreaming(false);
      if (rawText === '') {
        setMessages(prev => prev.filter(m => m.id !== tempAssistantId));

        toast({
          title: "Error",
          description: "No response received from server. Please try again.",
          variant: "destructive",
        });
      } else {
        // Partial response received - keep it
        setMessages(prev =>
          prev.map(m =>
            m.id === tempAssistantId
              ? { ...m, content: rawText }
              : m
          )
        );
      }

    } catch (error: any) {
      console.error('Chat error:', error);

      // Don't remove message if we have partial content
      if (rawText === '') {
        setMessages(prev => prev.filter(m => m.id !== tempAssistantId));
      }

      // Better error messages
      const errorMsg = error.name === 'AbortError'
        ? "Request cancelled"
        : error.message || "Failed to get AI response. Please try again.";

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setStreaming(false);
    }
  };

  const updateMessage = async (messageId: string, newContent: string) => {
    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, content: newContent } : m
    ));

    try {
      await axios.patch(`${API_URL}/chat/messages/${messageId}`,
        { content: newContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to update message:', error);
      toast({
        title: "Error",
        description: "Failed to save edits.",
        variant: "destructive",
      });
      fetchMessages();
    }
  };

  return {
    messages,
    loading,
    streaming,
    sendMessage,
    updateMessage,
    refreshMessages: fetchMessages,
  };
}
