import React from "react";
import MainLayout from "@/components/layout/MainLayout";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useParams } from "react-router-dom";
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
  plans?: Plan[]; // ✅ optional (لو هتربطها بعدين)
};

function isHttpUrl(url?: string | null) {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

function initials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function UserProfilePage() {
  const { id } = useParams();
  // ✅ profile state (جاي من الباك اند)
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = React.useState<string | null>(null);

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

        // profiles.user_id = auth.users.id
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

        // avatar ممكن يكون URL أو path في bucket
        if (mapped.avatar_url && !isHttpUrl(mapped.avatar_url)) {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from("avatars")
            .createSignedUrl(mapped.avatar_url, 60 * 60);
          if (!signErr) setAvatarSignedUrl(signed?.signedUrl ?? null);
        }
      } catch (e: any) {
        console.error("load profile error:", e);
        setProfile(null);
        setError(e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  const isCoach = profile?.account_type === "coach";

  // ✅ Static follow state (UI only)
  const [isFollowing, setIsFollowing] = React.useState(false);

  if (loading) {
    return (
      <MainLayout title="User Profile">
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="py-20 text-center flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground font-medium italic">Loading profile...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout title="User Profile">
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

  return (
    <MainLayout title="User Profile">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={(isHttpUrl(profile.avatar_url) ? profile.avatar_url : avatarSignedUrl) ?? undefined}
                  alt={profile.full_name ?? "User"}
                />
                <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <CardTitle className="text-2xl">{profile.full_name ?? "User"}</CardTitle>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isCoach ? "default" : "secondary"}>
                    {isCoach ? "Coach" : "User"}
                  </Badge>

                  {profile.headline ? (
                    <CardDescription className="text-base">{profile.headline}</CardDescription>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <Button
              className="rounded-2xl hover:bg-gray-200 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white"
            
                variant={"outline"}
                
            >
             Chat
              </Button>
              <Button
              className="rounded-2xl"
              variant={isFollowing ? "secondary" : "default"}
              onClick={() => setIsFollowing((p) => !p)}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
                  </div>
            
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Role</div>
                <div className="mt-1 font-medium">{profile.account_type ?? "user"}</div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Age</div>
                <div className="mt-1 font-medium truncate">{profile.age ?? "-"}</div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="mt-1 font-medium">
                  {isFollowing ? "Following" : "Not following"}
                </div>
              </div>
            </div>

            {isCoach ? (
              <>
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <h2 className="text-lg font-semibold">Plans</h2>
                    <span className="text-sm text-muted-foreground">
                      {profile.plans?.length ? `${profile.plans.length} available` : "No plans"}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {(profile.plans ?? []).map((plan) => (
                      <Card key={plan.id} className="rounded-2xl">
                        <CardHeader className="space-y-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-lg">{plan.title}</CardTitle>
                              <CardDescription>{plan.description ?? ""}</CardDescription>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {plan.priceLabel}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {plan.features?.length ? (
                            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {plan.features.map((f, idx) => (
                                <li key={idx}>{f}</li>
                              ))}
                            </ul>
                          ) : null}

                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-muted-foreground">
                              {plan.isSubscribed ? "You are subscribed" : "Not subscribed"}
                            </div>

                            <Button
                              className="rounded-2xl"
                              variant={plan.isSubscribed ? "secondary" : "default"}
                              disabled={plan.isSubscribed}
                              onClick={() => console.log("subscribe", plan.id)}
                            >
                              {plan.isSubscribed ? "Subscribed" : "Subscribe"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
