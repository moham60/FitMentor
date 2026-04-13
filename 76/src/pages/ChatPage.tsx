import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, Phone, Video, MoreVertical,
  Paperclip, Image as ImageIcon, Smile, ArrowLeft,
  Check, CheckCheck, Sun, Moon, FileText, FileSpreadsheet, File, X, UploadCloud
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

// ✅ غيّر الاسم لو الباكت مختلفة
const CHAT_MEDIA_BUCKET = "chat_media";

// --- Types ---
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

  message_type?: "text" | "image" | "file";
  media_path?: string | null;
};

type FileMeta = { name: string; size: number; mime: string };

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function formatBytes(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function pickFileIcon(mime: string) {
  const m = (mime || "").toLowerCase();
  if (m.includes("pdf")) return FileText;
  if (m.includes("spreadsheet") || m.includes("excel") || m.includes("sheet") || m.includes("csv")) return FileSpreadsheet;
  if (m.includes("word") || m.includes("document") || m.includes("officedocument.wordprocessingml")) return FileText;
  return File;
}

async function resolveAvatarUrl(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(raw, 60 * 60);
  return data?.signedUrl ?? null;
}

async function resolveChatMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(CHAT_MEDIA_BUCKET).createSignedUrl(path, 60 * 15);
  return data?.signedUrl ?? null;
}

// --- UI Components ---
function ChatImage({ mediaPath }: { mediaPath?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await resolveChatMediaUrl(mediaPath);
      if (mounted) setUrl(u);
    })();
    return () => { mounted = false; };
  }, [mediaPath]);

  if (!mediaPath) return null;

  return (
    <div className="max-w-[280px] sm:max-w-[360px]">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt="sent media"
            className="rounded-2xl border border-white/10 object-cover max-h-[360px] w-full shadow-sm"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="text-xs text-muted-foreground">Loading image...</div>
      )}
    </div>
  );
}

function ChatFile({ mediaPath, meta }: { mediaPath?: string | null; meta: FileMeta | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await resolveChatMediaUrl(mediaPath);
      if (mounted) setUrl(u);
    })();
    return () => { mounted = false; };
  }, [mediaPath]);

  const Icon = pickFileIcon(meta?.mime ?? "");

  return (
    <div className="w-[260px] sm:w-[320px]">
      <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-200" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{meta?.name ?? "Attachment"}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {(meta?.mime || "File")}{meta?.size ? ` • ${formatBytes(meta.size)}` : ""}
            </div>

            <div className="mt-2">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  <UploadCloud className="h-4 w-4" />
                  Open / Download
                </a>
              ) : (
                <div className="text-[11px] text-muted-foreground">Generating secure link...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentSheet({
  open,
  onClose,
  onPickImage,
  onPickFile,
}: {
  open: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickFile: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 right-0 bottom-0 z-[90] pb-[max(env(safe-area-inset-bottom),16px)]"
            initial={{ y: 420 }}
            animate={{ y: 0 }}
            exit={{ y: 520 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="mx-auto w-full max-w-[520px] rounded-t-3xl border border-white/10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between px-5 pt-4">
                <div>
                  <div className="text-sm font-bold">Attach</div>
                  <div className="text-[11px] text-muted-foreground">Send photos or documents</div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="px-5 py-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { onPickImage(); onClose(); }}
                  className="group rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="h-11 w-11 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div className="mt-3 font-bold text-sm">Photo</div>
                  <div className="text-[11px] text-muted-foreground">Any image format (HEIC supported)</div>
                </button>

                <button
                  type="button"
                  onClick={() => { onPickFile(); onClose(); }}
                  className="group rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="h-11 w-11 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div className="mt-3 font-bold text-sm">Document</div>
                  <div className="text-[11px] text-muted-foreground">PDF / DOCX / XLSX / CSV</div>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------- Page ----------------------
export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routeUserId } = useParams();

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
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(false);

  // ✅ inputs for mobile
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ attachment UI
  const [attachOpen, setAttachOpen] = useState(false);

  // ✅ upload bar
  const [uploading, setUploading] = useState<{ id: string; name: string; percent: number } | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.remove("dark");
      setIsDarkMode(false);
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      setIsDarkMode(true);
      localStorage.setItem("theme", "dark");
    }
  };

  useEffect(() => { setActiveUserId(routeUserId ?? null); }, [routeUserId]);

  // Presence
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

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const isOtherOnline = useMemo(() => {
    if (!activeUserId) return false;
    return onlineUserIds.includes(activeUserId);
  }, [onlineUserIds, activeUserId]);

  // Contacts
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

      setContacts(withAvatars);
      setContactsLoading(false);
    };
    run();
  }, [user?.id]);

  // unread
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("direct_messages")
        .select("sender_id, id")
        .eq("receiver_id", user.id)
        .is("read_at", null);

      const map: Record<string, number> = {};
      for (const row of (data as { sender_id: string }[]) || []) {
        map[row.sender_id] = (map[row.sender_id] ?? 0) + 1;
      }
      setUnreadByUser(map);
    };
    run();
  }, [user?.id]);

  useEffect(() => {
    setActiveProfile(contacts.find((c) => c.user_id === activeUserId) ?? null);
  }, [contacts, activeUserId]);

  // messages
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
      setMessages((data as DirectMessage[]) ?? []);
      setLoadingMessages(false);

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

  // realtime
  useEffect(() => {
    if (!user) return;

    const channelName = `dm_changes_${user.id}_${activeUserId ?? "lobby"}`;
    const channel = supabase.channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, async (payload) => {
        const msg = payload.new as DirectMessage;
        const isMine = msg.sender_id === user.id;
        const isForMe = msg.receiver_id === user.id;
        if (!isMine && !isForMe) return;

        const otherId = isMine ? msg.receiver_id : msg.sender_id;

        if (activeUserId && otherId === activeUserId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;

            if (isMine && (msg.message_type ?? "text") === "text") {
              const idx = prev.findIndex(m => m.id.startsWith("tmp_") && m.body === msg.body && (m.message_type ?? "text") === "text");
              if (idx !== -1) { const n = [...prev]; n[idx] = msg; return n; }
            }

            if (isMine && (msg.message_type === "image" || msg.message_type === "file")) {
              const idx = prev.findIndex(m => (m.id.startsWith("tmp_img_") || m.id.startsWith("tmp_file_")) && m.media_path && m.media_path === msg.media_path);
              if (idx !== -1) { const n = [...prev]; n[idx] = msg; return n; }
            }

            return [...prev, msg];
          });

          if (isForMe) {
            await (supabase as any).from("direct_messages").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
          }

          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
        } else if (isForMe) {
          setUnreadByUser((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] ?? 0) + 1 }));
          toast("New message", { description: "You have a new message" });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload) => {
        const updated = payload.new as DirectMessage;
        if (!activeUserId || !user?.id) return;

        const isBetweenUs =
          (updated.sender_id === user.id && updated.receiver_id === activeUserId) ||
          (updated.sender_id === activeUserId && updated.receiver_id === user.id);

        if (!isBetweenUs) return;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m)));
      })
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

  const sendText = async () => {
    if (!user || !activeUserId) return;
    const body = composer.trim();
    if (!body) return;

    setComposer("");

    const optimisticId = `tmp_${Date.now()}`;
    const optimistic: DirectMessage = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: activeUserId,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      message_type: "text",
      media_path: null,
    };

    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const { error } = await (supabase as any).from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activeUserId,
      body,
      message_type: "text",
      media_path: null,
    });

    if (error) {
      toast.error("فشل الإرسال");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  // ✅ واحد للصور + الملفات (موبايل friendly)
  const sendAnyFile = async (file: File) => {
    if (!user || !activeUserId) return;

    // ✅ (حل موبايل) اقبل أي image/* (HEIC وغيرها)
    const isImage = (file.type || "").startsWith("image/");

    // ✅ limits (صور الموبايل كبيرة)
    const maxMB = isImage ? 20 : 25;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`حجم الملف لازم يكون أقل من ${maxMB}MB`);
      return;
    }

    // ✅ allowed docs
    const allowedDocs = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ];

    if (!isImage) {
      // بعض الموبايلات ترجع type = ""، فاسمح بشرط الامتداد كمان
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const extOk = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"].includes(ext);
      const mimeOk = !file.type ? extOk : allowedDocs.includes(file.type);
      if (!mimeOk) {
        toast.error("نوع الملف غير مدعوم (جرّب PDF/DOCX/XLSX)");
        return;
      }
    }

    const messageType: DirectMessage["message_type"] = isImage ? "image" : "file";
    const meta: FileMeta = { name: file.name, size: file.size, mime: file.type || "application/octet-stream" };
    const metaJson = JSON.stringify(meta);

    // ext
    const extFromName = (file.name.split(".").pop() || "").toLowerCase();
    const fallbackExt = isImage ? (file.type.includes("heic") ? "heic" : "jpg") : "bin";
    const ext = extFromName || fallbackExt;

    const cleanName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 80);
    const path = `dm/${user.id}/${Date.now()}_${crypto.randomUUID()}_${cleanName}.${ext}`;

    const optimisticId = isImage ? `tmp_img_${Date.now()}` : `tmp_file_${Date.now()}`;

    const optimistic: DirectMessage = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: activeUserId,
      body: messageType === "file" ? metaJson : "",
      created_at: new Date().toISOString(),
      read_at: null,
      message_type: messageType,
      media_path: path,
    };

    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);

    setUploading({ id: optimisticId, name: file.name, percent: 10 });

    const { error: upErr } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      // ✅ ده هيديك السبب الحقيقي بدل “فشل” وخلاص
      toast.error(`Upload failed: ${upErr.message}`);
      console.error("Upload error:", upErr);
      console.log("file debug:", { name: file.name, type: file.type, size: file.size, bucket: CHAT_MEDIA_BUCKET });
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setUploading(null);
      return;
    }

    setUploading((p) => (p ? { ...p, percent: 70 } : p));

    const { error: dbErr } = await (supabase as any).from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activeUserId,
      body: messageType === "file" ? metaJson : "",
      message_type: messageType,
      media_path: path,
    });

    if (dbErr) {
      toast.error(`DB failed: ${dbErr.message ?? ""}`);
      await supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setUploading(null);
      return;
    }

    setUploading((p) => (p ? { ...p, percent: 100 } : p));
    setTimeout(() => setUploading(null), 400);
  };

  // ✅ لازم يتفتحوا من “ضغط زر مباشر” علشان iOS
  const pickImage = () => imageInputRef.current?.click();
  const pickFile = () => fileInputRef.current?.click();

  const openAttach = () => setAttachOpen(true);

  return (
    <div className="relative w-full h-[100dvh] bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col items-center justify-center transition-colors duration-500">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-900/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-900/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <AttachmentSheet
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPickImage={pickImage}
        onPickFile={pickFile}
      />

      <AnimatePresence>
        {uploading && (
          <motion.div
            className="fixed top-3 left-3 right-3 z-[95] mx-auto max-w-[560px]"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
          >
            <div className="rounded-2xl border border-white/10 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl shadow-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center">
                  <UploadCloud className="h-5 w-5 text-indigo-700 dark:text-indigo-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{uploading.name}</div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploading.percent}%` }} />
                  </div>
                </div>
                <div className="text-xs font-semibold text-muted-foreground w-10 text-right">{uploading.percent}%</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
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
          <div className="p-4 border-b border-slate-200/50 dark:border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
<h2 className="text-xl font-bold">
  <span className="text-indigo-600">Fit</span>
  <span className="text-slate-900 dark:text-slate-100">Messages</span>
</h2>


              <Button type="button" variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full w-9 h-9">
                <AnimatePresence mode="wait">
                  {isDarkMode ? (
                    <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Moon className="h-5 w-5 text-indigo-400" />
                    </motion.div>
                  ) : (
                    <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
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

                  const lastPreview = last
                    ? last.message_type === "image"
                      ? "📷 Photo"
                      : last.message_type === "file"
                        ? "📎 Attachment"
                        : last.body
                    : "Start chatting";

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
                              {formatDistanceToNow(new Date(last.created_at), { addSuffix: false }).replace("about", "")}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <p className={cn("text-xs truncate max-w-[150px]", unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                            {lastPreview}
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

        {/* CHAT */}
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
              <div className="h-16 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between px-4 sm:px-6 bg-white/40 dark:bg-black/40 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-3">
                  <Button type="button" variant="ghost" size="icon" className="md:hidden -ml-2 h-10 w-10 rounded-full" onClick={() => navigate("/chat")}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <Avatar className="h-9 w-9 border border-indigo-100 dark:border-white/10">
                    <AvatarImage src={activeProfile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{initials(activeProfile?.full_name)}</AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{activeProfile?.full_name}</span>
                    <span className={cn("text-[10px] font-medium flex items-center gap-1", isOtherOnline ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isOtherOnline ? "bg-green-500 animate-pulse" : "bg-slate-400 dark:bg-slate-500")} />
                      {isOtherOnline ? "Online Now" : "Offline"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Audio Call</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5">
                          <Video className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Video Call</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Separator orientation="vertical" className="h-5 mx-2 bg-slate-200 dark:bg-white/10" />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => {
                      navigate(`/profile/${activeProfile?.user_id}`);
                    }}
                  >
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

                    const fileMeta = (m.message_type === "file" && m.body)
                      ? safeJsonParse<FileMeta>(m.body)
                      : null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={m.id}
                        className={cn("flex w-full group", mine ? "justify-end" : "justify-start", prevSame ? "mt-0.5" : "mt-3")}
                      >
                        <div className={cn(
                          "relative px-4 sm:px-5 py-2.5 max-w-[88%] md:max-w-[60%] text-[14px] shadow-sm transition-all",
                          mine
                            ? cn("bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-sm", nextSame && "rounded-br-sm", prevSame && "rounded-tr-2xl rounded-br-2xl")
                            : cn("bg-white dark:bg-zinc-800/80 border border-slate-100 dark:border-white/5 text-foreground rounded-2xl rounded-tl-sm", nextSame && "rounded-bl-sm", prevSame && "rounded-tl-2xl rounded-bl-2xl")
                        )}>
                          {(m.message_type ?? "text") === "image" ? (
                            <ChatImage mediaPath={m.media_path} />
                          ) : (m.message_type === "file") ? (
                            <ChatFile mediaPath={m.media_path} meta={fileMeta} />
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          )}

                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                            mine ? "text-indigo-100" : "text-muted-foreground"
                          )}>
                            <span className="text-[10px]">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {mine && (
                              <span className="inline-flex" title={m.read_at ? `Seen ${new Date(m.read_at).toLocaleString()}` : "Sent"}>
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

              {/* Input (Mobile-first) */}
              <div className="bg-white/85 dark:bg-black/50 backdrop-blur-lg border-t border-slate-200/50 dark:border-white/10 px-3 sm:px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
                {/* ✅ hidden inputs */}
                <label htmlFor="chat-image-input" className="sr-only">
                  Choose an image to send
                </label>
                <input
                  id="chat-image-input"
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Choose an image to send"
                  title="Choose an image to send"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    sendAnyFile(f);
                    e.target.value = "";
                  }}
                />

                <label htmlFor="chat-file-input" className="sr-only">
                  Choose a document to send
                </label>
                <input
                  id="chat-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
                  className="hidden"
                  aria-label="Choose a document to send"
                  title="Choose a document to send"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    sendAnyFile(f);
                    e.target.value = "";
                  }}
                />

                <div className="flex items-end gap-2 rounded-[26px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50 p-2 focus-within:border-indigo-500/40 focus-within:bg-white dark:focus-within:bg-black/60 focus-within:shadow-md transition-all">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-full text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5"
                    onClick={openAttach}
                    title="Attach"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>

                  <textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendText();
                      }
                    }}
                    placeholder="Write a message…"
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 px-2 text-sm placeholder:text-muted-foreground/60"
                    rows={1}
                  />

                  <div className="flex items-center gap-1 pr-1">
                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-full text-muted-foreground hover:text-indigo-600 hidden sm:flex">
                      <Smile className="h-5 w-5" />
                    </Button>

                    <Button
                      type="button"
                      onClick={sendText}
                      disabled={!composer.trim()}
                      size="icon"
                      className={cn(
                        "h-11 w-11 rounded-full shadow-md transition-all duration-300 transform",
                        composer.trim()
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white scale-100"
                          : "bg-slate-200 dark:bg-zinc-800 text-slate-400 scale-95"
                      )}
                    >
                      <Send className="h-4 w-4 ml-0.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-muted-foreground px-2">
                  Attach → Photo/Document (mobile friendly). If upload fails, the error toast shows exact reason.
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
