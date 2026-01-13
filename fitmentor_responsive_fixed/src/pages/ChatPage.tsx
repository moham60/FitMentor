import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Phone, Video, MoreVertical,
  Paperclip, Image as ImageIcon, Smile, ArrowLeft,
  Check, CheckCheck, Sun, Moon
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// --- Types & Helpers ---
type ProfileLite = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
};

type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

async function resolveAvatarUrl(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(raw, 60 * 60);
  return data?.signedUrl ?? null;
}

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routeUserId } = useParams();

  // --- Logic State ---
  const [contacts, setContacts] = useState<ProfileLite[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeUserId, setActiveUserId] = useState<string | null>(routeUserId ?? null);
  const [activeProfile, setActiveProfile] = useState<ProfileLite | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composer, setComposer] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  // Presence (Online Now) - global across the app (works even if the other user is not inside this chat)
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ✅ Notification Sound
  const notifAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.remove('dark');
      setIsDarkMode(false);
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      setIsDarkMode(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  // ✅ init notification sound once
  useEffect(() => {
    notifAudioRef.current = new Audio("/sounds/notification.mp3");
    notifAudioRef.current.preload = "auto";
    notifAudioRef.current.volume = 0.85;
  }, []);

  // ✅ unlock audio after first user interaction (Chrome/Safari policy)
  useEffect(() => {
    const unlock = async () => {
      try {
        const a = notifAudioRef.current;
        if (!a) return;
        a.muted = true;
        await a.play();
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        setAudioUnlocked(true);
      } catch {
        // ignore - will unlock later
      }
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const playNotif = () => {
    try {
      const a = notifAudioRef.current;
      if (!a) return;
      a.currentTime = 0;
      a.play().catch(() => { });
    } catch { }
  };

  // --- Effects ---
  useEffect(() => { setActiveUserId(routeUserId ?? null); }, [routeUserId]);

  // Global Presence: subscribe to a single shared channel and read who's online.
  // This is used for:
  // 1) Header online/offline for the opened chat
  // 2) Online indicator in the left conversations list
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: user.id } },
    });

    const sync = () => {
      const state = (channel as any).presenceState?.() ?? {};
      setOnlineUserIds(Object.keys(state));
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.on("presence", { event: "join" }, sync);
    channel.on("presence", { event: "leave" }, sync);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await (channel as any).track?.({ user_id: user.id, at: new Date().toISOString() });
        sync();
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const isOtherOnline = useMemo(() => {
    if (!activeUserId) return false;
    return onlineUserIds.includes(activeUserId);
  }, [onlineUserIds, activeUserId]);

  // Load Contacts
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setContactsLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, account_type")
        .neq("user_id", user.id)
        .order("full_name", { ascending: true });
      if (error) { setContacts([]); setContactsLoading(false); return; }
      const withAvatars = await Promise.all((data as ProfileLite[]).map(async (p) => ({
        ...p,
        avatar_url: await resolveAvatarUrl(p.avatar_url),
      })));
      setContacts(withAvatars); setContactsLoading(false);
    };
    run();
  }, [user?.id]);

  // Load Unread Counts
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("direct_messages")
        .select("sender_id, id")
        .eq("receiver_id", user.id)
        .is("read_at", null);
      const map: Record<string, number> = {};
      for (const row of (data as { sender_id: string }[]) || []) { map[row.sender_id] = (map[row.sender_id] ?? 0) + 1; }
      setUnreadByUser(map);
    };
    run();
  }, [user?.id]);

  useEffect(() => { setActiveProfile(contacts.find((c) => c.user_id === activeUserId) ?? null); }, [contacts, activeUserId]);

  // Load Messages for Active User
  useEffect(() => {
    const run = async () => {
      if (!user || !activeUserId) { setMessages([]); return; }
      setLoadingMessages(true);
      const { data, error } = await (supabase as any)
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) { setMessages([]); setLoadingMessages(false); return; }
      setMessages((data as DirectMessage[]) ?? []); setLoadingMessages(false);

      // Mark as read
      await (supabase as any)
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("receiver_id", user.id)
        .eq("sender_id", activeUserId)
        .is("read_at", null);

      setUnreadByUser((prev) => ({ ...prev, [activeUserId]: 0 }));

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    run();
  }, [user?.id, activeUserId]);

  // ---------------------------------------------------------
  // 🔥 REALTIME SUBSCRIPTION (UPDATED) 🔥
  // ---------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // اسم قناة فريد لتجنب التداخل
    const channelName = `dm_changes_${user.id}_${activeUserId ?? 'lobby'}`;

    const channel = supabase.channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages"
        },
        async (payload) => {
          const msg = payload.new as DirectMessage;
          const isMine = msg.sender_id === user.id;
          const isForMe = msg.receiver_id === user.id;

          // تجاهل الرسائل التي لا تخص المستخدم الحالي
          if (!isMine && !isForMe) return;

          const otherId = isMine ? msg.receiver_id : msg.sender_id;

          // إذا كانت الرسالة تخص المحادثة المفتوحة حالياً
          if (activeUserId && otherId === activeUserId) {
            setMessages((prev) => {
              // 1. إذا كانت الرسالة موجودة بالفعل (بسبب الـ ID الحقيقي)، لا تضفها
              if (prev.some((m) => m.id === msg.id)) return prev;

              // 2. إذا كانت الرسالة مني، نحاول استبدال الرسالة "المؤقتة" (Optimistic) بالرسالة الحقيقية
              // نبحث عن رسالة مؤقتة لها نفس المحتوى وتم إنشاؤها مؤخراً
              if (isMine) {
                const optimisticIndex = prev.findIndex(
                  m => m.id.startsWith('tmp_') && m.body === msg.body
                );

                if (optimisticIndex !== -1) {
                  const newMsgs = [...prev];
                  newMsgs[optimisticIndex] = msg; // استبدال المؤقتة بالحقيقية
                  return newMsgs;
                }
              }

              // 3. إضافة الرسالة الجديدة
              return [...prev, msg];
            });

            // إذا كانت رسالة واردة وأنا فاتح الشات، اعتبرها مقروءة
            if (isForMe) {
              await (supabase as any)
                .from("direct_messages")
                .update({ read_at: new Date().toISOString() })
                .eq("id", msg.id);
            }

            // تمرير لأسفل
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

          } else if (isForMe) {
            // إذا كانت رسالة من شخص آخر غير المفتوح حالياً، زود العداد
            setUnreadByUser((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] ?? 0) + 1 }));
            toast("New message received", { description: "You have a new message" });

            // ✅ 🔔 PLAY NOTIFICATION SOUND
            playNotif();
          }
        })
      // ✅ READ RECEIPTS: listen for read_at updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const updated = payload.new as DirectMessage;

          if (!activeUserId || !user?.id) return;

          const isBetweenUs =
            (updated.sender_id === user.id && updated.receiver_id === activeUserId) ||
            (updated.sender_id === activeUserId && updated.receiver_id === user.id);

          if (!isBetweenUs) return;

          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, activeUserId]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => (c.full_name ?? "").toLowerCase().includes(q));
  }, [contacts, search]);

  const lastMessageByUser = useMemo(() => {
    const map: Record<string, DirectMessage | undefined> = {};
    for (const m of messages) {
      const otherId = m.sender_id === user?.id ? m.receiver_id : m.sender_id;
      map[otherId] = m;
    }
    return map;
  }, [messages, user?.id]);

  const openChat = (uid: string) => navigate(`/chat/${uid}`);

  const send = async () => {
    if (!user || !activeUserId) return;
    const body = composer.trim();
    if (!body) return;

    setComposer(""); // مسح الحقل فوراً

    // إنشاء رسالة مؤقتة لتظهر فوراً للمستخدم (Optimistic UI)
    const optimisticId = `tmp_${Date.now()}`;
    const optimistic: DirectMessage = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: activeUserId,
      body,
      created_at: new Date().toISOString(),
      read_at: null
    };

    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    // الإرسال لقاعدة البيانات
    const { error } = await (supabase as any).from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activeUserId,
      body
    });

    if (error) {
      toast.error("فشل الإرسال");
      // حذف الرسالة المؤقتة في حالة الفشل
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
    // ملاحظة: عند النجاح، سيقوم الـ Realtime Subscription (الذي عدلناه بالأعلى)
    // باستقبال الرسالة الحقيقية واستبدال الرسالة المؤقتة تلقائياً.
  };

  // --- UI RENDER ---
  return (
    <div className="relative h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col items-center justify-center transition-colors duration-500">

      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-900/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-900/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 flex w-full max-w-[1600px] h-full md:h-[95vh] md:w-[95vw] md:rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-white/60 dark:bg-black/40 backdrop-blur-xl transition-all duration-300"
      >

        {/* SIDEBAR */}
        <div className={cn(
          "flex flex-col w-full md:w-80 lg:w-[340px] bg-white/40 dark:bg-black/20 z-20",
          "border-r-2 border-slate-200/60 dark:border-white/5 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
          activeUserId ? "hidden md:flex" : "flex"
        )}>

          {/* Header & Theme Toggle */}
          <div className="p-4 border-b border-slate-200/50 dark:border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Messages
              </h2>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full w-8 h-8 text-foreground/80 hover:bg-slate-200 dark:hover:bg-white/10 transition-transform duration-300"
              >
                <AnimatePresence mode="wait">
                  {isDarkMode ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="h-5 w-5 text-indigo-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="h-5 w-5 text-orange-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 h-10 bg-slate-100/50 dark:bg-black/20 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-black/40 rounded-xl transition-all"
              />
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1 px-2 py-2">
            <div className="space-y-1">
              {contactsLoading ? (
                <div className="text-xs text-center text-muted-foreground py-4">جاري التحميل...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-xs text-center text-muted-foreground py-4">لا يوجد أعضاء</div>
              ) : (
                filteredContacts.map((c) => {
                  const active = c.user_id === activeUserId;
                  const isOnline = onlineUserIds.includes(c.user_id);
                  const last = lastMessageByUser[c.user_id];
                  const unread = unreadByUser[c.user_id] ?? 0;

                  return (
                    <button
                      key={c.user_id}
                      onClick={() => openChat(c.user_id)}
                      className="relative w-full flex items-center gap-3 p-3 rounded-xl transition-all group outline-none hover:bg-slate-100/50 dark:hover:bg-white/5"
                    >
                      {active && (
                        <motion.div
                          layoutId="activeChat"
                          className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-500/20 rounded-xl border border-indigo-200 dark:border-indigo-500/30"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 border-2 border-white dark:border-zinc-800 shadow-sm">
                          <AvatarImage src={c.avatar_url ?? undefined} className="object-cover" />
                          <AvatarFallback className="text-xs font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200">
                            {initials(c.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 text-left min-w-0 z-10">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className={cn("text-sm font-bold truncate", active ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-200")}>
                            {c.full_name}
                          </span>
                          {last && (
                            <span className="text-[10px] text-muted-foreground opacity-70">
                              {formatDistanceToNow(new Date(last.created_at), { addSuffix: false }).replace('about', '')}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <p className={cn("text-xs truncate max-w-[150px]", unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                            {last ? last.body : "Start chatting"}
                          </p>
                          {unread > 0 && (
                            <Badge className="h-5 min-w-[20px] p-0 flex items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white shadow-lg shadow-indigo-500/30">
                              {unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* CHAT AREA */}
        <div className={cn(
          "flex-1 flex flex-col bg-slate-50/50 dark:bg-black/20 backdrop-blur-sm",
          !activeUserId ? "hidden md:flex" : "flex"
        )}>

          {!activeUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6"
              >
                <Send className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">FitMentor Chat</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">Select a conversation from the sidebar to start messaging.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="h-16 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between px-6 bg-white/40 dark:bg-black/40 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => navigate('/chat')}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <Avatar className="h-9 w-9 border border-indigo-100 dark:border-white/10">
                    <AvatarImage src={activeProfile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{initials(activeProfile?.full_name)}</AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{activeProfile?.full_name}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium flex items-center gap-1",
                        isOtherOnline
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isOtherOnline ? "bg-green-500 animate-pulse" : "bg-slate-400 dark:bg-slate-500"
                        )}
                      />
                      {isOtherOnline ? "Online Now" : "Offline"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Audio Call</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5">
                          <Video className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Video Call</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Separator orientation="vertical" className="h-5 mx-2 bg-slate-200 dark:bg-white/10" />

                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
                    const path = activeProfile?.account_type === "coach" ? "coachProfile" : "userProfile";
                    navigate(`/${path}/${activeProfile?.user_id}`);
                  }}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-0">
                <div className="p-4 md:p-6 flex flex-col gap-2 min-h-full justify-end">
                  {messages.map((m, index) => {
                    const mine = m.sender_id === user?.id;
                    const prevSame = index > 0 && messages[index - 1].sender_id === m.sender_id;
                    const nextSame = index < messages.length - 1 && messages[index + 1].sender_id === m.sender_id;

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={m.id}
                        className={cn(
                          "flex w-full group",
                          mine ? "justify-end" : "justify-start",
                          prevSame ? "mt-0.5" : "mt-3"
                        )}
                      >
                        <div className={cn(
                          "relative px-5 py-2.5 max-w-[75%] md:max-w-[60%] text-[14px] shadow-sm transition-all",
                          mine
                            ? cn("bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-sm", nextSame && "rounded-br-sm", prevSame && "rounded-tr-2xl rounded-br-2xl")
                            : cn("bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-white/5 text-foreground rounded-2xl rounded-tl-sm", nextSame && "rounded-bl-sm", prevSame && "rounded-tl-2xl rounded-bl-2xl")
                        )}>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          <div className={cn("flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200", mine ? "text-indigo-100" : "text-muted-foreground")}>
                            <span className="text-[10px]">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {mine && (
                              <span
                                className="inline-flex"
                                title={
                                  m.read_at
                                    ? `Seen ${new Date(m.read_at).toLocaleString()} (${formatDistanceToNow(
                                      new Date(m.read_at),
                                      { addSuffix: true }
                                    )})`
                                    : "Sent"
                                }
                              >
                                {m.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 bg-white/80 dark:bg-black/40 backdrop-blur-lg border-t border-slate-200/50 dark:border-white/5">
                <div className="flex items-end gap-2 bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-[26px] border border-slate-200 dark:border-white/5 focus-within:border-indigo-500/40 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:shadow-md transition-all duration-300">

                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors">
                    <Paperclip className="h-5 w-5" />
                  </Button>

                  <textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] py-2.5 px-2 text-sm placeholder:text-muted-foreground/60"
                    rows={1}
                    style={{ height: 'auto' }}
                  />

                  <div className="flex items-center gap-1 pr-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-indigo-600 hidden sm:flex">
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button
                      onClick={send}
                      disabled={!composer.trim()}
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-full shadow-md transition-all duration-300 transform",
                        composer.trim()
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white scale-100 rotate-0"
                          : "bg-slate-200 dark:bg-zinc-800 text-slate-400 scale-90"
                      )}>
                      <Send className="h-4 w-4 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
