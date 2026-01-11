import React from "react";
import MainLayout from "@/components/layout/MainLayout";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Plan = {
  id: string;
  title: string;
  description?: string | null;
  priceLabel: string;
  features?: string[];
  isSubscribed?: boolean;
};

type Profile = {
  user_id: string;
  full_name: string | null;
  account_type: "user" | "coach" | null;
  avatar_url: string | null;
  age: number | null;
  headline?: string | null;
  plans?: Plan[];
};

function isHttpUrl(url?: string | null) {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

function initials(name?: string | null) {
  if (!name) return "C";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "C";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function CoachProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = React.useState<string | null>(null);
  const [isFollowing, setIsFollowing] = React.useState(false);

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setAvatarSignedUrl(null);

        if (!id) {
          setProfile(null);
          setError("Missing profile id in route");
          return;
        }

        const { data, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, account_type, avatar_url, age")
          .eq("user_id", id)
          .single();

        if (profErr) throw profErr;

        const p = data as any;
        const mapped: Profile = {
          user_id: p.user_id,
          full_name: p.full_name,
          account_type: (p.account_type as any) ?? "user",
          avatar_url: p.avatar_url,
          age: p.age,
        };

        setProfile(mapped);

        if (mapped.avatar_url && !isHttpUrl(mapped.avatar_url)) {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from("avatars")
            .createSignedUrl(mapped.avatar_url, 60 * 60);
          if (!signErr) setAvatarSignedUrl(signed?.signedUrl ?? null);
        }
      } catch (e: any) {
        console.error("load coach profile error:", e);
        setProfile(null);
        setError(e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  if (loading) {
    return (
      <MainLayout title="Coach Profile">
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-20 text-center flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-medium italic">Loading profile...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout title="Coach Profile">
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-20 text-center space-y-3">
              <p className="text-lg font-semibold">Profile not found</p>
              <p className="text-sm text-muted-foreground">{error ?? "No data"}</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isCoach = profile.account_type === "coach";

  return (
    <MainLayout title="Coach Profile">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={(isHttpUrl(profile.avatar_url) ? profile.avatar_url : avatarSignedUrl) ?? undefined}
                  alt={profile.full_name ?? "Coach"}
                />
                <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <CardTitle className="text-2xl">{profile.full_name ?? "Coach"}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isCoach ? "default" : "secondary"}>{isCoach ? "Coach" : "User"}</Badge>
                  {profile.headline ? <CardDescription className="text-base">{profile.headline}</CardDescription> : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="rounded-2xl hover:bg-gray-200 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white"
                variant="outline"
              >
                Chat
              </Button>
              <Button className="rounded-2xl" variant={isFollowing ? "secondary" : "default"} onClick={() => setIsFollowing((p) => !p)}>
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!isCoach ? (
              <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                This profile is not a coach. Opening the user profile instead.
                <Button className="ml-2" variant="link" onClick={() => navigate(`/userProfile/${profile.user_id}`)}>
                  Go
                </Button>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Role</div>
                <div className="mt-1 font-medium">{profile.account_type ?? "coach"}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Age</div>
                <div className="mt-1 font-medium truncate">{profile.age ?? "-"}</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="mt-1 font-medium">{isFollowing ? "Following" : "Not following"}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-semibold">Plans</h2>
                <span className="text-sm text-muted-foreground">
                  {profile.plans?.length ? `${profile.plans.length} available` : "No plans"}
                </span>
              </div>

              <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
