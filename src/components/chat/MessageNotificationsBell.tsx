import { useEffect, useMemo, useState } from 'react';
import { Bell, MessageCircle, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NotificationItem = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender_name: string;
  sender_avatar_url: string | null;
};

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

async function resolveAvatarUrl(avatar: string | null): Promise<string | null> {
  if (!avatar) return null;
  if (isHttpUrl(avatar)) return avatar;

  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(avatar, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}

function timeAgo(iso: string) {
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'الآن';
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  return `منذ ${day} يوم`;
}

export default function MessageNotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // NOTE: our Supabase generated types don't include `direct_messages` yet.
  // Using a local `any`-typed client here keeps type-safety elsewhere.
  const sb = supabase as any;

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const canQuery = !!user?.id;

  const headerLabel = useMemo(() => {
    if (unreadCount === 0) return 'لا توجد رسائل جديدة';
    if (unreadCount === 1) return 'رسالة جديدة';
    if (unreadCount === 2) return 'رسالتان جديدتان';
    if (unreadCount <= 10) return `${unreadCount} رسائل جديدة`;
    return `${unreadCount} رسالة جديدة`;
  }, [unreadCount]);

  const refresh = async () => {
    if (!canQuery) return;

    // Count unread
    const { count } = await sb
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user!.id)
      .is('read_at', null);

    setUnreadCount(count || 0);

    // Fetch latest unread (limit 6)
    const { data: unread } = await sb
      .from('direct_messages')
      .select('id, sender_id, body, created_at')
      .eq('receiver_id', user!.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(6);

    // `sb` is `any`, so without an explicit type `senderIds` becomes `unknown[]` and
    // Supabase's `.in()` (typed) will complain. Force it to `string[]`.
    const senderIds: string[] = Array.from(
      new Set<string>((unread || []).map((m: any) => String(m.sender_id)))
    );

    let profilesMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (senderIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      (profs || []).forEach((p) => {
        profilesMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
      });
    }

    const hydrated: NotificationItem[] = await Promise.all(
      (unread || []).map(async (m) => {
        const p = profilesMap.get(m.sender_id);
        const avatar = await resolveAvatarUrl(p?.avatar_url || null);
        return {
          id: m.id,
          sender_id: m.sender_id,
          body: m.body,
          created_at: m.created_at,
          sender_name: p?.full_name || 'عضو',
          sender_avatar_url: avatar,
        };
      })
    );

    setItems(hydrated);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: bump count + show newest in dropdown
  useEffect(() => {
    if (!canQuery) return;

    const channel = supabase
      .channel(`dm_notifications_${user!.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user!.id}`,
        },
        async (payload) => {
          const row = payload.new as any;

          setUnreadCount((c) => c + 1);

          const { data: p } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', row.sender_id)
            .maybeSingle();

          const avatar = await resolveAvatarUrl(p?.avatar_url || null);
          const newItem: NotificationItem = {
            id: row.id,
            sender_id: row.sender_id,
            body: row.body,
            created_at: row.created_at,
            sender_name: p?.full_name || 'عضو',
            sender_avatar_url: avatar,
          };

          // Keep the list fresh (prepend, de-dup, limit)
          setItems((prev) => {
            const next = [newItem, ...prev.filter((x) => x.id !== newItem.id)];
            return next.slice(0, 6);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canQuery, user?.id]);

  const markRead = async (messageId: string) => {
    if (!canQuery) return;
    await sb
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('receiver_id', user!.id);
  };

  const markAllRead = async () => {
    if (!canQuery) return;
    await sb
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', user!.id)
      .is('read_at', null);
    setUnreadCount(0);
    setItems([]);
  };

  return (
    <DropdownMenu open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) refresh();
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-xl border-border">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="px-3 py-3">
          <DropdownMenuLabel className="p-0 text-sm">{headerLabel}</DropdownMenuLabel>
          <p className="text-xs text-muted-foreground mt-1">
            اضغط على إشعار لفتح المحادثة
          </p>
        </div>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">لا يوجد أي رسائل غير مقروءة</p>
            <Button
              variant="outline"
              className="mt-3 rounded-xl"
              onClick={() => {
                setOpen(false);
                navigate('/chat');
              }}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              افتح الشات
            </Button>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-auto">
            {items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="gap-3 items-start py-3 cursor-pointer"
                onClick={async () => {
                  await markRead(n.id);
                  setOpen(false);
                  navigate(`/chat/${n.sender_id}`);
                  // optimistic update
                  setItems((prev) => prev.filter((x) => x.id !== n.id));
                  setUnreadCount((c) => Math.max(0, c - 1));
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
                  {n.sender_avatar_url ? (
                    <img src={n.sender_avatar_url} alt={n.sender_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-foreground/70">{n.sender_name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold truncate">{n.sender_name}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {n.body}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="p-3 flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => {
              setOpen(false);
              navigate('/chat');
            }}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            فتح الشات
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={unreadCount === 0}
            onClick={markAllRead}
            title="تحديد الكل كمقروء"
          >
            <CheckCheck className="w-4 h-4" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
