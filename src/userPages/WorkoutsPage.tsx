import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dumbbell, 
  BrainCircuit, 
  User, 
  Users, 
  Target, 
  Activity, 
  Scale, 
  Timer,
  Flame, 
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Types & Constants matching API ---

const ACTIVITY_LEVELS = [
  { value: "Sedentary", label: "Sedentary (No Exercise)", icon: "🛋️" },
  { value: "Lightly Active", label: "Lightly Active (1-3 days)", icon: "🚶" },
  { value: "Moderately Active", label: "Moderately Active (3-5 days)", icon: "🏃" },
  { value: "Very Active", label: "Very Active (6-7 days)", icon: "🔥" }
];

const GOALS = [
  { value: "Lose Weight", label: "Lose Weight", color: "text-red-500", bg: "bg-red-500/10" },
  { value: "Build Muscle", label: "Build Muscle", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "Strength", label: "Strength", color: "text-purple-500", bg: "bg-purple-500/10" },
  { value: "Endurance", label: "Endurance", color: "text-green-500", bg: "bg-green-500/10" },
  { value: "Maintain", label: "Maintain Weight", color: "text-orange-500", bg: "bg-orange-500/10" }
];

// Mock Data for User Profile (Ideally fetched from Supabase)
const MOCK_USER_PROFILE = {
  age: 24,
  gender: "Male",
  height_cm: 178,
  weight_kg: 75,
  activity_level: "Moderately Active",
  primary_goal: "Build Muscle"
};

const WorkoutGenerator = () => {
  // State
  const [mode, setMode] = useState<'me' | 'custom'>('me');
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [serverError, setServerError] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    age: 25,
    gender: "Male",
    height_cm: 170,
    weight_kg: 70,
    activity_level: "Moderately Active",
    primary_goal: "Build Muscle",
    equipment: [] as string[],
    target_muscles: [] as string[],
    num_exercises: 6
  });

  // Metadata from API
  const [availableMuscles, setAvailableMuscles] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);

  // Initialize Metadata
  useEffect(() => {
    // In a real scenario, you might fetch this from the API /muscles and /equipment endpoints
    // For now, we use the static lists defined in your python engine to ensure UI renders
    setAvailableMuscles([
      "Abdominals", "Biceps", "Calves", "Chest", "Forearms", "Glutes", 
      "Hamstrings", "Lats", "Lower Back", "Quadriceps", "Shoulders", "Triceps", "Traps"
    ]);
    setAvailableEquipment([
      "Barbell", "Dumbbell", "Cable", "Machine", "Body Only", "Kettlebell", "E-Z Curl Bar"
    ]);
  }, []);

  // Helpers
  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleSelection = (key: 'equipment' | 'target_muscles', item: string) => {
    setFormData(prev => {
      const current = prev[key];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [key]: updated };
    });
  };

  // Generate Workout Handler
  const handleGenerate = async () => {
    setServerError(false);

    if (formData.target_muscles.length === 0 || formData.equipment.length === 0) {
      toast.error("Please select at least one muscle group and one equipment type.");
      return;
    }

    setLoading(true);
    setGeneratedPlan(null); // Clear previous results immediately

    // Prepare payload
    const payload = mode === 'me' ? {
      ...MOCK_USER_PROFILE,
      equipment: formData.equipment,
      target_muscles: formData.target_muscles,
      num_exercises: formData.num_exercises
    } : formData;

    try {
      // 1. Call the API
      const response = await fetch('http://localhost:8000/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 2. Handle HTTP Errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.error || 'Server error');
      }
      
      // 3. Success
      const data = await response.json();
      setGeneratedPlan(data);
      toast.success("Workout plan generated successfully!");

    } catch (error) {
      // 4. Handle Failure - STRICTLY NO FALLBACK DATA
      console.error("Generation failed:", error);
      setServerError(true);
      toast.error("Failed to connect to FitMentor AI. Please ensure the server is running.");
      setGeneratedPlan(null); // Ensure no old data is shown
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout 
      title="Smart Workout Generator" 
      subtitle="AI-powered system for high-precision personalized training plans"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-primary/20 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-x" />
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BrainCircuit className="w-6 h-6 text-primary" />
                Plan Configuration
              </CardTitle>
              <CardDescription>Enter details for AI analysis</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Mode Selection */}
              <Tabs defaultValue="me" onValueChange={(v) => setMode(v as 'me' | 'custom')} className="w-full">
                <TabsList className="grid grid-cols-2 w-full mb-4">
                  <TabsTrigger value="me" className="gap-2">
                    <User className="w-4 h-4" /> Myself
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2">
                    <Users className="w-4 h-4" /> Custom User
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="custom" className="space-y-4 animate-in fade-in slide-in-from-top-2">
<div className="grid grid-cols-3 gap-3">
  <div className="space-y-2">
    <Label>Age</Label>
    <Input 
      type="number"
      min={14}
      max={80}
      value={formData.age}
      onChange={(e) => updateForm('age', Number(e.target.value))}
    />
  </div>

  <div className="space-y-2">
    <Label>Height (cm)</Label>
    <Input 
      type="number"
      min={100}
      max={250}
      value={formData.height_cm}
      onChange={(e) => updateForm('height_cm', Number(e.target.value))}
    />
  </div>

  <div className="space-y-2">
    <Label>Weight (kg)</Label>
    <Input 
      type="number"
      min={30}
      max={200}
      value={formData.weight_kg}
      onChange={(e) => updateForm('weight_kg', Number(e.target.value))}
    />
  </div>
</div>

                  
                  <div className="space-y-2">
                    <Label>Primary Goal</Label>
                    <Select 
                      value={formData.primary_goal} 
                      onValueChange={(v) => updateForm('primary_goal', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOALS.map(g => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Activity Level</Label>
                    <Select 
                      value={formData.activity_level} 
                      onValueChange={(v) => updateForm('activity_level', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_LEVELS.map(a => (
                          <SelectItem key={a.value} value={a.value}>
                             <span className="flex items-center gap-2">{a.icon} {a.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        variant={formData.gender === 'Male' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => updateForm('gender', 'Male')}
                      >
                        Male
                      </Button>
                      <Button 
                        type="button"
                        variant={formData.gender === 'Female' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => updateForm('gender', 'Female')}
                      >
                        Female
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="me">
                  <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Goal:</span>
                      <span className="font-bold text-primary">{GOALS.find(g => g.value === MOCK_USER_PROFILE.primary_goal)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-bold">{MOCK_USER_PROFILE.weight_kg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Activity:</span>
                      <span className="font-bold">{MOCK_USER_PROFILE.activity_level}</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Common Inputs */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  Available Equipment
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableEquipment.map(eq => (
                    <Badge 
                      key={eq}
                      variant={formData.equipment.includes(eq) ? 'default' : 'outline'}
                      className="cursor-pointer hover:opacity-80 transition-all py-1.5"
                      onClick={() => toggleSelection('equipment', eq)}
                    >
                      {eq}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Target Muscles
                </Label>
                <ScrollArea className="h-[120px] rounded-md border p-2">
                  <div className="flex flex-wrap gap-2">
                    {availableMuscles.map(m => (
                      <Badge 
                        key={m}
                        variant={formData.target_muscles.includes(m) ? 'secondary' : 'outline'}
                        className={cn(
                          "cursor-pointer transition-all py-1.5",
                          formData.target_muscles.includes(m) && "bg-primary/15 text-primary border-primary/20"
                        )}
                        onClick={() => toggleSelection('target_muscles', m)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between">
                    <Label>Number of Exercises</Label>
                    <span className="text-sm font-bold text-primary">{formData.num_exercises}</span>
                 </div>
                 <Slider 
                    value={[formData.num_exercises]} 
                    min={3} 
                    max={10} 
                    step={1} 
                    onValueChange={(v) => updateForm('num_exercises', v[0])}
                 />
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:to-purple-700 text-white shadow-lg shadow-primary/20 py-6 text-lg font-bold transition-all hover:scale-[1.02]"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Workout
                  </>
                )}
              </Button>

            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results & Visualization */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* EMPTY STATE */}
          {!generatedPlan && !loading && !serverError && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-muted animate-in fade-in zoom-in-95 duration-500">
               <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 relative">
                 <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping-slow"></div>
                 <BrainCircuit className="w-12 h-12 text-primary" />
               </div>
               <h3 className="text-2xl font-bold text-foreground mb-2">Ready to Generate!</h3>
               <p className="text-muted-foreground max-w-md">
                 Fill in the details on the left, and I will use Machine Learning models to design a workout plan tailored specifically to your biometrics and goals.
               </p>
               
               <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-md">
                  <div className="p-4 rounded-xl bg-card border shadow-sm">
                    <Scale className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-xs font-bold">Weight Prediction</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border shadow-sm">
                    <Activity className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-xs font-bold">Optimal Reps</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border shadow-sm">
                    <Timer className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-xs font-bold">Rest Periods</p>
                  </div>
               </div>
            </div>
          )}

          {/* ERROR STATE */}
          {serverError && !loading && (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-red-500/5 rounded-2xl border-2 border-dashed border-red-200 animate-in fade-in">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-600 mb-2">Connection Failed</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Could not connect to the FitMentor AI Engine. Please make sure the Python backend is running locally on port 8000.
                </p>
                <Button variant="outline" onClick={handleGenerate}>Try Again</Button>
             </div>
          )}

          {/* LOADING STATE */}
          {loading && (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                <h3 className="text-xl font-bold">Consulting the AI Models...</h3>
                <p className="text-muted-foreground">Calculating optimal loads based on your profile.</p>
             </div>
          )}

          {/* SUCCESS STATE */}
          {generatedPlan && !loading && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{generatedPlan.exercises.length}</p>
                            <p className="text-xs text-muted-foreground">Exercises</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                            <Timer className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{generatedPlan.workout_stats.estimated_duration_minutes}</p>
                            <p className="text-xs text-muted-foreground">Minutes (Est.)</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Dumbbell className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{generatedPlan.workout_stats.total_sets}</p>
                            <p className="text-xs text-muted-foreground">Total Sets</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                            <Flame className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{generatedPlan.workout_stats.compound_exercises}</p>
                            <p className="text-xs text-muted-foreground">Compound Ex.</p>
                        </div>
                    </CardContent>
                </Card>
              </div>

              {/* Exercises List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Recommended Routine
                    </h2>
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Save Routine
                    </Button>
                </div>

                {generatedPlan.exercises.map((ex: any, idx: number) => (
                    <Card key={idx} className="group overflow-hidden hover:shadow-md transition-all border-l-4 border-l-primary/50">
                        <CardContent className="p-0">
                            <div className="grid md:grid-cols-12 gap-4">
                                {/* Exercise Info */}
                                <div className="md:col-span-5 p-5 flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="mb-2 w-fit">{ex.target_muscle}</Badge>
                                        {ex.is_compound && (
                                            <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-0">Compound</Badge>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{ex.exercise_name}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Dumbbell className="w-3 h-3" /> {ex.equipment}
                                    </p>
                                </div>

                                {/* AI Prescription - The Cool Part */}
                                <div className="md:col-span-7 bg-muted/30 p-4 flex items-center justify-around border-r md:border-r-0 md:border-l border-dashed md:border-t-0 border-t">
                                    
                                    {/* Sets */}
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Sets</p>
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-card shadow-sm border flex items-center justify-center text-xl font-bold">
                                            {ex.ai_prescription.sets}
                                        </div>
                                    </div>

                                    {/* Reps */}
                                    <div className="text-center flex-1 px-4">
                                        <p className="text-xs text-muted-foreground mb-1">Target Reps</p>
                                        <div className="py-2 px-4 rounded-xl bg-white dark:bg-card shadow-sm border text-center">
                                            <span className="text-lg font-bold block">{ex.ai_prescription.reps.split(' ')[0]}</span>
                                            <span className="text-[10px] text-muted-foreground block truncate">
                                                {ex.ai_prescription.reps.includes('(') ? ex.ai_prescription.reps.split('(')[1].replace(')', '') : 'Standard'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Weight */}
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Weight</p>
                                        <div className="min-w-[80px] py-2 px-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 text-center">
                                            <span className="text-lg font-bold">{ex.ai_prescription.weight_kg}</span>
                                            <span className="text-xs opacity-80 ml-1">kg</span>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                            
                            {/* Footer Info */}
                            <div className="px-5 py-2 bg-muted/50 text-[11px] text-muted-foreground flex justify-between items-center">
                                <span>Rest: {ex.ai_prescription.rest_seconds} sec</span>
                                <span>Difficulty: {Array(ex.difficulty).fill('★').join('')}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default WorkoutGenerator;