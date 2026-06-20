import { useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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

export default function AIAssistantView() {
  const apiBaseUrl = import.meta.env.VITE_CHATBOT_API_URL;
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [conversations] = useState<Conversation[]>([]); // Static empty to prevent TS errors
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const hasReachedLimit = messages.length >= MESSAGE_LIMIT;
  const remainingMessages = Math.max(MESSAGE_LIMIT - messages.length, 0);

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

  /* تم إيقاف الـ useEffects الخاصة بجلب المحادثات مؤقتاً لتجنب الـ 404 
  */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

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

  // دالة New Chat تعمل محلياً بالكامل الآن
  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setSessionId(crypto.randomUUID());
    setActiveConversationId(null);
    setSidebarOpen(false);
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

    const userMessageId = crypto.randomUUID();
    let assistantMessageId: string | null = null;
    let assistantContent = '';

    appendMessage({ id: userMessageId, role: 'user', content: trimmed });
    setInput('');
    setSending(true);

    try {
      assistantMessageId = crypto.randomUUID();
      appendMessage({ id: assistantMessageId, role: 'assistant', content: '' });

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          user_id: user?.id,
          session_id: sessionId,
          user_profile: userProfilePayload || undefined, // تم الحفاظ عليه لذكاء الموديل
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

      setConnected('online');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      updateMessage(assistantMessageId, {
        content: errorMessage
          ? `حدث خطأ أثناء معالجة الطلب: ${errorMessage}`
          : 'تعذر الاتصال بالشات بوت الآن. تأكد أن خدمة الجلسة تعمل ثم أعد المحاولة.'
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

  const conversationSidebar = (
    <aside className="flex h-full min-h-0 flex-col border-r border-border/70 bg-background/95">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
        <div className="min-w-0">
          <p className="font-semibold">Chat history</p>
          <p className="text-xs text-muted-foreground">Session Mode</p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        <Button type="button" className="w-full justify-start gap-2 rounded-xl" onClick={handleNewChat}>
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="rounded-xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground text-center">
          وضع الجلسة المؤقت نشط. المحادثات الحالية لن يتم حفظها في قاعدة البيانات.
        </div>
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
                  <p className="truncate text-lg font-bold">FitMentor AI (Live Session)</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {remainingMessages} of {MESSAGE_LIMIT} messages remaining
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {hasReachedLimit && (
                    <Button type="button" size="sm" className="hidden gap-2 sm:inline-flex" onClick={handleNewChat}>
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
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-3xl border border-border/40 bg-card/40 p-8 text-center backdrop-blur-sm shadow-sm relative overflow-hidden">
                      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary shadow-glow relative z-10">
                        <Bot className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2 relative z-10">مرحباً بك في جلسة التوجيه المباشرة!</h2>
                      <p className="text-muted-foreground mb-8 relative z-10 max-w-md">
                        أنا مساعدك الذكي في FitMentor. يمكنك سؤالي عن التمارين، التغذية، أو أي شيء يخص رحلتك الرياضية.
                      </p>

                      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 relative z-10">
                        {starterPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => void sendMessage(prompt)}
                            className="group flex flex-col items-start gap-2 rounded-2xl border border-border/50 bg-background/50 p-4 text-right transition-all hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-md"
                          >
                            <span className="text-sm font-medium">{prompt}</span>
                            <div className="flex w-full items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">اضغط للإرسال</span>
                              <Sparkles className="h-3 w-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </button>
                        ))}
                      </div>
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
                            ? 'border-transparent bg-gradient-primary text-primary-foreground rounded-br-sm'
                            : 'border-border/50 bg-card/80 backdrop-blur-sm text-foreground rounded-bl-sm'
                        }`}
                      >
                        <div dir="auto" className="whitespace-pre-wrap text-sm leading-relaxed md:text-[15px]">
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
              </div>

              <div className="border-t border-border/70 bg-background/90 p-4 backdrop-blur md:p-5">
                {hasReachedLimit && (
                  <div className="mb-3 flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>This conversation has reached the 10-message limit. Start a new chat.</span>
                    </div>
                    <Button type="button" size="sm" className="gap-2" onClick={handleNewChat}>
                      <Plus className="h-4 w-4" />
                      New Chat
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative group">
                    <Textarea
                      dir="auto"
                      value={input}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage(input);
                        }
                      }}
                      placeholder={hasReachedLimit ? 'Start a new chat to continue...' : 'اسألني أي شيء عن التمارين أو التغذية...'}
                      disabled={sending || hasReachedLimit}
                      className="min-h-[60px] max-h-[160px] resize-none rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm px-4 py-4 pr-14 focus-visible:ring-primary/30 transition-all shadow-sm scrollbar-thin"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => void sendMessage(input)}
                      disabled={sending || hasReachedLimit || !input.trim()}
                      className="absolute bottom-2 right-2 h-[44px] w-[44px] rounded-xl transition-all shadow-glow hover:scale-105 active:scale-95"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rtl:-scale-x-100" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}