import * as React from "react";
import MainLayout from "@/components/layout/MainLayout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MdPostAdd } from "react-icons/md";
import { FaHeart, FaRegHeart, FaRegCommentDots, FaShare } from "react-icons/fa";

type CoachPost = {
  id: string;
  coachName: string;
  coachTitle?: string;
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

const mockPosts: CoachPost[] = [
  {
    id: "p1",
    coachName: "Sarah Elmasry",
    coachTitle: "Strength Coach",
    coachAvatar: "",
    createdAt: "2h ago",
    content:
      "Quick tip: If your clients struggle with squats, start with tempo goblet squats for 2 weeks. The control builds confidence + patterning.",
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&auto=format&fit=crop&q=60",
    tags: ["strength", "squat", "coaching"],
    likes: 128,
    comments: 18,
    likedByMe: true,
    visibility: "coaches",
  },
  {
    id: "p2",
    coachName: "Omar Saad",
    coachTitle: "Nutrition Coach",
    coachAvatar: "",
    createdAt: "Yesterday",
    content:
      "Client adherence hack: weekly “protein planning” call + a default shopping list reduces decision fatigue and improves compliance.",
    tags: ["nutrition", "habits", "adherence"],
    likes: 76,
    comments: 9,
    likedByMe: false,
    visibility: "public",
  },
  {
    id: "p3",
    coachName: "Mona Adel",
    coachTitle: "Mobility Specialist",
    coachAvatar: "",
    createdAt: "3 days ago",
    content:
      "For desk workers: 5-min daily thoracic opener routine. You’ll see better overhead position + less neck tension within 10 days.",
    imageUrl:
      "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&auto=format&fit=crop&q=60",
    tags: ["mobility", "posture"],
    likes: 54,
    comments: 7,
    likedByMe: false,
    visibility: "coaches",
  },
];

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
  const [posts, setPosts] = React.useState<CoachPost[]>(mockPosts);
  const [tab, setTab] = React.useState<"all" | "coaches" | "public">("all");
  const [sort, setSort] = React.useState<"newest" | "popular">("newest");
  const [q, setQ] = React.useState("");
  const [commentOpen, setCommentOpen] = React.useState(false);
const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null);
const [commentText, setCommentText] = React.useState("");

  // Create post dialog state
  const [open, setOpen] = React.useState(false);
  const [newContent, setNewContent] = React.useState("");
  const [newImage, setNewImage] = React.useState("");
  const [newTags, setNewTags] = React.useState("coaching, tips");
  const [newVisibility, setNewVisibility] = React.useState<CoachPost["visibility"]>("coaches");

  const filtered = React.useMemo(() => {
    let list = [...posts];

    // Tabs filter
    if (tab === "coaches") list = list.filter((p) => p.visibility === "coaches");
    if (tab === "public") list = list.filter((p) => p.visibility === "public");

    // Search
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (p) =>
          p.content.toLowerCase().includes(s) ||
          p.coachName.toLowerCase().includes(s) ||
          p.tags.some((t) => t.toLowerCase().includes(s))
      );
    }

    // Sort
    if (sort === "popular") {
      list.sort((a, b) => b.likes + b.comments - (a.likes + a.comments));
    } else {
      // Mock newest: keep original order (you’ll sort by createdAt timestamp when real)
      list = list;
    }

    return list;
  }, [posts, tab, sort, q]);

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const liked = !p.likedByMe;
        return {
          ...p,
          likedByMe: liked,
          likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      })
    );
  };

  const submitPost = () => {
    const content = newContent.trim();
    if (!content) return;

    const tags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    const post: CoachPost = {
      id: `p_${Date.now()}`,
      coachName: "You",
      coachTitle: "Coach",
      coachAvatar: "",
      createdAt: "Just now",
      content,
      imageUrl: newImage.trim() || undefined,
      tags: tags.length ? tags : ["post"],
      likes: 0,
      comments: 0,
      likedByMe: false,
      visibility: newVisibility,
    };

    setPosts((prev) => [post, ...prev]);

    // reset
    setNewContent("");
    setNewImage("");
    setNewTags("coaching, tips");
    setNewVisibility("coaches");
    setOpen(false);
  };
const openCommentModal = (postId: string) => {
  setSelectedPostId(postId);
  setCommentText("");
  setCommentOpen(true);
};

const submitComment = () => {
  const text = commentText.trim();
  if (!text || !selectedPostId) return;

  // UI only (mock): increase comments count
  setPosts((prev) =>
    prev.map((p) =>
      p.id === selectedPostId ? { ...p, comments: p.comments + 1 } : p
    )
  );

  // هنا مكان ربط supabase insert لاحقًا
  // await supabase.from("comments").insert({ post_id: selectedPostId, content: text })

  setCommentOpen(false);
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

          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
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
              <DialogDescription>
                Share tips, programs, or insights with other coaches.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={newVisibility} onValueChange={(v) => setNewVisibility(v as any)}>
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
                <p className="text-xs text-muted-foreground">
                  Keep it clear and actionable. Short paragraphs work best.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Image URL (optional)</Label>
                <Input
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://..."
                />
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
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="coaches">Coaches</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={p.coachAvatar} />
                        <AvatarFallback>
                          {p.coachName
                            .split(" ")
                            .slice(0, 2)
                            .map((x) => x[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <p className="font-semibold">{p.coachName}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.coachTitle ? `${p.coachTitle} • ` : ""}
                          {p.createdAt}
                        </p>
                      </div>
                    </div>

                    <VisibilityBadge v={p.visibility} />
                  </div>

                  <CardTitle className="text-base font-medium leading-relaxed">
                    {p.content}
                  </CardTitle>

                  {p.tags?.length ? <TagPills tags={p.tags} /> : null}
                </CardHeader>

                {p.imageUrl ? (
                  <div className="relative aspect-[16/9] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt="post"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}

                <CardContent className="pt-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{p.likes} likes</span>
                    <span>{p.comments} comments</span>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => toggleLike(p.id)}
                  >
                    {p.likedByMe ? <FaHeart /> : <FaRegHeart />}
                    Like
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button  onClick={() => openCommentModal(p.id)} variant="ghost" className="gap-2">
                      <FaRegCommentDots />
                      Comment
                    </Button>
                    <Button variant="ghost" className="gap-2">
                      <FaShare />
                      Share
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}

            {filtered.length === 0 ? (
              <Card className="lg:col-span-2">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No posts found. Try changing filters or search.
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
    <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Add a comment</DialogTitle>
      <DialogDescription>
        Write a helpful comment for other coaches.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-2">
      <Label>Comment</Label>
      <Textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Type your comment..."
        className="min-h-[110px]"
      />
      <p className="text-xs text-muted-foreground">
        Be respectful and keep it actionable.
      </p>
    </div>

    <DialogFooter className="gap-2 sm:gap-0">
      <Button variant="secondary" onClick={() => setCommentOpen(false)}>
        Cancel
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
