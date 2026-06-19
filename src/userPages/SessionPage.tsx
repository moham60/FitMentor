import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import MainLayout from '@/components/layout/MainLayout';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import {
  Loader2,
  PlayCircle,
} from 'lucide-react';

import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

// ===============================
// MUSCLE LABELS
// ===============================

const MUSCLE_MAP: Record<string, string> = {
  chest: 'Chest',
  biceps: 'Biceps',
  triceps: 'Triceps',
  'front-shoulders': 'Front Shoulders',
  'rear-shoulders': 'Rear Shoulders',
  traps: 'Trapezius',
  'traps-middle': 'Middle Trapezius',
  lats: 'Lats',
  lowerback: 'Lower Back',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abdominals: 'Abdominals',
  obliques: 'Obliques',
  forearms: 'Forearms',
  hands: 'Hands',
};

// ===============================
// HELPERS
// ===============================

const normalizeExerciseName = (
  name: string
) => {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
};

const extractYoutubeId = (
  url: string | null | undefined
): string | null => {
  if (!url) return null;

  let match = url.match(
    /youtube\.com\/embed\/([^/?]+)/
  );

  if (match) return match[1];

  match = url.match(/[?&]v=([^&]+)/);

  if (match) return match[1];

  match = url.match(
    /youtu\.be\/([^?]+)/
  );

  if (match) return match[1];

  if (
    /^[a-zA-Z0-9_-]{11}$/.test(url)
  )
    return url;

  return null;
};

// ===============================
// PAGE
// ===============================

const SessionPage = () => {
  const { sessionId } = useParams();

  const navigate = useNavigate();

  const apiBaseUrl =
    import.meta.env
      .VITE_CHATBOT_API_URL ||
    'http://localhost:8000';

  const [loading, setLoading] =
    useState(false);

  const [session, setSession] =
    useState<any>(null);

  const [routine, setRoutine] =
    useState<any>(null);

  const [starting, setStarting] =
    useState(false);

  const [finishing, setFinishing] =
    useState(false);

  const [
    exerciseVideoMap,
    setExerciseVideoMap,
  ] = useState<
    Record<string, string | null>
  >({});

  const [
    activeExercise,
    setActiveExercise,
  ] = useState<any>(null);

  // ===============================
  // LOAD SESSION
  // ===============================

  const load = async () => {
    if (!sessionId) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${apiBaseUrl}/api/model2/sessions/${sessionId}`
      );

      if (!res.ok)
        throw new Error(
          'Failed to load session'
        );

      const data = await res.json();

      setSession(data.session || null);

      setRoutine(data.routine || null);

      const exercises =
        data.routine?.plan
          ?.exercises || [];

      // ===============================
      // GET EXERCISE LIBRARY
      // ===============================

      const {
        data: libraryData,
        error,
      } = await supabase
        .from('exercise_library')
        .select(
          'name_en, video_url'
        );

      if (error) {
        console.error(
          'Supabase error:',
          error
        );

        return;
      }

      const videoMap: Record<
        string,
        string | null
      > = {};

      // ===============================
      // MATCH VIDEOS
      // ===============================

      for (const ex of exercises) {
        const exerciseName =
          ex.exercise_name;

        if (!exerciseName) continue;

        const normalizedExercise =
          normalizeExerciseName(
            exerciseName
          );

        const matchedExercise =
          libraryData?.find(
            (item: any) => {
              const normalizedDbName =
                normalizeExerciseName(
                  item.name_en
                );

              const exerciseWords =
                normalizedExercise.split(
                  ' '
                );

              return exerciseWords.every(
                (word) =>
                  normalizedDbName.includes(
                    word
                  )
              );
            }
          );

        console.log(
          'Searching:',
          exerciseName
        );

        console.log(
          'Matched:',
          matchedExercise
        );

        if (
          matchedExercise?.video_url
        ) {
          const youtubeId =
            extractYoutubeId(
              matchedExercise.video_url
            );

          console.log(
            'YouTube ID:',
            youtubeId
          );

          if (youtubeId) {
            videoMap[
              exerciseName
            ] = youtubeId;
          }
        }
      }

      console.log(
        'Final Video Map:',
        videoMap
      );

      setExerciseVideoMap(
        videoMap
      );
    } catch (err) {
      console.error(err);

      toast.error(
        'Failed to load session'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [sessionId]);

  // ===============================
  // START SESSION
  // ===============================

  const handleStart = async () => {
    if (!sessionId) return;

    setStarting(true);

    try {
      const res = await fetch(
        `${apiBaseUrl}/api/model2/sessions/${sessionId}/start`,
        {
          method: 'POST',
        }
      );

      if (!res.ok)
        throw new Error(
          'Start failed'
        );

      await load();

      toast.success(
        'Session started'
      );
    } catch (err) {
      console.error(err);

      toast.error(
        'Could not start session'
      );
    } finally {
      setStarting(false);
    }
  };

  // ===============================
  // COMPLETE EXERCISE
  // ===============================

  const handleCompleteExercise =
    async (idx: number) => {
      if (!sessionId) return;

      try {
        const res = await fetch(
          `${apiBaseUrl}/api/model2/sessions/${sessionId}/exercise/${idx}/complete`,
          {
            method: 'POST',
          }
        );

        if (!res.ok)
          throw new Error(
            'Failed'
          );

        await load();

        toast.success(
          'Exercise completed'
        );
      } catch (err) {
        console.error(err);

        toast.error(
          'Could not complete exercise'
        );
      }
    };

  // ===============================
  // FINISH SESSION
  // ===============================

  const handleFinish =
    async () => {
      if (!sessionId) return;

      setFinishing(true);

      try {
        const res = await fetch(
          `${apiBaseUrl}/api/model2/sessions/${sessionId}/finish`,
          {
            method: 'POST',
          }
        );

        if (!res.ok)
          throw new Error(
            'Failed'
          );

        await load();

        toast.success(
          'Session finished'
        );

        navigate('/workouts');
      } catch (err) {
        console.error(err);

        toast.error(
          'Could not finish session'
        );
      } finally {
        setFinishing(false);
      }
    };

  // ===============================
  // LOADING
  // ===============================

  if (loading) {
    return (
      <MainLayout title="Session">
        <div className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" />
        </div>
      </MainLayout>
    );
  }

  // ===============================
  // UI
  // ===============================

  return (
    <MainLayout
      title={`Session ${
        sessionId || ''
      }`}
    >
      <div className="space-y-6">
        {/* =============================== */}
        {/* SESSION DETAILS */}
        {/* =============================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Session Details
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <div>
                User:{' '}
                {session?.user_id}
              </div>

              <div>
                Date:{' '}
                {
                  session?.session_date
                }
              </div>

              <div>
                Status:{' '}
                {session?.status}
              </div>

              <div>
                Started:{' '}
                {session?.start_time ||
                  'Not started'}
              </div>

              <div>
                Ended:{' '}
                {session?.end_time ||
                  'Not ended'}
              </div>
            </div>

            <div className="mt-4">
              <Button
                onClick={
                  handleStart
                }
                disabled={
                  starting ||
                  session?.start_time
                }
              >
                {starting
                  ? 'Starting...'
                  : 'Start Session'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* =============================== */}
        {/* EXERCISES */}
        {/* =============================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Exercises
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {(
              routine?.plan
                ?.exercises || []
            ).map(
              (
                ex: any,
                idx: number
              ) => {
                const completed = (
                  session?.notes &&
                  Array.isArray(
                    session.notes
                  )
                    ? session.notes
                    : []
                ).includes(
                  String(idx)
                );

                return (
                  <div
                    key={idx}
                    className="border rounded-xl p-4"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-semibold text-lg">
                          {
                            ex.exercise_name
                          }
                        </div>

                        <div className="text-xs text-muted-foreground mt-1">
                          {MUSCLE_MAP[
                            ex
                              .target_muscle
                          ] ||
                            ex.target_muscle}{' '}
                          •{' '}
                          {
                            ex.equipment
                          }
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Tutorial Button */}

                        {exerciseVideoMap[
                          ex
                            .exercise_name
                        ] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setActiveExercise(
                                {
                                  ...ex,
                                  youtubeId:
                                    exerciseVideoMap[
                                      ex
                                        .exercise_name
                                    ],
                                }
                              )
                            }
                          >
                            <PlayCircle className="w-4 h-4 mr-1" />

                            Tutorial
                          </Button>
                        ) : (
                          <div className="text-xs text-red-500">
                            No Tutorial
                          </div>
                        )}

                        {/* Complete Button */}

                        <Button
                          size="sm"
                          disabled={
                            completed
                          }
                          onClick={() =>
                            handleCompleteExercise(
                              idx
                            )
                          }
                        >
                          {completed
                            ? 'Done'
                            : 'Complete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>

        {/* =============================== */}
        {/* FINISH */}
        {/* =============================== */}

        <div className="flex justify-end">
          <Button
            onClick={handleFinish}
            disabled={
              finishing ||
              session?.status ===
                'completed'
            }
          >
            {finishing
              ? 'Finishing...'
              : 'Finish Session'}
          </Button>
        </div>
      </div>

      {/* =============================== */}
      {/* YOUTUBE MODAL */}
      {/* =============================== */}

      {activeExercise && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-3xl rounded-2xl p-4 relative">
            <button
              onClick={() =>
                setActiveExercise(
                  null
                )
              }
              className="absolute right-3 top-3 text-xl"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-2">
              {
                activeExercise.exercise_name
              }
            </h2>

            <div className="text-sm text-muted-foreground mb-4">
              {MUSCLE_MAP[
                activeExercise
                  .target_muscle
              ] ||
                activeExercise.target_muscle}{' '}
              •{' '}
              {
                activeExercise.equipment
              }
            </div>

            <iframe
              className="w-full aspect-video rounded-xl"
              src={`https://www.youtube.com/embed/${activeExercise.youtubeId}?rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default SessionPage;