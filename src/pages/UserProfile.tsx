import React from "react";
import MainLayout from "@/components/layout/MainLayout";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useParams } from "react-router-dom";

type Plan = {
  id: string;
  title: string;
  description?: string | null;
  priceLabel: string;
  features?: string[];
  isSubscribed?: boolean;
};

type Profile = {
  id: string;
  full_name: string;
  account_type: "user" | "coach";
  avatar_url?: string | null;
  headline?: string | null;
  plans?: Plan[]; // ✅ عشان الكوتش
  age?:number
};

function initials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function UserProfilePage() {
  // ✅ Static profile (غيره براحتك)
  const { id } = useParams();
  /** use the id params to get profile in database by id with supabase */
  const profile: Profile = {
    id: "profile_123",
    full_name: "Mohamed Abdelwahab",
    account_type: "coach", // جرّب خليها "user"
    avatar_url: "",
    age:24,
    headline: "Strength & Nutrition Coach",
    plans: [
      {
        id: "plan_basic",
        title: "Basic Plan",
        description: "Weekly check-ins + training plan",
        priceLabel: "EGP 299 / month",
        features: ["Weekly check-in", "Training plan", "Nutrition tips"],
        isSubscribed: false,
      },
      {
        id: "plan_pro",
        title: "Pro Plan",
        description: "Full coaching + daily follow-up",
        priceLabel: "EGP 699 / month",
        features: ["Daily follow-up", "Custom plan", "Priority support"],
        isSubscribed: true,
      },
    ],
  };

  const isCoach = profile.account_type === "coach";

  // ✅ Static follow state (UI only)
  const [isFollowing, setIsFollowing] = React.useState(false);

  return (
    <MainLayout title="User Profile">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <CardTitle className="text-2xl">{profile.full_name}</CardTitle>

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
                <div className="mt-1 font-medium">{profile.account_type}</div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">Age</div>
                <div className="mt-1 font-medium truncate">{profile.age}</div>
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
