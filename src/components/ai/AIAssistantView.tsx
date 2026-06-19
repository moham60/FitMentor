import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Bot,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  X
} from 'lucide-react';

import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';

const MESSAGE_LIMIT = 10;

type Conversation = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type StoredChatMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type ChatbotDatabase = {
  public: {
    Tables: {
      chatbot_conversations: {
        Row: Conversation;
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chatbot_messages: {
        Row: StoredChatMessage;
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const chatbotSupabase = supabase as unknown as SupabaseClient<ChatbotDatabase>;

type ChatItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  intent?: string;
  emotion?: string;
  followUpQuestions?: string[];
  confidence?: number;
  sources?: string[];
  routingMode?: string;
  structuredContextUsed?: boolean;
  vectorDocsUsed?: number;
};

type ApiChatResponse = {
  answer: string;
  session_id?: string;
  intent?: string;
  emotion?: string;
  confidence?: number;
  sources?: string[];
  route_used?: 'supabase' | 'vector' | 'hybrid';
  routing_mode?: string;
  structured_context_used?: boolean;
  vector_docs_used?: number;
  retrieved_docs?: string[];
  follow_up_questions?: string[];
};

type StreamChatEvent =
  | { type: 'chunk'; content?: string }
  | ({ type: 'done' } & ApiChatResponse)
  | { type: 'error'; message?: string };

const starterPrompts = [
  'كيف أصل لصفحة التمارين؟',
  'كيف أبدأ في تخفيف الدهون؟',
  'كم بروتين أحتاج اليوم؟',
  'أنا محبط ومش شايف نتيجة'
];

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

const buildConversationTitle = (message: string) => {
  const normalized = message.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'New chat';
  return normalized.length > 42 ? `${normalized.slice(0, 42).trim()}...` : normalized;
};

export default function AIAssistantView() {
  const apiBaseUrl = import.meta.env.VITE_CHATBOT_API_URL;
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const hasReachedLimit = messages.length >= MESSAGE_LIMIT;
  const remainingMessages = Math.max(MESSAGE_LIMIT - messages.length, 0);
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);

  const userProfilePayload = useMemo(() => {
    if (!user) return null;

    return {
      user_id: user.id,
      full_name: profile?.full_name ?? null,
      gender: profile?.gender ?? null,
      age: profile?.age ?? null,
      height_cm: profile?.height_cm ?? null,
      weight_kg: profile?.weight_kg ?? null,
      activity_level: profile?.activity_level ?? null,
      goal: profile?.goal ?? null,
      daily_calories: profile?.daily_calories ?? null,
      coach_plan_status: null
    };
  }, [profile, user]);

  const fetchConversations = useCallback(async (preferredConversationId?: string | null) => {
    if (!user?.id) {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
      return;
    }

    setLoadingConversations(true);
    try {
      // Use backend endpoint instead of Supabase directly (avoids RLS issues)
      const response = await fetch(`${apiBaseUrl}/api/chat/conversations?user_id=${user.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const rows = (await response.json()) as Conversation[];
      setConversations(rows);

      if (preferredConversationId === null) return;

      setActiveConversationId((current) => {
        if (preferredConversationId) return preferredConversationId;
        if (current && rows.some((conversation) => conversation.id === current)) return current;
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Failed to fetch chatbot conversations:', error);
      toast({
        title: 'Could not load chat history',
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      setLoadingConversations(false);
    }
  }, [apiBaseUrl, toast, user?.id]);

  const fetchMessages = useCallback(async (conversationId: string | null) => {
    if (!conversationId || !user?.id) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/chat/conversations/${conversationId}/messages?user_id=${user.id}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const data = (await response.json()) as StoredChatMessage[];
      setMessages(
        data.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.created_at
        }))
      );
    } catch (error) {
      console.error('Failed to fetch chatbot messages:', error);
      toast({
        title: 'Could not load messages',
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    } finally {
      setLoadingMessages(false);
    }
  }, [apiBaseUrl, toast, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void fetchConversations();
  }, [fetchConversations, authLoading]);

  useEffect(() => {
    void fetchMessages(activeConversationId);
  }, [activeConversationId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, loadingMessages]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/health`);
        if (!response.ok) throw new Error('health check failed');
        setConnected('online');
      } catch {
        setConnected('offline');
      }
    };

    void checkBackend();
  }, [apiBaseUrl]);

  const createConversation = async (title = 'New chat', resetMessages = true) => {
    if (!user?.id) {
      toast({ title: 'Sign in required', description: 'Please sign in to create a chat.' });
      return null;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, title })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }

      const conversation = (await response.json()) as Conversation;
      setConversations((current) => [conversation, ...current]);
      setActiveConversationId(conversation.id);
      if (resetMessages) {
        setMessages([]);
        setInput('');
      }
      setSessionId(crypto.randomUUID());
      setSidebarOpen(false);
      return conversation;
    } catch (error) {
      console.error('Failed to create chatbot conversation:', error);
      toast({
        title: 'Could not create chat',
        description: error instanceof Error ? error.message : 'Please try again.'
      });
      throw error;
    }
  };

  const ensureConversation = async (firstMessage: string) => {
    if (activeConversationId) return activeConversationId;
    const conversation = await createConversation(buildConversationTitle(firstMessage), false);
    return conversation?.id ?? null;
  };

  const updateConversationAfterMessage = async (conversationId: string, title?: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, title })
      });

      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.status}`);
      }

      const updated = (await response.json()) as Conversation;
      setConversations((current) => [updated, ...current.filter((conversation) => conversation.id !== conversationId)]);
    } catch (error) {
      console.error('Failed to update conversation:', error);
    }
  };

  const saveMessage = async (conversationId: string, role: ChatItem['role'], content: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const response = await fetch(`${apiBaseUrl}/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, role, content })
    });

    if (!response.ok) {
      throw new Error(`Failed to save message: ${response.status}`);
    }

    return (await response.json()) as { id: string; role: ChatItem['role']; content: string; created_at: string };
  };

  const appendMessage = (item: ChatItem) => {
    setMessages((current) => [...current, item]);
  };

  const updateMessage = (id: string | null, updates: Partial<ChatItem> | ((message: ChatItem) => Partial<ChatItem>)) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== id) return message;
        const patch = typeof updates === 'function' ? updates(message) : updates;
        return { ...message, ...patch };
      })
    );
  };

  const handleNewChat = async () => {
    try {
      await createConversation();
    } catch (error) {
      console.error('Failed to create chatbot conversation:', error);
      toast({
        title: 'Could not create chat',
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    }
  };

  const deleteConversation = async (conversation: Conversation) => {
    const confirmed = window.confirm(`Delete "${conversation.title || 'New chat'}"? This cannot be undone.`);
    if (!confirmed || !user?.id) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/conversations/${conversation.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.status}`);
      }

      setConversations((current) => {
        const next = current.filter((item) => item.id !== conversation.id);
        if (activeConversationId === conversation.id) {
          setActiveConversationId(next[0]?.id ?? null);
          if (!next.length) setMessages([]);
        }
        return next;
      });

      toast({ title: 'Conversation deleted' });
    } catch (error) {
      console.error('Failed to delete chatbot conversation:', error);
      toast({
        title: 'Could not delete chat',
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    }
  };

  const sendMessage = async (query: string) => {
    const trimmed = query.trim();

    if (!trimmed || sending || hasReachedLimit) return;

    if (messages.length + 1 > MESSAGE_LIMIT) {
      toast({
        title: 'Message limit reached',
        description: 'This conversation has reached the 10-message limit. Start a new chat.'
      });
      return;
    }

    const wasFirstMessage = messages.length === 0;
    const title = wasFirstMessage ? buildConversationTitle(trimmed) : undefined;
    const userMessageId = crypto.randomUUID();
    let conversationId: string | null = null;
    let assistantMessageId: string | null = null;
    let assistantContent = '';

    appendMessage({ id: userMessageId, role: 'user', content: trimmed });
    setInput('');
    setSending(true);

    try {
      conversationId = await ensureConversation(trimmed);
      if (!conversationId) throw new Error('No active conversation was created.');

      if (title) await updateConversationAfterMessage(conversationId, title);

      const savedUserMessage = await saveMessage(conversationId, 'user', trimmed);
      updateMessage(userMessageId, { id: savedUserMessage.id, created_at: savedUserMessage.created_at });
      await updateConversationAfterMessage(conversationId);

      if (messages.length + 1 >= MESSAGE_LIMIT) {
        setConnected('online');
        return;
      }

      assistantMessageId = crypto.randomUUID();
      appendMessage({ id: assistantMessageId, role: 'assistant', content: '' });

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          session_id: sessionId || undefined,
          conversation_id: conversationId,
          user_id: user?.id,
          user_profile: userProfilePayload || undefined,
          stream: true
        })
      });

      if (!response.ok) {
        let serverMessage = '';
        try {
          const errorBody = await response.text();
          serverMessage = errorBody?.slice(0, 220) || '';
        } catch {
          serverMessage = '';
        }
        throw new Error(serverMessage || `HTTP ${response.status}`);
      }

      if (!response.body) {
        const data = (await response.json()) as ApiChatResponse;
        assistantContent = data.answer || '';
        updateMessage(assistantMessageId, {
          content: assistantContent,
          intent: data.intent,
          emotion: data.emotion,
          followUpQuestions: data.follow_up_questions,
          confidence: data.confidence,
          sources: data.sources || data.retrieved_docs,
          routingMode: data.routing_mode || data.route_used,
          structuredContextUsed: data.structured_context_used,
          vectorDocsUsed: data.vector_docs_used
        });
      } else {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const handleStreamEvent = (event: StreamChatEvent) => {
          if (event.type === 'chunk') {
            assistantContent += event.content || '';
            updateMessage(assistantMessageId, { content: assistantContent });
            return;
          }

          if (event.type === 'done') {
            assistantContent = event.answer || assistantContent;
            updateMessage(assistantMessageId, {
              content: assistantContent,
              intent: event.intent,
              emotion: event.emotion,
              followUpQuestions: event.follow_up_questions,
              confidence: event.confidence,
              sources: event.sources || event.retrieved_docs,
              routingMode: event.routing_mode || event.route_used,
              structuredContextUsed: event.structured_context_used,
              vectorDocsUsed: event.vector_docs_used
            });
            return;
          }

          if (event.type === 'error' && event.message) {
            console.error('Chat stream error:', event.message);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const rawEvent of events) {
            const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
            if (!dataLine) continue;

            const jsonPayload = dataLine.slice(5).trim();
            if (!jsonPayload) continue;

            handleStreamEvent(JSON.parse(jsonPayload) as StreamChatEvent);
          }

          if (done) break;
        }
      }

      if (assistantContent.trim()) {
        const savedAssistantMessage = await saveMessage(conversationId, 'assistant', assistantContent);
        updateMessage(assistantMessageId, {
          id: savedAssistantMessage.id,
          created_at: savedAssistantMessage.created_at
        });
        await updateConversationAfterMessage(conversationId);
      }

      setConnected('online');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      appendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessage
          ? `حدث خطأ أثناء معالجة الطلب: ${errorMessage}`
          : 'تعذر الاتصال بالشات بوت الآن. تأكد أن خدمة chatbot تعمل ثم أعد المحاولة.'
      });
      setConnected('offline');
      toast({
        title: 'Chat request failed',
        description: errorMessage || 'Please try again.'
      });
    } finally {
      if (assistantMessageId) {
        setMessages((current) =>
          current.filter((message) => !(message.id === assistantMessageId && message.role === 'assistant' && !message.content))
        );
      }
      setSending(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setSidebarOpen(false);
    setSessionId(crypto.randomUUID());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const conversationSidebar = (
    <aside className="flex h-full min-h-0 flex-col border-r border-border/70 bg-background/95">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
        <div className="min-w-0">
          <p className="font-semibold">Chat history</p>
          <p className="text-xs text-muted-foreground">{conversations.length} conversations</p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        <Button type="button" className="w-full justify-start gap-2 rounded-xl" onClick={() => void handleNewChat()}>
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {loadingConversations ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading chats...
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
            No conversations yet. Start a new chat to keep your coaching history here.
          </div>
        ) : (
          <div className="space-y-1.5">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;

              return (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                    isActive
                      ? 'border-primary/50 bg-primary/10 shadow-sm'
                      : 'border-transparent hover:border-border/80 hover:bg-muted/70'
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => handleConversationClick(conversation.id)}
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="truncate text-sm font-medium">{conversation.title || 'New chat'}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatUpdatedAt(conversation.updated_at)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
                    onClick={() => void deleteConversation(conversation)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <MainLayout title="AI Assistant" subtitle="Your personal fitness coach">
      <div className="relative min-h-[calc(100vh-200px)] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
        <div className="grid h-[calc(100vh-200px)] min-h-[620px] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="hidden min-h-0 lg:block">{conversationSidebar}</div>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                aria-label="Close chat history"
                className="absolute inset-0 bg-background/70 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="relative h-full w-[86vw] max-w-[340px] shadow-2xl">{conversationSidebar}</div>
            </div>
          )}

          <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-0 bg-gradient-card shadow-none">
            <CardHeader className="border-b border-border/70 bg-background/80 backdrop-blur">
              <CardTitle className="flex flex-wrap items-center gap-3">
                <Button type="button" size="icon" variant="outline" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{activeConversation?.title || 'FitMentor AI'}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {remainingMessages} of {MESSAGE_LIMIT} messages remaining
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {hasReachedLimit && (
                    <Button type="button" size="sm" className="hidden gap-2 sm:inline-flex" onClick={() => void handleNewChat()}>
                      <Plus className="h-4 w-4" />
                      New Chat
                    </Button>
                  )}
                  <Badge variant={connected === 'online' ? 'default' : 'secondary'} className="gap-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        connected === 'online' ? 'bg-emerald-400' : connected === 'offline' ? 'bg-red-400' : 'bg-amber-400'
                      }`}
                    />
                    {connected === 'online' ? 'Connected' : connected === 'offline' ? 'Offline' : 'Connecting'}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-gradient-to-b from-background to-muted/40 p-4 md:p-6">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading messages...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/70 p-8 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                          <Bot className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <p className="text-lg font-semibold">Start a FitMentor chat</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Ask about workouts, nutrition, your progress, or where to find something in the app.
                        </p>
                      </div>
                    )}

                    {messages.map((message) => (
                      <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.role === 'assistant' && (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                            <Bot className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm ${
                            message.role === 'user'
                              ? 'border-transparent bg-gradient-primary text-primary-foreground'
                              : 'border-border/70 bg-card text-foreground'
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-7 md:text-[15px]">
                            {message.content || (message.role === 'assistant' && sending ? (
                              <span className="inline-flex items-center gap-1 text-muted-foreground" aria-label="thinking">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '0.15s' }} />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '0.3s' }} />
                              </span>
                            ) : null)}
                          </div>
                        </div>

                        {message.role === 'user' && (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-secondary">
                            <User className="h-4 w-4 text-foreground" />
                          </div>
                        )}
                      </div>
                    ))}

                    {sending && !messages.some((message) => message.role === 'assistant' && !message.content) && (
                      <div className="flex items-start justify-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="max-w-[85%] rounded-2xl border border-border/70 bg-card px-4 py-3 text-foreground shadow-sm">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="thinking">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '0.15s' }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '0.3s' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 bg-background/90 p-4 backdrop-blur md:p-5">
                {hasReachedLimit && (
                  <div className="mb-3 flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>This conversation has reached the 10-message limit. Start a new chat.</span>
                    </div>
                    <Button type="button" size="sm" className="gap-2" onClick={() => void handleNewChat()}>
                      <Plus className="h-4 w-4" />
                      New Chat
                    </Button>
                  </div>
                )}

                {!hasReachedLimit && messages.length === 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => void sendMessage(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Textarea
                      value={input}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={hasReachedLimit ? 'Start a new chat to continue...' : 'اكتب سؤالك هنا...'}
                      disabled={sending || loadingMessages || hasReachedLimit}
                      className="min-h-[88px] resize-none rounded-2xl border-border/70 bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => void sendMessage(input)}
                    disabled={sending || loadingMessages || hasReachedLimit || !input.trim()}
                    className="gap-2 rounded-2xl px-5"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
