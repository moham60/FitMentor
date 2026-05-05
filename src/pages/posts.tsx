import * as React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { MdPostAdd, MdPublic, MdLockOutline, MdSearch, MdSort } from "react-icons/md";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaSpinner } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// --- Types ---
type CoachPost = {
  id: string;
  user_id: string;
  coachName: string;
  coachAvatar?: string; // may be http url OR path in storage
  authorAccountType?: string | null;
  createdAt: string;
  content: string;
  imageUrl?: string; // may be http url OR path in storage OR youtube link
  youtubeUrl?: string | null;
  tags: string[];
  likes: number;
  comments: number;
  likedByMe?: boolean;
  visibility: "public" | "coaches";
};

type PostCommentItem = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_full_name: string | null;
  user_avatar_url: string | null;
};

type PostLikeItem = {
  user_id: string;
  user_full_name: string | null;
  user_avatar_url: string | null;
};

// --- Helpers ---
function TagPills({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {tags.map((t) => (
        <Badge
          key={t}
          variant="secondary"
          className="rounded-full bg-primary/10 text-primary border-none hover:bg-primary/20 transition-colors px-3"
        >
          #{t}
        </Badge>
      ))}
    </div>
  );
}

// YouTube embed (handles many formats)
function getYouTubeEmbedUrl(url: string | undefined | null) {
  if (!url) return null;
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[7]?.length === 11 ? match[7] : null;
  if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  return null;
}

function isHttpUrl(v?: string | null) {
  return !!v && /^https?:\/\//i.test(v);
}

function VisibilityBadge({ v }: { v: CoachPost["visibility"] }) {
  const isPublic = v === "public";
  return (
    <Badge
      variant="outline"
      className={`rounded-full flex items-center gap-1 px-3 py-1 ${
        isPublic
          ? "border-green-200 text-green-700 bg-green-50"
          : "border-blue-200 text-blue-700 bg-blue-50"
      }`}
    >
      {isPublic ? <MdPublic className="text-sm" /> : <MdLockOutline className="text-sm" />}
      <span className="text-[10px] font-bold uppercase tracking-tight">
        {isPublic ? "Public" : "Coaches"}
      </span>
    </Badge>
  );
}

export default function Posts() {
  // --- States ---
  const [posts, setPosts] = React.useState<CoachPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<"all" | "coaches" | "public">("all");
  const [sort, setSort] = React.useState<"newest" | "popular">("newest");
  const [q, setQ] = React.useState("");
  const navigate = useNavigate();
  const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null);

  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [postComments, setPostComments] = React.useState<PostCommentItem[]>([]);
  const [commentText, setCommentText] = React.useState("");

  const [likesOpen, setLikesOpen] = React.useState(false);
  const [likesLoading, setLikesLoading] = React.useState(false);
  const [likesUsers, setLikesUsers] = React.useState<PostLikeItem[]>([]);

  const [open, setOpen] = React.useState(false);
  const [newContent, setNewContent] = React.useState("");

  // Loading state for posting
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Media input
  const [newMediaMode, setNewMediaMode] = React.useState<"none" | "upload" | "link">("none");
  const [newImage, setNewImage] = React.useState(""); // link (image/youtube)
  const [newMediaFile, setNewMediaFile] = React.useState<File | null>(null);

  const [newTags, setNewTags] = React.useState("coaching, tips");
  const [newVisibility, setNewVisibility] = React.useState<CoachPost["visibility"]>("coaches");

  // ✅ Signed urls maps (fix avatar + private media)
  const [avatarSignedMap, setAvatarSignedMap] = React.useState<Record<string, string>>({});
  const [postMediaSignedMap, setPostMediaSignedMap] = React.useState<Record<string, string>>({});
  const [authorTypeMap, setAuthorTypeMap] = React.useState<Record<string, string>>({});

  // --- Logic ---
  const loadPosts = React.useCallback(async () => {
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id ?? null;

    const { data: postsData, error: postsErr } = await supabase
      .from("posts_with_author")
      .select("id,user_id,content,image_url,visibility,tags,created_at,author_full_name,author_avatar_url")
      .order("created_at", { ascending: false });

    if (postsErr) {
      console.error("postsErr:", postsErr);
      setPosts([]);
      setLoading(false);
      return;
    }

    const rows = postsData ?? [];
    if (!rows.length) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // counts
    const { data: commentsRows, error: commentsErr } = await supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", rows.map((p: any) => p.id));

    if (commentsErr) console.warn("commentsErr:", commentsErr);

    const commentsCount = new Map<string, number>();
    for (const c of commentsRows ?? []) {
      commentsCount.set((c as any).post_id, (commentsCount.get((c as any).post_id) ?? 0) + 1);
    }

    const { data: likesRows, error: likesErr } = await supabase
      .from("post_likes")
      .select("post_id,user_id")
      .in("post_id", rows.map((p: any) => p.id));

    if (likesErr) console.warn("likesErr:", likesErr);

    const likesCount = new Map<string, number>();
    const likedByMeSet = new Set<string>();
    for (const l of likesRows ?? []) {
      likesCount.set((l as any).post_id, (likesCount.get((l as any).post_id) ?? 0) + 1);
      if (uid && (l as any).user_id === uid) likedByMeSet.add((l as any).post_id);
    }

    // ✅ Build mapped posts
    const mapped: CoachPost[] = rows.map((p: any) => {
      const visibility: CoachPost["visibility"] = p.visibility === "public" ? "public" : "coaches";
      const youtubeUrl = getYouTubeEmbedUrl(p.content ?? "");

      return {
        id: p.id,
        user_id: p.user_id,
        coachName: p.author_full_name ?? "User",
        coachAvatar: p.author_avatar_url ?? "",
        authorAccountType: null,
        createdAt: p.created_at
          ? new Date(p.created_at).toLocaleString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })
          : "",
        content: p.content ?? "",
        imageUrl: p.image_url ?? undefined,
        youtubeUrl,
        tags: Array.isArray(p.tags) ? p.tags : [],
        likes: likesCount.get(p.id) ?? 0,
        comments: commentsCount.get(p.id) ?? 0,
        likedByMe: uid ? likedByMeSet.has(p.id) : false,
        visibility,
      };
    });

    // ✅ Fetch authors account_type (coach/user) so avatar click goes to correct profile route
    try {
      const authorIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
      if (authorIds.length) {
        const { data: profRows, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, account_type")
          .in("user_id", authorIds);
        if (profErr) {
          console.warn("profiles fetch error:", profErr);
          setAuthorTypeMap({});
        } else {
          const m: Record<string, string> = {};
          for (const pr of profRows ?? []) {
            const uid = (pr as any).user_id as string;
            const t = ((pr as any).account_type as string | null) ?? "user";
            if (uid) m[uid] = t;
          }
          setAuthorTypeMap(m);
          // also populate in posts array (optional)
          for (const mp of mapped) mp.authorAccountType = m[mp.user_id] ?? null;
        }
      } else {
        setAuthorTypeMap({});
      }
    } catch (e) {
      console.warn("author types fetch failed:", e);
      setAuthorTypeMap({});
    }

    // ✅ Signed URLs for avatars (when stored as path)
    try {
      const avatarPaths = Array.from(
        new Set(
          rows
            .map((r: any) => r.author_avatar_url)
            .filter((v: any) => v && !isHttpUrl(v))
        )
      );

      if (avatarPaths.length) {
        const avatarPairs = await Promise.all(
          avatarPaths.map(async (path) => {
            const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
            if (error) {
              console.error("avatar signedUrl error:", path, error);
              return [path, ""] as const;
            }
            return [path, data.signedUrl] as const;
          })
        );

        const newAvatarMap: Record<string, string> = {};
        for (const [path, url] of avatarPairs) if (url) newAvatarMap[path] = url;
        setAvatarSignedMap(newAvatarMap);
      } else {
        setAvatarSignedMap({});
      }
    } catch (e) {
      console.error("avatar signed url map error:", e);
      setAvatarSignedMap({});
    }

    // ✅ Signed URLs for post media (when stored as path in post-media)
    try {
      const mediaPaths = Array.from(
        new Set(
          rows
            .map((r: any) => r.image_url)
            .filter((v: any) => v && !isHttpUrl(v) && !getYouTubeEmbedUrl(v))
        )
      );

      if (mediaPaths.length) {
        const mediaPairs = await Promise.all(
          mediaPaths.map(async (path) => {
            const { data, error } = await supabase.storage.from("post-media").createSignedUrl(path, 60 * 60);
            if (error) {
              console.error("media signedUrl error:", path, error);
              return [path, ""] as const;
            }
            return [path, data.signedUrl] as const;
          })
        );

        const newMediaMap: Record<string, string> = {};
        for (const [path, url] of mediaPairs) if (url) newMediaMap[path] = url;
        setPostMediaSignedMap(newMediaMap);
      } else {
        setPostMediaSignedMap({});
      }
    } catch (e) {
      console.error("media signed url map error:", e);
      setPostMediaSignedMap({});
    }

    setPosts(mapped);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const filtered = React.useMemo(() => {
    let list = [...posts];
    if (tab === "coaches") list = list.filter((p) => p.visibility === "coaches");
    if (tab === "public") list = list.filter((p) => p.visibility === "public");

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(s) ||
          p.coachName.toLowerCase().includes(s) ||
          p.tags.some((t) => t.toLowerCase().includes(s))
      );
    }
    if (sort === "popular") {
      list.sort((a, b) => b.likes + b.comments - (a.likes + a.comments));
    }
    return list;
  }, [posts, tab, sort, q]);

  const toggleLike = async (postId: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return;

    // optimistic
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const isLiked = post.likedByMe;
          return {
            ...post,
            likedByMe: !isLiked,
            likes: isLiked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      })
    );

    try {
      const { data: existing } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", uid)
        .maybeSingle();

      if ((existing as any)?.id) {
        await supabase.from("post_likes").delete().eq("id", (existing as any).id);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: uid } as any);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      loadPosts();
    }
  };

// ✅ FIXED: Added isSubmitting state handling
const submitPost = async () => {
  const content = newContent.trim();
  if (!content) return;

  // 1. Start Loading
  setIsSubmitting(true);

  try {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) throw new Error("User not found");

    let mediaValue: string | null = null;

    if (newMediaMode === "link") {
      mediaValue = newImage.trim() || null; // could be image link or youtube link
    }

    if (newMediaMode === "upload") {
      if (!newMediaFile) return; // user chose upload but didn't pick file

      const uid = userRes.user.id;
      const ext = (newMediaFile.name.split(".").pop() || "jpg").toLowerCase();
      const filePath = `posts/${uid}/${Date.now()}.${ext}`;

      // The upload happens here. The UI will now show "Posting..." during this time.
      const { error: uploadErr } = await supabase.storage.from("post-media").upload(filePath, newMediaFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: newMediaFile.type || undefined,
      });

      if (uploadErr) {
        console.error("uploadErr:", uploadErr);
        return; // ✅ don't create post without media if upload failed
      }

      // ✅ store PATH in DB (best for private buckets)
      mediaValue = filePath;
    }

    const tags = newTags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);

    const { error } = await supabase.from("posts").insert({
      user_id: userRes.user.id,
      content,
      image_url: mediaValue, // ✅ will be filePath OR external link OR null
      visibility: newVisibility,
      tags: tags.length ? tags : ["post"],
    } as any);

    if (error) {
      console.error("insert post error:", error);
      return;
    }

    // Reset form on success
    setNewContent("");
    setNewImage("");
    setNewMediaFile(null);
    setNewMediaMode("none");
    setNewTags("coaching, tips");
    setNewVisibility("coaches");
    setOpen(false);

    await loadPosts();
  } catch (err) {
    console.error("Unexpected error:", err);
  } finally {
    // 2. Stop Loading (runs whether successful or failed)
    setIsSubmitting(false);
  }
};


  const openLikesModal = async (postId: string) => {
    setSelectedPostId(postId);
    setLikesOpen(true);
    setLikesLoading(true);
    setLikesUsers([]);

    const { data, error } = await supabase
      .from("post_likes_with_user")
      .select("user_id,user_full_name,user_avatar_url")
      .eq("post_id", postId);

    if (error) {
      console.error(error);
      setLikesLoading(false);
      return;
    }

    setLikesUsers((data ?? []) as any);
    setLikesLoading(false);
  };

  const openCommentsModal = async (postId: string) => {
    setSelectedPostId(postId);
    setCommentsOpen(true);
    setCommentsLoading(true);
    setPostComments([]);
    setCommentText("");

    const { data, error } = await supabase
      .from("post_comments_with_user")
      .select("id,post_id,user_id,content,created_at,user_full_name,user_avatar_url")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setCommentsLoading(false);
      return;
    }

    setPostComments((data ?? []) as any);
    setCommentsLoading(false);
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || !selectedPostId) return;

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;

    // optimistic local comment
    const newCommentLocal: PostCommentItem = {
      id: Math.random().toString(),
      post_id: selectedPostId,
      user_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      user_full_name: "You",
      user_avatar_url: null,
    };

    setPostComments((prev) => [...prev, newCommentLocal]);
    setPosts((prevPosts) =>
      prevPosts.map((p) => (p.id === selectedPostId ? { ...p, comments: p.comments + 1 } : p))
    );
    setCommentText("");

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: selectedPostId,
        user_id: user.id,
        content: text,
      } as any);

      if (error) throw error;

      const { data: freshComments } = await supabase
        .from("post_comments_with_user")
        .select("id,post_id,user_id,content,created_at,user_full_name,user_avatar_url")
        .eq("post_id", selectedPostId)
        .order("created_at", { ascending: true });

      if (freshComments) setPostComments(freshComments as any);
    } catch (error) {
      console.error("Error submitting comment:", error);
      loadPosts();
    }
  };

  // --- UI Rendering ---
  return (
    <MainLayout title="Coaching Community">
      <div className="max-w-5xl mx-auto pb-20 px-4">
        {/* Search & Actions Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-2xl border shadow-sm mb-6">
          <div className="flex flex-1 items-center gap-3 bg-muted/50 px-3 py-1 rounded-xl border border-transparent focus-within:border-primary focus-within:bg-card transition-all">
            <MdSearch className="text-xl text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts, tags, or coaches..."
              className="border-none bg-transparent focus-visible:ring-0 shadow-none px-0"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "popular")}>
              <SelectTrigger className="w-[140px] rounded-xl bg-muted/30 border-none">
                <div className="flex items-center gap-2">
                  <MdSort className="text-lg" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
                  <MdPostAdd className="text-xl" />
                  Create Post
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Share Your Knowledge</DialogTitle>
                  <DialogDescription>Your tips help other coaches grow. Keep it actionable.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Target Audience</Label>
                    <Select
                      value={newVisibility}
                      onValueChange={(v) => setNewVisibility(v as CoachPost["visibility"])}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coaches">Coaches only</SelectItem>
                        <SelectItem value="public">Everyone (Public)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Post Content</Label>
                    <Textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="What's working for your clients lately?"
                      className="min-h-[140px] rounded-2xl resize-none focus-visible:ring-primary border-muted-foreground/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="font-semibold text-sm">Media</Label>

                    <RadioGroup
                      value={newMediaMode}
                      onValueChange={(v) => {
                        const mode = v as "none" | "upload" | "link";
                        setNewMediaMode(mode);
                        if (mode !== "upload") setNewMediaFile(null);
                        if (mode !== "link") setNewImage("");
                      }}
                      className="grid grid-cols-1 gap-2"
                    >
                      <Label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer hover:bg-muted/30">
                        <RadioGroupItem value="none" />
                        <span className="text-sm font-medium">No media</span>
                      </Label>

                      <Label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer hover:bg-muted/30">
                        <RadioGroupItem value="upload" />
                        <span className="text-sm font-medium">Upload image from device</span>
                      </Label>

                      <Label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer hover:bg-muted/30">
                        <RadioGroupItem value="link" />
                        <span className="text-sm font-medium">Paste image link or YouTube link</span>
                      </Label>
                    </RadioGroup>

                    {newMediaMode === "upload" && (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          className="rounded-xl"
                          onChange={(e) => setNewMediaFile(e.target.files?.[0] ?? null)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Supported: JPG, PNG, WEBP. (Bucket: <span className="font-semibold">post-media</span>)
                        </p>
                      </div>
                    )}

                    {newMediaMode === "link" && (
                      <div className="space-y-2">
                        <Input
                          value={newImage}
                          onChange={(e) => setNewImage(e.target.value)}
                          placeholder="https://... (image) OR https://youtube.com/watch?v=..."
                          className="rounded-xl"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          لو كان لينك يوتيوب، هيتعرض كفيديو داخل البوست تلقائي.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Tags</Label>
                    <Input
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="e.g. nutrition, hypertrophy, client-psychology"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="rounded-xl"
                    disabled={isSubmitting} // Disable cancel while uploading
                  >
                    Discard
                  </Button>

                  <Button
                    onClick={submitPost}
                    disabled={
                      isSubmitting || // Disable button while submitting
                      !newContent.trim() ||
                      (newMediaMode === "upload" && !newMediaFile)
                    }
                    className="rounded-xl px-8 min-w-[140px]" // Added min-w to prevent layout shift
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <FaSpinner className="animate-spin" />
                        <span>Posting...</span>
                      </div>
                    ) : (
                      "Post Now"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Feed Section */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="bg-muted/30 p-1 rounded-2xl w-full max-w-md grid grid-cols-3 mb-8 h-12">
            <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
              All
            </TabsTrigger>
            <TabsTrigger value="coaches" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Coaches
            </TabsTrigger>
            <TabsTrigger value="public" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
              Public
            </TabsTrigger>
          </TabsList>

          <div className="grid gap-6">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground font-medium italic">Loading feed...</p>
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed bg-muted/10">
                <CardContent className="py-20 text-center opacity-60">
                  <p className="text-lg">No posts to display in this category.</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((p) => {
                // ✅ FIX: avatar url could be path
                const coachAvatarSrc = isHttpUrl(p.coachAvatar)
                  ? (p.coachAvatar as string)
                  : (avatarSignedMap[p.coachAvatar ?? ""] ?? "");

                // ✅ FIX: media url could be http OR path OR youtube link
                const isYouTube = !!getYouTubeEmbedUrl(p.imageUrl ?? null);
                const mediaSrc = isHttpUrl(p.imageUrl)
                  ? (p.imageUrl as string)
                  : (postMediaSignedMap[p.imageUrl ?? ""] ?? "");

                return (
                  <Card
                    key={p.id}
                    className="overflow-hidden border-none shadow-sm ring-1 ring-black/[0.05] hover:ring-black/[0.08] transition-all bg-card/80 backdrop-blur-sm rounded-3xl"
                  >
                    <CardHeader className="space-y-4 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar
                            title="go to Profile"
                            onClick={() => {
                              navigate(`/profile/${p.user_id}`);
                            }}
                            className="h-12 w-12 border-2 border-background shadow-sm"
                          >
                            <AvatarImage className="cursor-pointer" src={coachAvatarSrc} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {(p.coachName ?? "U")
                                .split(" ")
                                .slice(0, 2)
                                .map((x) => x[0]?.toUpperCase())
                                .join("")}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <p className="font-bold text-base leading-none mb-1.5">{p.coachName}</p>
                            <p className="text-[11px] font-medium text-muted-foreground/80 tracking-wide uppercase">
                              {p.createdAt}
                            </p>
                          </div>
                        </div>

                        <VisibilityBadge v={p.visibility} />
                      </div>

                      <CardTitle className="text-base font-medium leading-relaxed tracking-tight text-foreground/90 px-1 whitespace-pre-wrap">
                        {p.content}
                      </CardTitle>

                      {p.tags?.length > 0 && <TagPills tags={p.tags} />}
                    </CardHeader>

                    {/* Media */}
                    {(p.imageUrl || isYouTube) && (
                      <div className="mx-5 mb-4 relative rounded-2xl overflow-hidden shadow-lg border bg-muted">
                        {isYouTube ? (
                          <div className="aspect-video">
                            <iframe
                              src={getYouTubeEmbedUrl(p.imageUrl)!}
                              title="YouTube video player"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute top-0 left-0 w-full h-full border-0"
                            />
                          </div>
                        ) : mediaSrc ? (
                          <img
                            src={mediaSrc}
                            alt="post content"
                            className="w-full h-auto object-cover max-h-[500px] hover:scale-[1.02] transition-transform duration-700"
                          />
                        ) : null}
                      </div>
                    )}

                    <CardFooter className="flex items-center justify-between p-4 bg-muted/10 border-t mt-2">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-card border rounded-full hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => openLikesModal(p.id)}
                        >
                          <span className="text-xs font-bold text-primary">{p.likes}</span>
                          <span className="text-[11px] font-medium text-muted-foreground">Likes</span>
                        </div>

                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-card border rounded-full hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => openCommentsModal(p.id)}
                        >
                          <span className="text-xs font-bold text-primary">{p.comments}</span>
                          <span className="text-[11px] font-medium text-muted-foreground">Comments</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={p.likedByMe ? "default" : "secondary"}
                          size="sm"
                          onClick={() => toggleLike(p.id)}
                          className={`rounded-full px-4 gap-2 h-9 transition-all active:scale-95 ${
                            p.likedByMe ? "bg-primary" : "bg-background hover:bg-muted border shadow-none"
                          }`}
                        >
                          {p.likedByMe ? <FaHeart className="text-white" /> : <FaRegHeart className="text-primary" />}
                          <span className={p.likedByMe ? "text-white font-bold" : "text-primary font-bold"}>Like</span>
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openCommentsModal(p.id)}
                          className="rounded-full px-4 gap-2 h-9 bg-background hover:bg-muted border shadow-none"
                        >
                          <FaRegCommentDots className="text-primary" />
                          <span className="text-primary font-bold">Reply</span>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })
            )}
          </div>
        </Tabs>

        {/* LIKES DIALOG */}
        <Dialog open={likesOpen} onOpenChange={setLikesOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Appreciations</DialogTitle>
              <DialogDescription>Everyone who found this post valuable.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[400px] overflow-auto pr-2 custom-scrollbar mt-4">
              {likesLoading ? (
                <p className="text-sm text-center py-10 opacity-60">Fetching likes...</p>
              ) : likesUsers.length === 0 ? (
                <p className="text-sm text-center py-10 opacity-60">No likes yet.</p>
              ) : (
                likesUsers.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded-xl transition-colors"
                  >
                    <Avatar className="h-10 w-10 border shadow-sm">
                      <AvatarImage src={u.user_avatar_url ?? ""} />
                      <AvatarFallback className="font-bold text-xs">{(u.user_full_name ?? "U")[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-bold tracking-tight">{u.user_full_name ?? "User"}</p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* COMMENTS DIALOG */}
        <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
          <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-6 border-b bg-card">
              <DialogTitle>Discussion</DialogTitle>
              <DialogDescription>Exchange ideas and feedback below.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-6 space-y-6 bg-muted/10">
              {commentsLoading ? (
                <p className="text-sm text-center py-20 animate-pulse">Loading conversation...</p>
              ) : postComments.length === 0 ? (
                <div className="text-center py-14 opacity-40 italic flex flex-col gap-2">
                  <FaRegCommentDots className="mx-auto text-3xl" />
                  <p>Be the first to share your thoughts!</p>
                </div>
              ) : (
                postComments.map((c) => (
                  <div key={c.id} className="flex gap-4 items-start group">
                    <Avatar className="h-10 w-10 border shadow-sm mt-1">
                      <AvatarImage src={c.user_avatar_url ?? ""} />
                      <AvatarFallback className="font-bold">{(c.user_full_name ?? "U")[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                      <div className="bg-card p-3 rounded-2xl rounded-tl-none border shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-sm font-bold tracking-tight text-primary">
                            {c.user_full_name ?? "User"}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground/70">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t bg-card mt-auto shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
              <div className="flex gap-3">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a constructive comment..."
                  className="min-h-[50px] h-12 py-3 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary focus-visible:bg-card transition-all text-sm resize-none"
                />
                <Button
                  onClick={submitComment}
                  disabled={!commentText.trim()}
                  className="rounded-2xl h-12 px-6 shadow-md shadow-primary/10"
                >
                  Send
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 px-1">
                Community Guidelines: Keep discussion professional and respectful.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
