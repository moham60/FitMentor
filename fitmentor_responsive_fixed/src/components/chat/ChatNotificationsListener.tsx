import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type SenderProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
};

async function resolveAvatarUrl(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(raw, 60 * 60);
  return data?.signedUrl ?? null;
}

/**
 * Listener global لإشعارات الشات (Toast + Desktop Notification)
 * بيشتغل في كل الصفحات بعد تسجيل الدخول.
 */
export default function ChatNotificationsListener() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [cache, setCache] = useState<Record<string, SenderProfile>>({});
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem("chat_notif_enabled") === "1");

  // sync with localStorage changes (another tab or toggle)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "chat_notif_enabled") setNotifEnabled(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const activeChatUserId = useMemo(() => {
    // /chat/:id
    const m = location.pathname.match(/^\/chat\/(.+)$/);
    return m?.[1] ?? null;
  }, [location.pathname]);

  const getSender = async (senderId: string) => {
    if (cache[senderId]) return cache[senderId];

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, account_type")
      .eq("user_id", senderId)
      .maybeSingle();

    if (error || !data) {
      const fallback: SenderProfile = { user_id: senderId, full_name: null, avatar_url: null, account_type: null };
      setCache((prev) => ({ ...prev, [senderId]: fallback }));
      return fallback;
    }

    const prof = data as SenderProfile;
    const signed = await resolveAvatarUrl(prof.avatar_url);
    const withAvatar = { ...prof, avatar_url: signed };
    setCache((prev) => ({ ...prev, [senderId]: withAvatar }));
    return withAvatar;
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`dm_notify_${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        async (payload) => {
          const msg = payload.new as DirectMessage;
          if (msg.receiver_id !== user.id) return;

          // لو المستخدم فاتح نفس الشات: متطلعش Toast
          if (activeChatUserId && activeChatUserId === msg.sender_id) return;

          const sender = await getSender(msg.sender_id);
          const senderName = sender.full_name ?? "رسالة جديدة";

          toast(senderName, {
            description: msg.body.length > 140 ? msg.body.slice(0, 140) + "…" : msg.body,
            action: {
              label: "فتح",
              onClick: () => navigate(`/chat/${msg.sender_id}`),
            },
          });

          if (notifEnabled && "Notification" in window && Notification.permission === "granted") {
            // eslint-disable-next-line no-new
            new Notification(senderName, {
              body: msg.body,
              icon: sender.avatar_url ?? undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeChatUserId, notifEnabled]);

  return null;
}
