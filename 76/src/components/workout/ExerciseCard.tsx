import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight, Play, Info, Timer, Flame, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise, getDifficultyColor } from '@/hooks/useExercises';

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  showDetails?: boolean;
}

const ExerciseCard = ({ exercise, onSelect, showDetails = true }: ExerciseCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getMuscleIcon = (muscle: string) => {
    const icons: Record<string, string> = {
      chest: '🏋️',
      back: '🔙',
      shoulders: '🎯',
      biceps: '💪',
      triceps: '🦾',
      legs: '🦵',
      abs: '🎽',
      cardio: '❤️',
    };
    return icons[muscle] || '💪';
  };

  const getEquipmentLabel = (equipment: string) => {
    const labels: Record<string, string> = {
      barbell: 'Barbell',
      dumbbell: 'Dumbbell',
      cable: 'Cable',
      machine: 'Machine',
      bodyweight: 'Bodyweight',
      kettlebell: 'Kettlebell',
    };
    return labels[equipment] || equipment;
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return labels[difficulty] || difficulty;
  };

  const getMuscleLabel = (muscle: string) => {
    const labels: Record<string, string> = {
      chest: 'Chest',
      back: 'Back',
      shoulders: 'Shoulders',
      biceps: 'Biceps',
      triceps: 'Triceps',
      legs: 'Legs',
      abs: 'Abs',
      cardio: 'Cardio',
    };
    return labels[muscle] || muscle;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                {getMuscleIcon(exercise.muscle_group)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{exercise.name_ar}</p>
                <p className="text-xs text-muted-foreground">{exercise.name_en}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", getDifficultyColor(exercise.difficulty))}>
                    {getDifficultyLabel(exercise.difficulty)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getEquipmentLabel(exercise.equipment)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      {showDetails && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl">
                {getMuscleIcon(exercise.muscle_group)}
              </div>
              <div>
                <p className="text-xl">{exercise.name_ar}</p>
                <p className="text-sm font-normal text-muted-foreground">{exercise.name_en}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <Dumbbell className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-sm font-bold">{getMuscleLabel(exercise.muscle_group)}</p>
                <p className="text-xs text-muted-foreground">Primary Muscle</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <Timer className="w-5 h-5 mx-auto mb-1 text-accent" />
                <p className="text-sm font-bold">{getEquipmentLabel(exercise.equipment)}</p>
                <p className="text-xs text-muted-foreground">Equipment</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <Flame className="w-5 h-5 mx-auto mb-1 text-orange" />
                <p className="text-sm font-bold">{exercise.calories_per_minute}</p>
                <p className="text-xs text-muted-foreground">Cal/Min</p>
              </div>
            </div>

            {/* Secondary Muscles */}
            {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Secondary Muscles</p>
                <div className="flex flex-wrap gap-2">
                  {exercise.secondary_muscles.map((muscle, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {exercise.instructions_en && (
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <p className="font-medium">How to Perform</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {exercise.instructions_en}
                </p>
              </div>
            )}

            {/* Tips */}
            {exercise.tips_en && (
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                <p className="font-medium text-accent mb-1">💡 Pro Tip</p>
                <p className="text-sm text-muted-foreground">{exercise.tips_en}</p>
              </div>
            )}

            <Button 
              onClick={() => {
                onSelect?.(exercise);
                setIsOpen(false);
              }}
              className="w-full bg-gradient-primary shadow-glow gap-2"
            >
              <Play className="w-5 h-5" />
              Add to Workout
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default ExerciseCard;
