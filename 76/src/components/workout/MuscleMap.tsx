import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MuscleMapProps {
  selectedMuscle: string | null;
  onMuscleSelect: (muscle: string) => void;
}

const muscleGroups = {
  // Front view muscles
  chest: { name: 'Chest', nameAr: 'الصدر' },
  shoulders: { name: 'Shoulders', nameAr: 'الكتف' },
  biceps: { name: 'Biceps', nameAr: 'البايسبس' },
  abs: { name: 'Abs', nameAr: 'البطن' },
  legs: { name: 'Legs', nameAr: 'الأرجل' },
  // Back view muscles
  back: { name: 'Back', nameAr: 'الظهر' },
  triceps: { name: 'Triceps', nameAr: 'الترايسبس' },
};

const MuscleMap = ({ selectedMuscle, onMuscleSelect }: MuscleMapProps) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');

  const getMuscleStyle = (muscle: string) => {
    const isActive = selectedMuscle === muscle;
    const isHovered = hoveredMuscle === muscle;
    
    return cn(
      "cursor-pointer transition-all duration-300",
      isActive 
        ? "fill-primary stroke-primary" 
        : isHovered 
          ? "fill-primary/60 stroke-primary/80" 
          : "fill-muted/30 stroke-muted-foreground/40 hover:fill-primary/40"
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setView('front')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            view === 'front' 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Front
        </button>
        <button
          onClick={() => setView('back')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            view === 'back' 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Back
        </button>
      </div>

      {/* Hovered/Selected Muscle Label */}
      <div className="h-8 flex items-center justify-center">
        {(hoveredMuscle || selectedMuscle) && (
          <div className="px-4 py-1.5 bg-primary/10 rounded-full animate-fade-in">
            <span className="text-sm font-semibold text-primary">
              {muscleGroups[hoveredMuscle as keyof typeof muscleGroups]?.name || 
               muscleGroups[selectedMuscle as keyof typeof muscleGroups]?.name}
            </span>
          </div>
        )}
      </div>

      {/* Body SVG */}
      <div className="relative w-full max-w-[280px] aspect-[1/2]">
        {view === 'front' ? (
          <svg
            viewBox="0 0 200 400"
            className="w-full h-full"
            style={{ filter: 'drop-shadow(0 4px 12px hsl(var(--primary) / 0.1))' }}
          >
            {/* Body Outline */}
            <ellipse cx="100" cy="40" rx="30" ry="35" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1.5" />
            
            {/* Neck */}
            <rect x="90" y="70" width="20" height="20" rx="5" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
            
            {/* Shoulders - clickable */}
            <path
              d="M 55 95 Q 40 100 35 115 L 55 120 L 60 100 Z"
              className={getMuscleStyle('shoulders')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('shoulders')}
              onMouseEnter={() => setHoveredMuscle('shoulders')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            <path
              d="M 145 95 Q 160 100 165 115 L 145 120 L 140 100 Z"
              className={getMuscleStyle('shoulders')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('shoulders')}
              onMouseEnter={() => setHoveredMuscle('shoulders')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />

            {/* Chest - clickable */}
            <path
              d="M 60 95 L 100 95 L 100 150 L 60 150 Q 55 130 60 95"
              className={getMuscleStyle('chest')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('chest')}
              onMouseEnter={() => setHoveredMuscle('chest')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            <path
              d="M 140 95 L 100 95 L 100 150 L 140 150 Q 145 130 140 95"
              className={getMuscleStyle('chest')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('chest')}
              onMouseEnter={() => setHoveredMuscle('chest')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />

            {/* Biceps - clickable */}
            <path
              d="M 35 120 L 55 125 L 55 175 L 40 180 Q 30 155 35 120"
              className={getMuscleStyle('biceps')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('biceps')}
              onMouseEnter={() => setHoveredMuscle('biceps')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            <path
              d="M 165 120 L 145 125 L 145 175 L 160 180 Q 170 155 165 120"
              className={getMuscleStyle('biceps')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('biceps')}
              onMouseEnter={() => setHoveredMuscle('biceps')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />

            {/* Forearms */}
            <path d="M 40 180 L 55 175 L 50 230 L 35 235 Q 35 205 40 180" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
            <path d="M 160 180 L 145 175 L 150 230 L 165 235 Q 165 205 160 180" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />

            {/* Abs - clickable */}
            <path
              d="M 75 150 L 125 150 L 125 220 L 75 220 Z"
              className={getMuscleStyle('abs')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('abs')}
              onMouseEnter={() => setHoveredMuscle('abs')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            {/* Abs detail lines */}
            <line x1="100" y1="155" x2="100" y2="215" className="stroke-muted-foreground/20" strokeWidth="1" />
            <line x1="78" y1="170" x2="122" y2="170" className="stroke-muted-foreground/20" strokeWidth="1" />
            <line x1="78" y1="190" x2="122" y2="190" className="stroke-muted-foreground/20" strokeWidth="1" />

            {/* Obliques */}
            <path d="M 60 150 L 75 150 L 75 220 L 65 230 Q 55 190 60 150" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
            <path d="M 140 150 L 125 150 L 125 220 L 135 230 Q 145 190 140 150" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />

            {/* Legs - Quads - clickable */}
            <path
              d="M 65 230 L 100 230 L 95 330 L 60 330 Q 55 280 65 230"
              className={getMuscleStyle('legs')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('legs')}
              onMouseEnter={() => setHoveredMuscle('legs')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            <path
              d="M 135 230 L 100 230 L 105 330 L 140 330 Q 145 280 135 230"
              className={getMuscleStyle('legs')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('legs')}
              onMouseEnter={() => setHoveredMuscle('legs')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />

            {/* Calves */}
            <path d="M 60 330 L 95 330 L 90 380 L 65 380 Q 55 355 60 330" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
            <path d="M 140 330 L 105 330 L 110 380 L 135 380 Q 145 355 140 330" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 200 400"
            className="w-full h-full"
            style={{ filter: 'drop-shadow(0 4px 12px hsl(var(--primary) / 0.1))' }}
          >
            {/* Head outline */}
            <ellipse cx="100" cy="40" rx="30" ry="35" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1.5" />
            
            {/* Neck */}
            <rect x="90" y="70" width="20" height="20" rx="5" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />

            {/* Traps */}
            <path d="M 70 88 L 100 95 L 130 88 L 130 105 L 100 110 L 70 105 Z" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />

            {/* Rear Shoulders - clickable */}
            <path
              d="M 55 95 Q 40 100 35 120 L 55 125 L 60 100 Z"
              className={getMuscleStyle('shoulders')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('shoulders')}
              onMouseEnter={() => setHoveredMuscle('shoulders')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            <path
              d="M 145 95 Q 160 100 165 120 L 145 125 L 140 100 Z"
              className={getMuscleStyle('shoulders')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('shoulders')}
              onMouseEnter={() => setHoveredMuscle('shoulders')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />

            {/* Back - Upper and Lats - clickable */}
            <path
              d="M 60 95 L 100 100 L 140 95 L 140 220 Q 100 235 60 220 L 60 95"
              className={getMuscleStyle('back')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('back')}
              onMouseEnter={() => setHoveredMuscle('back')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            {/* Back detail - spine */}
            <line x1="100" y1="100" x2="100" y2="210" className="stroke-muted-foreground/30" strokeWidth="1" />

            {/* Triceps - clickable */}
            <path
              d="M 35 120 L 55 125 L 55 180 L 40 185 Q 30 155 35 120"
              className={getMuscleStyle('triceps')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('triceps')}
              onMouseEnter={() => setHoveredMuscle('triceps')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            <path
              d="M 165 120 L 145 125 L 145 180 L 160 185 Q 170 155 165 120"
              className={getMuscleStyle('triceps')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('triceps')}
              onMouseEnter={() => setHoveredMuscle('triceps')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />

            {/* Forearms */}
            <path d="M 40 185 L 55 180 L 50 235 L 35 240 Q 35 210 40 185" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
            <path d="M 160 185 L 145 180 L 150 235 L 165 240 Q 165 210 160 185" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />

            {/* Glutes */}
            <path d="M 65 220 L 100 225 L 135 220 L 135 250 Q 100 260 65 250 L 65 220" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />

            {/* Hamstrings - clickable as part of legs */}
            <path
              d="M 65 250 L 100 255 L 100 330 L 60 330 Q 55 290 65 250"
              className={getMuscleStyle('legs')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('legs')}
              onMouseEnter={() => setHoveredMuscle('legs')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />
            <path
              d="M 135 250 L 100 255 L 100 330 L 140 330 Q 145 290 135 250"
              className={getMuscleStyle('legs')}
              strokeWidth="2"
              onClick={() => onMuscleSelect('legs')}
              onMouseEnter={() => setHoveredMuscle('legs')}
              onMouseLeave={() => setHoveredMuscle(null)}
            />

            {/* Calves */}
            <path d="M 60 330 L 95 330 L 90 380 L 65 380 Q 55 355 60 330" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
            <path d="M 140 330 L 105 330 L 110 380 L 135 380 Q 145 355 140 330" className="fill-muted/20 stroke-muted-foreground/30" strokeWidth="1" />
          </svg>
        )}
      </div>

      {/* Muscle Buttons for Mobile */}
      <div className="grid grid-cols-4 gap-2 w-full mt-4">
        {Object.entries(muscleGroups).map(([key, muscle]) => (
          <button
            key={key}
            onClick={() => onMuscleSelect(key)}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
              selectedMuscle === key
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {muscle.name}
          </button>
        ))}
        <button
          onClick={() => onMuscleSelect('all')}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
            selectedMuscle === 'all' || !selectedMuscle
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
      </div>
    </div>
  );
};

export default MuscleMap;
