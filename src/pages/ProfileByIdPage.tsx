import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Trophy,
  Users,
} from "lucide-react";

type CoachPlanTier = "basic" | "gold" | "premium";

type CoachPlanCard = {
  id: string;
  name: string;
  type: CoachPlanTier;
  description?: string | null;
  imageUrl?: string | null;
  musclesCount: number;
  exercisesCount: number;
  subscriptionLabel: string;
};

type Profile = {
  user_id: string;
  full_name: string | null;
  account_type: "user" | "coach" | null;
  avatar_url: string | null;
  age: number | null;
  headline?: string | null;
};

function tierLabel(tier: CoachPlanTier) {
  if (tier === "basic") return "Basic";
  if (tier === "gold") return "Gold";
  return "Premium";
}

function tierSubscriptionLabel(tier: CoachPlanTier) {
  const p = SUBSCRIPTION_PLANS.find((x) => x.id === tier);
  if (!p) return tierLabel(tier);
  return `${p.priceEgpPerMonth} EGP / month`;
}

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

export default function ProfileByIdPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = React.useState<string | null>(null);

  const [coachPlans, setCoachPlans] = React.useState<CoachPlanCard[]>([]);
  const [coachPlansLoading, setCoachPlansLoading] = React.useState(false);
  const [viewerCoachPlanId, setViewerCoachPlanId] = React.useState<string | null>(null);
  const [viewerCoachPlanStatus, setViewerCoachPlanStatus] = React.useState<string | null>(null);
  const [viewerCoachPlanExpiresAt, setViewerCoachPlanExpiresAt] = React.useState<string | null>(null);
  const [viewerSitePlanStatus, setViewerSitePlanStatus] = React.useState<string | null>(null);
  const [viewerSitePlanExpiresAt, setViewerSitePlanExpiresAt] = React.useState<string | null>(null);
  const [subscribeBusyPlanId, setSubscribeBusyPlanId] = React.useState<string | null>(null);

  const [followersCount, setFollowersCount] = React.useState<number | null>(null);
  const [followingCount, setFollowingCount] = React.useState<number | null>(null);

  const [isFollowing, setIsFollowing] = React.useState(false);
  const [followLoading, setFollowLoading] = React.useState(false);

  const loadCoachPlans = React.useCallback(async (coachId: string) => {
    try {
      setCoachPlansLoading(true);

      const { data: plansData, error: plansErr } = await supabase
        .from("coach_plans" as any)
        .select("id, name, type, description, image_url")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (plansErr) throw plansErr;

      const cards = await Promise.all(
        (plansData ?? []).map(async (p: any) => {
          const { data: musclesData } = await supabase
            .from("plan_muscles" as any)
            .select("exercise_count")
            .eq("plan_id", p.id);

          const musclesCount = (musclesData ?? []).length;
          const exercisesCount = (musclesData ?? []).reduce(
            (sum: number, m: any) => sum + (Number(m.exercise_count) || 0),
            0,
          );

          const type = p.type as CoachPlanTier;
          return {
            id: p.id,
            name: p.name,
            type,
            description: p.description,
            imageUrl: p.image_url,
            musclesCount,
            exercisesCount,
            subscriptionLabel: tierSubscriptionLabel(type),
          } satisfies CoachPlanCard;
        }),
      );

      setCoachPlans(cards);
    } catch (e) {
      setCoachPlans([]);
    } finally {
      setCoachPlansLoading(false);
    }
  }, []);

  const loadViewerCoachPlan = React.useCallback(async () => {
    try {
      if (!user?.id) {
        setViewerCoachPlanId(null);
        setViewerCoachPlanStatus(null);
        setViewerCoachPlanExpiresAt(null);
        setViewerSitePlanStatus(null);
        setViewerSitePlanExpiresAt(null);
        return;
      }

      const { data, error: profErr } = await supabase
        .from("profiles")
        .select("plan_status, plan_expires_at, coach_plan_id, coach_plan_status, coach_plan_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profErr) throw profErr;

      setViewerCoachPlanId((data as any)?.coach_plan_id ?? null);
      setViewerCoachPlanStatus((data as any)?.coach_plan_status ?? null);
      setViewerCoachPlanExpiresAt((data as any)?.coach_plan_expires_at ?? null);
      setViewerSitePlanStatus((data as any)?.plan_status ?? null);
      setViewerSitePlanExpiresAt((data as any)?.plan_expires_at ?? null);
    } catch {
      // Backward compatible if columns aren't deployed yet
      setViewerCoachPlanId(null);
      setViewerCoachPlanStatus(null);
      setViewerCoachPlanExpiresAt(null);
      setViewerSitePlanStatus(null);
      setViewerSitePlanExpiresAt(null);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadViewerCoachPlan();
  }, [loadViewerCoachPlan]);

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setAvatarSignedUrl(null);
        setCoachPlans([]);

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
          headline:
            p.account_type === "coach"
              ? "Professional Fitness Coach & Nutritionist"
              : "Fitness Enthusiast",
        };

        setProfile(mapped);

        if (mapped.account_type === "coach") {
          await loadCoachPlans(mapped.user_id);
        }

        if (mapped.avatar_url && !isHttpUrl(mapped.avatar_url)) {
          const { data: signed, error: signErr } = await supabase.storage
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
  }, [id, loadCoachPlans]);

  const canFollow = !!user?.id && !!profile?.user_id && user.id !== profile.user_id;
  const isCoach = profile?.account_type === "coach";

  const siteSubscriptionIsActive = React.useMemo(() => {
    if (!viewerSitePlanStatus || !viewerSitePlanExpiresAt) return false;
    if (viewerSitePlanStatus !== "active") return false;
    const exp = new Date(viewerSitePlanExpiresAt).getTime();
    return Number.isFinite(exp) && exp > Date.now();
  }, [viewerSitePlanExpiresAt, viewerSitePlanStatus]);

  const hasActiveCoachSubscription = React.useMemo(() => {
    if (!viewerCoachPlanId) return false;
    if (viewerCoachPlanStatus !== "active" && viewerCoachPlanStatus !== "pending") return false;
    if (!viewerCoachPlanExpiresAt) return true;
    const exp = new Date(viewerCoachPlanExpiresAt).getTime();
    return Number.isFinite(exp) ? exp > Date.now() : true;
  }, [viewerCoachPlanExpiresAt, viewerCoachPlanId, viewerCoachPlanStatus]);

  const subscribeToCoachPlan = async (coachPlanId: string, tier: CoachPlanTier) => {
    if (!profile?.user_id) return;

    if (!user?.id) {
      toast({ title: "Login required", description: "Please sign in to subscribe." });
      navigate("/signin");
      return;
    }

    if (!siteSubscriptionIsActive) {
      toast({
        title: "Subscription required",
        description: "You need an active site plan (Basic/Gold/Premium) before subscribing to a coach.",
      });
      navigate("/subscription");
      return;
    }

    if (hasActiveCoachSubscription && viewerCoachPlanId !== coachPlanId) {
      toast({
        title: "One coach only",
        description: "You can subscribe to one coach at a time.",
      });
      return;
    }

    try {
      setSubscribeBusyPlanId(coachPlanId);

      const now = new Date();
      const expiresAt = viewerSitePlanExpiresAt ? new Date(viewerSitePlanExpiresAt) : new Date(now);
      if (!viewerSitePlanExpiresAt) expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          coach_plan_id: coachPlanId,
          coach_plan_status: "pending",
          coach_plan_started_at: now.toISOString(),
          coach_plan_expires_at: expiresAt.toISOString(),
        } as any)
        .eq("user_id", user.id);

      if (upErr) throw upErr;

      toast({ title: "Subscribed", description: `Request sent for ${tierLabel(tier)} plan.` });
      await loadViewerCoachPlan();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Could not subscribe to coach." });
    } finally {
      setSubscribeBusyPlanId(null);
    }
  };

  const refreshFollowStatus = React.useCallback(async () => {
    try {
      if (!user?.id || !profile?.user_id || user.id === profile.user_id) {
        setIsFollowing(false);
        return;
      }

      const { data, error: followErr } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.user_id)
        .maybeSingle();

      if (followErr) throw followErr;
      setIsFollowing(Boolean(data?.id));
    } catch (e) {
      // If table/policies aren't ready yet, don't break the whole page.
      setIsFollowing(false);
    }
  }, [profile?.user_id, user?.id]);

  const refreshCounts = React.useCallback(async () => {
    try {
      if (!profile?.user_id) return;

      // Prefer RPC for counts so they are visible to everyone without exposing follow rows.
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_follow_counts", {
        target_user_id: profile.user_id,
      } as any);

      if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData[0]) {
        setFollowersCount(Number((rpcData[0] as any).followers_count ?? 0));
        setFollowingCount(Number((rpcData[0] as any).following_count ?? 0));
        return;
      }

      // Fallback: legacy count queries (may return 0 if RLS blocks access)
      const { count: followers, error: followersErr } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", profile.user_id);
      if (followersErr) throw followersErr;

      const { count: following, error: followingErr } = await supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", profile.user_id);
      if (followingErr) throw followingErr;

      setFollowersCount(followers);
      setFollowingCount(following);
    } catch {
      setFollowersCount(0);
      setFollowingCount(0);
    }
  }, [profile?.user_id]);

  React.useEffect(() => {
    refreshFollowStatus();
  }, [refreshFollowStatus]);

  React.useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const toggleFollow = async () => {
    try {
      if (!user) {
        toast({ title: "Login required", description: "Please sign in to follow users." });
        return;
      }
      if (!profile?.user_id) return;
      if (user.id === profile.user_id) return;

      setFollowLoading(true);

      if (isFollowing) {
        const { error: delErr } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.user_id);

        if (delErr) throw delErr;
        setIsFollowing(false);
        
        // Play unfollow sound
        const unfollowSound = new Audio("/sounds/unfollow.wav");
        unfollowSound.play().catch(e => console.log("Sound play failed:", e));
        
        toast({ title: "Unfollowed" });
      } else {
        const { error: insErr } = await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, following_id: profile.user_id });

        // 23505 = unique_violation (already following)
        if (insErr && (insErr as any).code !== "23505") throw insErr;

        setIsFollowing(true);
        
        // Play follow sound
        const followSound = new Audio("/sounds/follow.mp3");
        followSound.play().catch(e => console.log("Sound play failed:", e));
        
        toast({ title: "Following" });
      }

      // Refresh counts after change
      await refreshCounts();
    } catch (e: any) {
      console.error("toggleFollow error:", e);
      toast({ title: "Action failed", description: e?.message ?? "Could not update follow status" });
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Profile">
        <div className="flex h-[80vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Loading profile data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout title="Not Found">
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-bold">Profile not found</h2>
          <p className="text-muted-foreground">{error ?? "User does not exist."}</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={profile.full_name ?? "Profile"}>
      <div className="min-h-screen bg-muted/10 pb-10">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative mb-6 pt-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-white to-gray-200 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500" />
                <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-[6px] border-background shadow-xl relative z-10">
                  <AvatarImage
                    src={(isHttpUrl(profile.avatar_url) ? profile.avatar_url : avatarSignedUrl) ?? undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl font-bold bg-muted text-muted-foreground">
                    {initials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                {isCoach && (
                  <div
                    className="absolute bottom-2 right-2 z-20 bg-blue-600 text-white p-1.5 rounded-full border-4 border-background shadow-sm"
                    title="Verified Coach"
                  >
                    <Trophy className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Header */}
              <div className="flex-1 space-y-2 md:mb-4 w-full">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      {profile.full_name}
                      {isCoach && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium">{profile.headline ?? "Member"}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> Egypt
                      </span>
                      {profile.age && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4" /> {profile.age} Years
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-2 md:mt-0">
                    {canFollow && (
                      <>
                        <Button
                          variant="outline"
                          className="rounded-full px-6 shadow-sm hover:bg-muted/50"
                          onClick={() => navigate(`/chat/${profile.user_id}`)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                        <Button
                          className={`rounded-full px-6 shadow-md transition-all ${
                            isFollowing
                              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              : "bg-primary hover:bg-primary/90"
                          }`}
                          onClick={toggleFollow}
                          disabled={followLoading}
                        >
                          {followLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isFollowing ? (
                            "Following"
                          ) : (
                            "Follow"
                          )}
                        </Button>
                      </>
                    )}
                    {user?.id === profile.user_id && (
                      <Button variant="outline" className="rounded-full" onClick={() => navigate("/profile")}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="rounded-3xl border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 divide-x divide-border/50">
                    <div className="p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer group">
                      <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {followersCount ?? 0}
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                        Followers
                      </div>
                    </div>
                    <div className="p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer group">
                      <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {followingCount ?? 0}
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                        Following
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm border-muted/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    About <Badge variant="secondary" className="text-[10px] h-5">{profile.account_type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {profile.headline ? profile.headline : "No bio available."}
                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-md">Fitness</Badge>
                    <Badge variant="outline" className="rounded-md">Health</Badge>
                    {isCoach && <Badge variant="outline" className="rounded-md">Coaching</Badge>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main */}
            <div className="md:col-span-2 space-y-6">
              {isCoach && (coachPlansLoading || coachPlans.length > 0) ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Coaching Plans</h2>
                    <span className="text-sm text-muted-foreground">Premium Access</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {coachPlansLoading ? (
                      <Card className="rounded-3xl p-8 text-center text-muted-foreground">Loading plans...</Card>
                    ) : (
                      coachPlans.map((plan) => {
                        const isActive = viewerCoachPlanId === plan.id && viewerCoachPlanStatus === "active";
                        const isPending = viewerCoachPlanId === plan.id && viewerCoachPlanStatus === "pending";
                        const isMine = user?.id === profile.user_id;
                        const disabledBecauseNoSitePlan = !siteSubscriptionIsActive && !isMine;
                        const disabledBecauseOtherCoach = hasActiveCoachSubscription && viewerCoachPlanId !== plan.id;
                        const isBusy = subscribeBusyPlanId === plan.id;

                        return (
                      <Card
                        key={plan.id}
                        className="rounded-3xl overflow-hidden border-muted hover:border-primary/50 transition-all duration-300 hover:shadow-lg group relative flex flex-col"
                      >
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        {plan.imageUrl && (
                          <div className="w-full h-[140px] bg-muted/30">
                            <img
                              src={plan.imageUrl}
                              alt={plan.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <Badge
                              variant="secondary"
                              className="mb-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              {tierLabel(plan.type)}
                            </Badge>
                            <h3 className="text-base font-bold text-primary">{plan.subscriptionLabel}</h3>
                          </div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
                        </CardHeader>

                        <CardContent className="pb-6 flex-1">
                          <div className="flex gap-3 text-sm text-muted-foreground">
                            <span>{plan.musclesCount} muscles</span>
                            <span>•</span>
                            <span>{plan.exercisesCount} exercises</span>
                          </div>
                        </CardContent>

                        <CardFooter className="pt-0">
                          <Button
                            className="w-full rounded-xl font-semibold shadow-md group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                            variant={isActive ? "secondary" : "default"}
                            disabled={
                              isMine ||
                              isActive ||
                              isPending ||
                              isBusy ||
                              disabledBecauseNoSitePlan ||
                              disabledBecauseOtherCoach
                            }
                            onClick={() => subscribeToCoachPlan(plan.id, plan.type)}
                          >
                            {isMine
                              ? "Your Plan"
                              : !siteSubscriptionIsActive
                                ? "Requires Active Site Plan"
                                : disabledBecauseOtherCoach
                                  ? "Already subscribed to a coach"
                                  : isBusy
                                    ? "Working..."
                                    : isActive
                                      ? "Active Plan"
                                      : isPending
                                        ? "Pending Approval"
                                        : "Subscribe Now"}
                          </Button>
                        </CardFooter>
                      </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-muted rounded-3xl text-center bg-card/30">
                  <Users className="w-10 h-10 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-medium">{isCoach ? "No plans available yet" : "No coach plans"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {isCoach
                      ? "This coach hasn't published any coaching plans yet."
                      : "This user is not a coach."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
