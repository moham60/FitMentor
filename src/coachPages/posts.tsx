import * as React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

import { MdPostAdd } from "react-icons/md";
import { FaHeart, FaRegHeart, FaRegCommentDots } from "react-icons/fa";

type CoachPost = {
  id: string;
  user_id: string;
  coachName: string;
  coachAvatar?: string;
  createdAt: string;
  content: string;
  imageUrl?: string;
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

function TagPills({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <Badge key={t} variant="secondary" className="rounded-full">
          #{t}
        </Badge>
      ))}
    </div>
  );
}

function VisibilityBadge({ v }: { v: CoachPost["visibility"] }) {
  return (
    <Badge variant={v === "public" ? "default" : "secondary"} className="rounded-full">
      {v === "public" ? "Public" : "Coaches only"}
    </Badge>
  );
}

export default function Posts() {
  const [posts, setPosts] = React.useState<CoachPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [tab, setTab] = React.useState<"all" | "coaches" | "public">("all");
  const [sort, setSort] = React.useState<"newest" | "popular">("newest");
  const [q, setQ] = React.useState("");

  // shared selected post
  const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null);

  // comments dialog state
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [postComments, setPostComments] = React.useState<PostCommentItem[]>([]);
  const [commentText, setCommentText] = React.useState("");

  // likes dialog state
  const [likesOpen, setLikesOpen] = React.useState(false);
  const [likesLoading, setLikesLoading] = React.useState(false);
  const [likesUsers, setLikesUsers] = React.useState<PostLikeItem[]>([]);

  // Create post dialog state
  const [open, setOpen] = React.useState(false);
  const [newContent, setNewContent] = React.useState("");
  const [newImage, setNewImage] = React.useState("");
  const [newTags, setNewTags] = React.useState("coaching, tips");
  const [newVisibility, setNewVisibility] = React.useState<CoachPost["visibility"]>("coaches");

  const loadPosts = React.useCallback(async () => {
    setLoading(true);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id ?? null;

    // 1) posts with author name from VIEW
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

    // 2) comments count
    const { data: commentsRows, error: commentsErr } = await supabase
      .from("post_comments")
      .select("post_id")
      .in(
        "post_id",
        rows.map((p: any) => p.id)
      );

    if (commentsErr) console.warn("commentsErr:", commentsErr);

    const commentsCount = new Map<string, number>();
    for (const c of commentsRows ?? []) {
      commentsCount.set((c as any).post_id, (commentsCount.get((c as any).post_id) ?? 0) + 1);
    }

    // 3) likes count + likedByMe
    const { data: likesRows, error: likesErr } = await supabase
      .from("post_likes")
      .select("post_id,user_id")
      .in(
        "post_id",
        rows.map((p: any) => p.id)
      );

    if (likesErr) console.warn("likesErr:", likesErr);

    const likesCount = new Map<string, number>();
    const likedByMeSet = new Set<string>();

    for (const l of likesRows ?? []) {
      likesCount.set((l as any).post_id, (likesCount.get((l as any).post_id) ?? 0) + 1);
      if (uid && (l as any).user_id === uid) likedByMeSet.add((l as any).post_id);
    }

    const mapped: CoachPost[] = rows.map((p: any) => {
      const visibility: CoachPost["visibility"] = p.visibility === "public" ? "public" : "coaches";

      return {
        id: p.id,
        user_id: p.user_id,
        coachName: p.author_full_name ?? "User",
        coachAvatar: p.author_avatar_url ?? "",
        createdAt: p.created_at ? new Date(p.created_at).toLocaleString() : "",
        content: p.content ?? "",
        imageUrl: p.image_url ?? undefined,
        tags: Array.isArray(p.tags) ? p.tags : [],
        likes: likesCount.get(p.id) ?? 0,
        comments: commentsCount.get(p.id) ?? 0,
        likedByMe: uid ? likedByMeSet.has(p.id) : false,
        visibility,
      };
    });

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

    const { data: existing, error: exErr } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", uid)
      .maybeSingle();

    if (exErr) console.warn(exErr);

    if ((existing as any)?.id) {
      const { error } = await supabase.from("post_likes").delete().eq("id", (existing as any).id);
      if (error) console.error(error);
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: uid } as any);
      if (error) console.error(error);
    }

    await loadPosts();
  };

  const submitPost = async () => {
    const content = newContent.trim();
    if (!content) return;

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) return;

    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    const { error } = await supabase.from("posts").insert({
      user_id: userRes.user.id,
      content,
      image_url: newImage.trim() || null,
      visibility: newVisibility,
      tags: tags.length ? tags : ["post"],
    } as any);

    if (error) {
      console.error(error);
      return;
    }

    setNewContent("");
    setNewImage("");
    setNewTags("coaching, tips");
    setNewVisibility("coaches");
    setOpen(false);

    await loadPosts();
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
    const uid = userRes?.user?.id;
    if (!uid) return;

    const { error } = await supabase.from("post_comments").insert({
      post_id: selectedPostId,
      user_id: uid,
      content: text,
    } as any);

    if (error) {
      console.error(error);
      return;
    }

    setCommentText("");

    await openCommentsModal(selectedPostId);
    await loadPosts();
  };

  return (
    <MainLayout title="Posts">
      {/* Top actions */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts, coaches, tags..."
            className="md:w-[360px]"
          />

          <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "popular")}>
            <SelectTrigger className="md:w-[170px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <MdPostAdd className="text-lg" />
              Add Post
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create a new post</DialogTitle>
              <DialogDescription>Share tips, programs, or insights with other coaches.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={newVisibility} onValueChange={(v) => setNewVisibility(v as CoachPost["visibility"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coaches">Coaches only</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Post content</Label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Write something valuable… (tips, routines, nutrition, mindset)"
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">Keep it clear and actionable. Short paragraphs work best.</p>
              </div>

              <div className="space-y-2">
                <Label>Image URL (optional)</Label>
                <Input value={newImage} onChange={(e) => setNewImage(e.target.value)} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="strength, nutrition, habits"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitPost} disabled={!newContent.trim()}>
                Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator className="my-5" />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "coaches" | "public")} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="coaches">Coaches</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
        </TabsList>

        <div className="mt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {loading ? (
              <Card className="lg:col-span-2">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">Loading posts…</p>
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="lg:col-span-2">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No posts yet.</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={p.coachAvatar} />
                          <AvatarFallback>
                            {(p.coachName ?? "U")
                              .split(" ")
                              .slice(0, 2)
                              .map((x) => x[0]?.toUpperCase())
                              .join("")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="leading-tight">
                          <p className="font-semibold">{p.coachName}</p>
                          <p className="text-xs text-muted-foreground">{p.createdAt}</p>
                        </div>
                      </div>

                      <VisibilityBadge v={p.visibility} />
                    </div>

                    <CardTitle className="text-base font-medium leading-relaxed">{p.content}</CardTitle>

                    {p.tags?.length > 0 && <TagPills tags={p.tags} />}
                  </CardHeader>

                  {p.imageUrl && (
                    <div className="relative aspect-[16/9] w-full">
                      <img src={p.imageUrl} alt="post" className="h-full w-full object-cover" />
                    </div>
                  )}

                  <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-sm text-muted-foreground"
                        onClick={() => openLikesModal(p.id)}
                      >
                        {p.likes} likes
                      </Button>

                      <span>•</span>

                      <Button
                        variant="link"
                        className="h-auto p-0 text-sm text-muted-foreground"
                        onClick={() => openCommentsModal(p.id)}
                      >
                        {p.comments} comments
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => toggleLike(p.id)} className="gap-2">
                        {p.likedByMe ? <FaHeart /> : <FaRegHeart />}
                        Like
                      </Button>

                      <Button variant="secondary" size="sm" onClick={() => openCommentsModal(p.id)} className="gap-2">
                        <FaRegCommentDots />
                        Comment
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </Tabs>

      {/* LIKES DIALOG */}
      <Dialog open={likesOpen} onOpenChange={setLikesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>People who liked</DialogTitle>
            <DialogDescription>All users who liked this post.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[420px] overflow-auto">
            {likesLoading ? (
              <p className="text-sm text-muted-foreground">Loading likes...</p>
            ) : likesUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No likes yet.</p>
            ) : (
              likesUsers.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.user_avatar_url ?? ""} />
                    <AvatarFallback>
                      {(u.user_full_name ?? "U")
                        .split(" ")
                        .slice(0, 2)
                        .map((x) => x[0]?.toUpperCase())
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="leading-tight">
                    <p className="text-sm font-medium">{u.user_full_name ?? "User"}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setLikesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMMENTS DIALOG */}
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>See all comments and add yours.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[320px] overflow-auto border rounded-md p-3">
            {commentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : postComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              postComments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.user_avatar_url ?? ""} />
                    <AvatarFallback>
                      {(c.user_full_name ?? "U")
                        .split(" ")
                        .slice(0, 2)
                        .map((x) => x[0]?.toUpperCase())
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{c.user_full_name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <Label>Add a comment</Label>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your comment..."
              className="min-h-[110px]"
            />
            <p className="text-xs text-muted-foreground">Be respectful and keep it actionable.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setCommentsOpen(false)}>
              Close
            </Button>
            <Button onClick={submitComment} disabled={!commentText.trim()}>
              Post comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
