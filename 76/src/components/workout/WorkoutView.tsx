import { useState } from 'react';
import { Play, Dumbbell, Search, Filter, ChevronDown, Zap, Flame, Timer, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useExercises, getMuscleGroups, getEquipmentTypes, getDifficultyColor } from '@/hooks/useExercises';
import MuscleMap from './MuscleMap';
import ExerciseCard from './ExerciseCard';
import { cn } from '@/lib/utils';

const WorkoutView = () => {
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const { exercises, loading, error } = useExercises(
    selectedMuscle || 'all',
    selectedEquipment,
    searchQuery
  );

  const muscleGroups = getMuscleGroups();
  const equipmentTypes = getEquipmentTypes();

  const handleMuscleSelect = (muscle: string) => {
    setSelectedMuscle(muscle === selectedMuscle ? 'all' : muscle);
    setViewMode('list');
  };

  const stats = {
    totalExercises: exercises.length,
    muscleGroups: new Set(exercises.map(e => e.muscle_group)).size,
  };

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-display font-bold text-foreground">Exercises</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'map' ? 'default' : 'outline'}
              onClick={() => setViewMode('map')}
              className="gap-1"
            >
              <Target className="w-4 h-4" />
              Map
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="gap-1"
            >
              <Dumbbell className="w-4 h-4" />
              List
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Click on a muscle to see exercises • {exercises.length} exercises available
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gradient-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Exercises</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{stats.totalExercises}</p>
        </div>
        <div className="bg-gradient-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Muscle Groups</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{stats.muscleGroups}</p>
        </div>
      </div>

      {/* View Mode Content */}
      {viewMode === 'map' ? (
        <div className="bg-gradient-card rounded-2xl p-6 border border-border/50 mb-6">
          <MuscleMap 
            selectedMuscle={selectedMuscle} 
            onMuscleSelect={handleMuscleSelect} 
          />
        </div>
      ) : (
        <>
          {/* Search & Filter */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </Button>

            {/* Filters Panel */}
            {showFilters && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-xl animate-fade-in">
                {/* Muscle Groups */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Muscle Group</label>
                  <div className="flex flex-wrap gap-2">
                    {muscleGroups.map((muscle) => (
                      <button
                        key={muscle.id}
                        onClick={() => setSelectedMuscle(muscle.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                          selectedMuscle === muscle.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50 text-muted-foreground"
                        )}
                      >
                        <span className="mr-1">{muscle.icon}</span>
                        {muscle.name_en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equipment */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Equipment</label>
                  <div className="flex flex-wrap gap-2">
                    {equipmentTypes.map((equipment) => (
                      <button
                        key={equipment.id}
                        onClick={() => setSelectedEquipment(equipment.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                          selectedEquipment === equipment.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:border-primary/50 text-muted-foreground"
                        )}
                      >
                        {equipment.name_en}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Muscle Indicator */}
          {selectedMuscle && selectedMuscle !== 'all' && (
            <div className="flex items-center justify-between mb-4 p-3 bg-primary/10 rounded-xl border border-primary/20">
              <span className="text-sm font-medium text-primary">
                Showing: {muscleGroups.find(m => m.id === selectedMuscle)?.name_en} exercises
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMuscle('all')}
                className="text-primary hover:text-primary"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Exercises List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-semibold text-foreground">
                {selectedMuscle && selectedMuscle !== 'all' 
                  ? `${muscleGroups.find(m => m.id === selectedMuscle)?.name_en} Exercises`
                  : 'All Exercises'}
              </h2>
              <span className="text-sm text-muted-foreground">{exercises.length} found</span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                <p>Error loading exercises</p>
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-12">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No exercises found</p>
                <p className="text-sm text-muted-foreground/70">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3 stagger-children">
                {exercises.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkoutView;
