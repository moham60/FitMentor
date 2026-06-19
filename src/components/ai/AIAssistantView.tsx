import { useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Bot, User } from 'lucide-react';

import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';

type ChatItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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

type StreamChatEvent = (
  | { type: 'chunk'; content?: string }
  | ({ type: 'done' } & ApiChatResponse)
  | { type: 'error'; message?: string }
);

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
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً بك في FitMentor AI. اسألني عن الموقع، الصفحات، التدريب، التغذية، أو تقدّمك الحالي.'
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const userProfilePayload = useMemo(() => {
    if (!user) {
      return null;
    }

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/health`);
        if (!response.ok) {
          throw new Error('health check failed');
        }

        setConnected('online');
      } catch {
        setConnected('offline');
      }
    };

    void checkBackend();
  }, [apiBaseUrl]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user?.id) {
        setRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/recommendation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id })
        });

        if (response.ok) {
          const data = await response.json();
          // Extract recommendations from response (could be array or nested object)
          const recs = Array.isArray(data) ? data : data.recommendations || [];
          setRecommendations(recs.slice(0, 3)); // Show max 3 recommendations
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [user?.id, apiBaseUrl]);

  const appendMessage = (item: ChatItem) => {
    setMessages((current) => [...current, item]);
  };

  const updateMessage = (id: string, updates: Partial<ChatItem> | ((message: ChatItem) => Partial<ChatItem>)) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== id) {
          return message;
        }

        const patch = typeof updates === 'function' ? updates(message) : updates;
        return { ...message, ...patch };
      })
    );
  };

  const sendMessage = async (query: string) => {
    const trimmed = query.trim();

    if (!trimmed || sending) {
      return;
    }

    const userMessageId = crypto.randomUUID();
    appendMessage({
      id: userMessageId,
      role: 'user',
      content: trimmed
    });

    setInput('');
    setSending(true);

    let assistantMessageId: string | null = null;

    try {
      assistantMessageId = crypto.randomUUID();
      appendMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: ''
      });

      // Extract user_id from the authenticated user
      const userId = user?.id;
      console.log('Sending message with user_id:', userId, 'and profile:', userProfilePayload);
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: trimmed,
          session_id: sessionId || undefined,
          user_id: userId,
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
        updateMessage(assistantMessageId, {
          content: data.answer,
          intent: data.intent,
          emotion: data.emotion,
          followUpQuestions: data.follow_up_questions,
          confidence: data.confidence,
          sources: data.sources || data.retrieved_docs,
          routingMode: data.routing_mode || data.route_used,
          structuredContextUsed: data.structured_context_used,
          vectorDocsUsed: data.vector_docs_used
        });
        setConnected('online');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleStreamEvent = (event: StreamChatEvent) => {
        if (event.type === 'chunk') {
          updateMessage(assistantMessageId, (message) => ({
            content: `${message.content}${event.content || ''}`
          }));
          return;
        }

        if (event.type === 'done') {
          updateMessage(assistantMessageId, {
            content: event.answer || '',
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
          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data:'));

          if (!dataLine) {
            continue;
          }

          const jsonPayload = dataLine.slice(5).trim();
          if (!jsonPayload) {
            continue;
          }

          handleStreamEvent(JSON.parse(jsonPayload) as StreamChatEvent);
        }

        if (done) {
          break;
        }
      }

      setConnected('online');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      appendMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessage
          ? `حدث خطأ أثناء معالجة الطلب: ${errorMessage}`
          : 'تعذر الاتصال بالشات بوت الآن. تأكد أن خدمة chatbot تعمل على المنفذ 8000 ثم أعد المحاولة.'
      });
      setConnected('offline');
    } finally {
      if (assistantMessageId) {
        setMessages((current) =>
          current.filter((message) => !(message.id === assistantMessageId && message.role === 'assistant' && !message.content))
        );
      }
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <MainLayout title="AI Assistant" subtitle="Your personal fitness coach">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">
        <Card className="lg:col-span-8 flex flex-col overflow-hidden border-border/70 shadow-card bg-gradient-card">
          <CardHeader className="border-b border-border/70 bg-background/70 backdrop-blur">
            <CardTitle className="flex flex-wrap items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg">FitMentor AI</p>
                <p className="text-xs text-muted-foreground font-normal">Smart assistant for site guidance and fitness</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant={connected === 'online' ? 'default' : 'secondary'} className="gap-1">
                  <span className={`h-2 w-2 rounded-full ${connected === 'online' ? 'bg-emerald-400' : connected === 'offline' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  {connected === 'online' ? 'Connected' : connected === 'offline' ? 'Offline' : 'Connecting'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-background to-muted/40">
              {messages.map((message) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}

                  {message.role === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border/70">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${message.role === 'user' ? 'bg-gradient-primary text-primary-foreground border-transparent' : 'bg-card border-border/70 text-foreground'}`}>
                    <div className="relative">
                      <div className="whitespace-pre-wrap leading-7 text-sm md:text-[15px]">
                        {message.content || (message.role === 'assistant' && sending ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground" aria-label="thinking">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0.3s' }} />
                          </span>
                        ) : null)}
                      </div>

                     
                    </div>

                  

                   
                  
                  </div>

                
                </div>
              ))}

              {sending && !messages.some((message) => message.role === 'assistant' && !message.content) && (
                <div className="flex items-start gap-3 justify-start">
                  <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>

                  <div className="max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border bg-card border-border/70 text-foreground">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="thinking">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}

              

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border/70 bg-background/80 backdrop-blur p-4 md:p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <Button key={prompt} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void sendMessage(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Textarea
                    value={input}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب سؤالك هنا..."
                    className="min-h-[88px] resize-none rounded-2xl border-border/70 bg-background"
                  />
                </div>
                <Button type="button" onClick={() => void sendMessage(input)} disabled={sending || !input.trim()} className="gap-2 rounded-2xl px-5">
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

       
      </div>
    </MainLayout>
  );
}
