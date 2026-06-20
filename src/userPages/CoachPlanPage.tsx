import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, Dumbbell, Clock, Trophy, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// 🚀 الحل العملي لتخطي فحص TypeScript للأنواع والجداول غير المُحدثة محلياً
const sb = supabase as any;

interface PlanMuscle {
  id: string;
  muscle_id: string;
  muscle_name: string;
  exercise_count: number;
  sets: number;
  reps: string;
  order_index: number;
  equipment: string | null;
  exercise_description: string | null;
}

type PlanTier = "free" | "basic" | "gold" | "premium";

interface CoachPlan {
  id: string;
  name: string;
  type: Exclude<PlanTier, "free">; // basic/gold/premium
  description: string | null;
  image_url: string | null;
}

interface WorkoutSession {
  date: string;
  completed_exercises: string[];
  total_exercises: number;
}

type CoachProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type PublicCoachPlan = {
  id: string;
  coach_id: string;
  name: string;
  type: "basic" | "gold" | "premium";
  description: string | null;
  image_url: string | null;
  coach: CoachProfile | null;
};

type CoachWithPlans = {
  coach: CoachProfile;
  plans: PublicCoachPlan[];
};

function isHttpUrl(v?: string | null) {
  return !!v && /^https?:\/\//i.test(v);
}

export default function CoachPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  // Active subscribed coach plan
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(null);
  const [planMuscles, setPlanMuscles] = useState<PlanMuscle[]>([]);
  const [todayCheckedExercises, setTodayCheckedExercises] = useState<Set<string>>(new Set());
  const [monthlyWorkouts, setMonthlyWorkouts] = useState<WorkoutSession[]>([]);
  const [planStatus, setPlanStatus] = useState<{
    status: string;
    started_at: string;
    expires_at: string;
  } | null>(null);

  // Browsing plans (shown when user is on Free)
  const [browseLoading, setBrowseLoading] = useState(false);
  const [allCoachPlans, setAllCoachPlans] = useState<PublicCoachPlan[]>([]);

  // Signed urls for avatars if stored as paths
  const [avatarSignedMap, setAvatarSignedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !coachPlan) return;
    fetchMonthlyWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, coachPlan?.id, planMuscles.length]);

  const bootstrap = async () => {
    setLoading(true);
    try {
      const isActive = await fetchCoachPlan();
      if (!isActive) {
        await fetchAllCoachPlans();
      } else {
        await fetchTodayWorkout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachPlan = async (): Promise<boolean> => {
    try {
      // استخدام sb بدلاً من supabase لتخطي خطأ coach_plan_id
      const { data: profile, error: profileError } = await sb
        .from("profiles")
        .select(
          `
          coach_plan_id,
          coach_plan_status,
          coach_plan_started_at,
          coach_plan_expires_at,
          coach_plans!profiles_coach_plan_id_fkey (
            id,
            name,
            type,
            description,
            image_url
          )
        `
        )
        .eq("user_id", user!.id)
        .single();

      if (profileError) throw profileError;

      const hasActiveCoachPlan =
        !!profile?.coach_plan_id && profile?.coach_plan_status === "active";

      if (!hasActiveCoachPlan) {
        setCoachPlan(null);
        setPlanMuscles([]);
        setPlanStatus(null);
        setTodayCheckedExercises(new Set());
        setMonthlyWorkouts([]);
        return false;
      }

      if (profile.coach_plan_started_at && profile.coach_plan_expires_at) {
        setPlanStatus({
          status: profile.coach_plan_status || "active",
          started_at: profile.coach_plan_started_at,
          expires_at: profile.coach_plan_expires_at,
        });
      } else {
        setPlanStatus(null);
      }

      setCoachPlan(profile.coach_plans as any);

      // استخدام sb بدلاً من supabase لتخطي خطأ جدول plan_muscles
      const { data: muscles, error: musclesError } = await sb
        .from("plan_muscles")
        .select("*")
        .eq("plan_id", profile.coach_plan_id)
        .order("order_index", { ascending: true });

      if (musclesError) throw musclesError;

      setPlanMuscles((muscles as PlanMuscle[]) || []);
      return true;
    } catch (err: any) {
      console.error("Error fetching coach plan:", err);
      toast({
        title: "Error",
        description: "Something went wrong while loading your plan.",
        variant: "destructive",
      });

      setCoachPlan(null);
      setPlanMuscles([]);
      setPlanStatus(null);
      return false;
    }
  };

  const fetchAllCoachPlans = async () => {
    try {
      setBrowseLoading(true);

      // استخدام sb بدلاً من supabase لتخطي خطأ جدول coach_plans
      const { data, error } = await sb
        .from("coach_plans")
        .select(
          `
          id,
          coach_id,
          name,
          type,
          description,
          image_url,
          profiles!coach_plans_coach_id_fkey (
            user_id,
            full_name,
            avatar_url
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: PublicCoachPlan[] =
        (data as any[])?.map((p) => ({
          id: p.id,
          coach_id: p.coach_id,
          name: p.name,
          type: p.type,
          description: p.description,
          image_url: p.image_url,
          coach: p.profiles
            ? {
                user_id: p.profiles.user_id,
                full_name: p.profiles.full_name,
                avatar_url: p.profiles.avatar_url,
              }
            : null,
        })) || [];

      setAllCoachPlans(mapped);

      try {
        const avatarPaths = Array.from(
          new Set(
            mapped
              .map((x) => x.coach?.avatar_url)
              .filter((v): v is string => !!v && !isHttpUrl(v))
          )
        );

        if (!avatarPaths.length) {
          setAvatarSignedMap({});
        } else {
          const pairs = await Promise.all(
            avatarPaths.map(async (path) => {
              const { data, error } = await supabase.storage
                .from("avatars")
                .createSignedUrl(path, 60 * 60);
              if (error) return [path, ""] as const;
              return [path, data.signedUrl] as const;
            })
          );

          const m: Record<string, string> = {};
          for (const [path, url] of pairs) if (url) m[path] = url;
          setAvatarSignedMap(m);
        }
      } catch (e) {
        console.warn("avatar signed url map error:", e);
        setAvatarSignedMap({});
      }
    } catch (err: any) {
      console.error("Error loading coach plans:", err);
      toast({
        title: "Error",
        description: "Could not load coach plans.",
        variant: "destructive",
      });
      setAllCoachPlans([]);
      setAvatarSignedMap({});
    } finally {
      setBrowseLoading(false);
    }
  };

  const coachesWithPlans = useMemo<CoachWithPlans[]>(() => {
    const map = new Map<string, CoachWithPlans>();

    for (const plan of allCoachPlans) {
      if (!plan.coach) continue;

      const coachId = plan.coach.user_id;
      if (!map.has(coachId)) {
        map.set(coachId, { coach: plan.coach, plans: [] });
      }
      map.get(coachId)!.plans.push(plan);
    }

    const tierOrder: Record<string, number> = { basic: 1, gold: 2, premium: 3 };

    const result = Array.from(map.values()).map((c) => ({
      ...c,
      plans: c.plans.sort((a, b) => tierOrder[a.type] - tierOrder[b.type]),
    }));

    result.sort((a, b) => b.plans.length - a.plans.length);
    return result;
  }, [allCoachPlans]);

  const fetchTodayWorkout = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // استخدام sb بدلاً من supabase لتخطي خطأ جدول user_workout_sessions
      const { data: session, error } = await sb
        .from("user_workout_sessions")
        .select("id, notes")
        .eq("user_id", user!.id)
        .eq("session_date", today)
        .maybeSingle();

      if (error) throw error;

      const completed = new Set<string>();
      if (session?.notes) {
        try {
          const checkedIds = JSON.parse(session.notes);
          if (Array.isArray(checkedIds)) checkedIds.forEach((id) => completed.add(id));
        } catch {
          // ignore
        }
      }

      setTodayCheckedExercises(completed);
    } catch (err) {
      console.error("Error fetching today workout:", err);
    }
  };

  const fetchMonthlyWorkouts = async () => {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // استخدام sb بدلاً من supabase لتخطي خطأ جدول user_workout_sessions
      const { data: sessions, error } = await sb
        .from("user_workout_sessions")
        .select("session_date, notes")
        .eq("user_id", user!.id)
        .gte("session_date", firstDay.toISOString().split("T")[0])
        .lte("session_date", lastDay.toISOString().split("T")[0]);

      if (error) throw error;

      const workoutMap = new Map<string, WorkoutSession>();

      sessions?.forEach((session: any) => {
        const date = session.session_date;
        let completedExercises: string[] = [];

        if (session.notes) {
          try {
            const checkedIds = JSON.parse(session.notes);
            if (Array.isArray(checkedIds)) completedExercises = checkedIds;
          } catch {
            // ignore
          }
        }

        workoutMap.set(date, {
          date,
          completed_exercises: completedExercises,
          total_exercises: planMuscles.length,
        });
      });

      setMonthlyWorkouts(Array.from(workoutMap.values()));
    } catch (err) {
      console.error("Error fetching monthly workouts:", err);
    }
  };

  const handleCheckExercise = async (muscleId: string, checked: boolean) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: existingSession } = await sb
        .from("user_workout_sessions")
        .select("id, notes")
        .eq("user_id", user!.id)
        .eq("session_date", today)
        .maybeSingle();

      let sessionId: string;
      let currentChecked: Set<string> = new Set();

      if (existingSession) {
        sessionId = existingSession.id;
        if (existingSession.notes) {
          try {
            const checkedIds = JSON.parse(existingSession.notes);
            if (Array.isArray(checkedIds)) currentChecked = new Set(checkedIds);
          } catch {
            // ignore
          }
        }
      } else {
        const { data: newSession, error: sessionError } = await sb
          .from("user_workout_sessions")
          .insert({
            user_id: user!.id,
            session_date: today,
            status: "in_progress",
            notes: JSON.stringify([]),
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        sessionId = newSession.id;
      }

      if (checked) currentChecked.add(muscleId);
      else currentChecked.delete(muscleId);

      const { error: updateError } = await sb
        .from("user_workout_sessions")
        .update({
          notes: JSON.stringify(Array.from(currentChecked)),
          status: currentChecked.size === planMuscles.length ? "completed" : "in_progress",
        })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      setTodayCheckedExercises(currentChecked);

      toast({
        title: checked ? "✓ Exercise saved" : "Exercise unchecked",
        description: "Progress updated successfully.",
      });
    } catch (err: any) {
      console.error("Error checking exercise:", err);
      toast({
        title: "Error",
        description: err.message || "Could not save your progress.",
        variant: "destructive",
      });
    }
  };

  const getMonthCalendar = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // Sunday=0

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  };

  const getDayWorkout = (day: number | null) => {
    if (!day) return null;
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), day).toISOString().split("T")[0];
    return monthlyWorkouts.find((w) => w.date === date);
  };

  const goToCoachProfile = (coachUserId: string) => {
    navigate(`/profile/${coachUserId}`);
  };

  if (loading) {
    return (
      <MainLayout title="Coach Plan">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  // =========================
  // FREE PLAN VIEW (NO ACTIVE COACH PLAN)
  // =========================
  if (!coachPlan) {
    return (
      <MainLayout title="Coach Plan">
        <div className="container mx-auto p-4 space-y-6">
          {/* Free plan header */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">Free Plan</CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    free
                  </Badge>
                </div>
                <Dumbbell className="h-12 w-12 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                You are currently on the <b>Free</b> plan. Subscribe to a coach plan to unlock structured training and tracking.
              </p>

              <div className="flex gap-3 flex-wrap">
                <Button onClick={fetchAllCoachPlans} disabled={browseLoading}>
                  {browseLoading ? "Loading..." : "Refresh Coach Plans"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Browse coach plans */}
          <Card>
            <CardHeader>
              <CardTitle>Browse Coach Plans (Basic / Gold / Premium)</CardTitle>
            </CardHeader>
            <CardContent>
              {browseLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : coachesWithPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No coach plans available right now.</p>
              ) : (
                <div className="grid gap-4">
                  {coachesWithPlans.map(({ coach, plans }) => {
                    const coachAvatarSrc = isHttpUrl(coach.avatar_url)
                      ? (coach.avatar_url as string)
                      : (avatarSignedMap[coach.avatar_url ?? ""] ?? "");

                    return (
                      <Card key={coach.user_id} className="border-2 border-primary/10">
                        <CardHeader>
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => goToCoachProfile(coach.user_id)}
                              title="View coach profile"
                            >
                              {coachAvatarSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={coachAvatarSrc}
                                  alt={coach.full_name || "Coach"}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}

                              <div>
                                <CardTitle className="text-xl">{coach.full_name || "Coach"}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {plans.length} plan{plans.length > 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>

                            <Trophy className="h-8 w-8 text-primary" />
                          </div>
                        </CardHeader>

                        <CardContent>
                          <div className="grid md:grid-cols-3 gap-3">
                            {plans.map((plan) => (
                              <Card
                                key={plan.id}
                                className="bg-muted/30 cursor-pointer hover:shadow-md transition-all"
                                onClick={() => goToCoachProfile(coach.user_id)}
                                title="View coach profile"
                              >
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{plan.name}</CardTitle>
                                    <Badge className="capitalize">{plan.type}</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <p className="text-sm text-muted-foreground min-h-[40px]">
                                    {plan.description || "A coach-made training plan."}
                                  </p>
                                  <Button
                                    className="w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goToCoachProfile(coach.user_id);
                                    }}
                                  >
                                    View Coach Profile
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // =========================
  // ACTIVE COACH PLAN VIEW
  // =========================
  const todayProgress = planMuscles.length
    ? (todayCheckedExercises.size / planMuscles.length) * 100
    : 0;

  return (
    <MainLayout title="Coach Plan">
      <div className="container mx-auto p-4 space-y-6">
        {/* Plan Info */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{coachPlan.name}</CardTitle>
                <Badge variant="default" className="capitalize">
                  {coachPlan.type}
                </Badge>
              </div>
              <Trophy className="h-12 w-12 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {coachPlan.description || "A personalized training plan from your coach."}
            </p>

            {planStatus && (
              <div className="flex gap-4 text-sm flex-wrap">
                <div>
                  <span className="text-muted-foreground">Start date: </span>
                  <span className="font-medium">
                    {new Date(planStatus.started_at).toLocaleDateString("en-US")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">End date: </span>
                  <span className="font-medium">
                    {new Date(planStatus.expires_at).toLocaleDateString("en-US")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {todayCheckedExercises.size} of {planMuscles.length} exercises
                </span>
                <span className="font-bold">{Math.round(todayProgress)}%</span>
              </div>
              <Progress value={todayProgress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Exercises */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Exercises ({planMuscles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {planMuscles.map((muscle, index) => {
                const isChecked = todayCheckedExercises.has(muscle.id);
                return (
                  <div
                    key={muscle.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      isChecked
                        ? "bg-green-50 dark:bg-green-950 border-green-500"
                        : "bg-muted/50 border-muted"
                    }`}
                  >
                    <Checkbox
                      id={muscle.id}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleCheckExercise(muscle.id, checked as boolean)
                      }
                      className="h-6 w-6"
                    />

                    <label htmlFor={muscle.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {index + 1}. {muscle.muscle_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {muscle.exercise_count} exercises • {muscle.sets} sets •{" "}
                            {muscle.reps} reps
                          </p>

                          {muscle.equipment && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Equipment: {muscle.equipment}
                            </p>
                          )}

                          {muscle.exercise_description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {muscle.exercise_description}
                            </p>
                          )}
                        </div>

                        {isChecked && <Check className="h-6 w-6 text-green-600" />}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly workout log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}

              {getMonthCalendar().map((day, index) => {
                const workout = getDayWorkout(day);

                const isToday =
                  day === new Date().getDate() &&
                  new Date().getMonth() === new Date().getMonth();

                return (
                  <div
                    key={index}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium relative ${
                      !day
                        ? "bg-transparent"
                        : isToday
                        ? "bg-primary text-primary-foreground ring-2 ring-primary"
                        : workout
                        ? "bg-green-500 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {day}
                    {workout && workout.completed_exercises.length > 0 && (
                      <div className="absolute bottom-0.5 right-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>Workout done</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted"></div>
                <span>Not done</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}