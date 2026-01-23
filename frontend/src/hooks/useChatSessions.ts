import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ChatSession {
  id: string;
  _id?: string; // MongoDB ID
  title: string;
  type: 'ai' | 'lawyer';
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL;

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { user, token } = useAuth();
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${API_URL}/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Normalize MongoDB fields
      const normalizedSessions = data.map((s: any) => ({
        ...s,
        id: s._id,
        created_at: s.createdAt,
        updated_at: s.updatedAt
      }));

      setSessions(normalizedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async (title = 'New Chat', type: 'ai' | 'lawyer' = 'ai'): Promise<string | null> => {
    if (!token) return null;

    try {
      const { data } = await axios.post(`${API_URL}/chat/sessions`,
        { title, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newSession = {
        ...data,
        id: data._id,
        created_at: data.createdAt,
        updated_at: data.updatedAt
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      return newSession.id;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
      return null;
    }
  };

  const renameSession = async (sessionId: string, newTitle: string) => {
    if (!token) return;
    try {
      await axios.patch(`${API_URL}/chat/sessions/${sessionId}`,
        { title: newTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s)
      );
    } catch (error) {
      console.error('Error renaming session:', error);
      toast({
        title: "Error",
        description: "Failed to rename chat",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!token) return;
    try {
      await axios.delete(`${API_URL}/chat/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  return {
    sessions,
    loading,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    renameSession,
    deleteSession,
    refreshSessions: fetchSessions,
  };
}
