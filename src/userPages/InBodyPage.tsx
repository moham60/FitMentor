import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Scale, 
  Dumbbell, 
  ScanLine, 
  FileText, 
  RotateCcw, 
  TrendingUp,
  User,
  Flame,
  CheckCircle2,
  ArrowRight,
  UploadCloud
} from 'lucide-react';

// --- Data Structure (Simulation) ---
const SIMULATED_OCR_DATA = {
  header: { 
      id: 'Fares Shereif', 
      height: 178, 
      age: 24, 
      gender: 'Male', 
      date: '2026.01.16. 10:30' 
  },
  bodyComposition: { 
      weight: 85.2,    
      smm: 38.5,       
      bodyFatMass: 18.2 
  },
  obesityAnalysis: { 
      bmi: 26.8, 
      pbf: 21.3  
  },
  segmentalLean: { 
    rightArm: 3.8, rightArmPct: 112,
    leftArm: 3.75, leftArmPct: 110,
    trunk: 28.4, trunkPct: 108,
    rightLeg: 10.2, rightLegPct: 105,
    leftLeg: 10.1, leftLegPct: 104
  },
  scores: { 
      inBodyScore: 84, 
      bmr: 1850, 
      visceralFatLevel: 6 
  }
};

const InBodyPage = () => {
  const [scanningState, setScanningState] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [scannedData, setScannedData] = useState<typeof SIMULATED_OCR_DATA | null>(null);

  // Simulation Logic
  const startSimulation = () => {
    setScanningState('scanning');
    setProgress(0);
  };

  useEffect(() => {
    if (scanningState !== 'scanning') return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setScannedData(SIMULATED_OCR_DATA);
          setScanningState('complete');
          return 100;
        }
        return Math.min(prev + (prev < 50 ? Math.random() * 15 : Math.random() * 5), 100);
      });
    }, 300);
    return () => clearInterval(timer);
  }, [scanningState]);

  const handleReset = () => {
      setScanningState('idle');
      setScannedData(null);
      setProgress(0);
  };

  return (
    <MainLayout
      title="InBody Scanner"
      subtitle="Digitize your body composition sheet instantly"
    >
      {/* =============================================
        STATE 1: IDLE (Upload Area)
        =============================================
      */}
      {scanningState === 'idle' && (
        <Card className="animate-fade-in border-dashed border-2 min-h-[500px] flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group" onClick={startSimulation}>
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-glow">
                <UploadCloud className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Upload InBody Sheet</h2>
            <p className="text-muted-foreground max-w-md text-center mb-8">
                Click here to upload a photo of your InBody 770 result. 
                Our AI will analyze the layout and extract your data automatically.
            </p>
            <Button size="lg" className="bg-gradient-primary shadow-glow gap-2">
                <ScanLine className="w-5 h-5" /> Select Image
            </Button>
        </Card>
      )}

      {/* =============================================
        STATE 2: SCANNING (Loading)
        =============================================
      */}
      {scanningState === 'scanning' && (
        <Card className="min-h-[500px] flex flex-col items-center justify-center animate-fade-in">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                    <div className="relative z-10 w-20 h-20 bg-background rounded-full border-2 border-primary flex items-center justify-center">
                         <ScanLine className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                </div>
                
                <div>
                    <h3 className="text-2xl font-bold mb-2">Analyzing Report...</h3>
                    <p className="text-muted-foreground text-sm">Please wait while we extract your metrics</p>
                </div>

                <div className="space-y-2">
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                        <span>Scanning</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>

                <div className="space-y-3 text-left bg-muted/30 p-4 rounded-xl">
                    <LoadingStep label="Detecting layout boundaries" done={progress > 20} />
                    <LoadingStep label="Reading body composition values" done={progress > 50} />
                    <LoadingStep label="Analyzing segmental lean mass" done={progress > 80} />
                </div>
            </div>
        </Card>
      )}

      {/* =============================================
        STATE 3: RESULTS (Dashboard Style)
        =============================================
      */}
      {scanningState === 'complete' && scannedData && (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Summary Card */}
            <Card className="bg-gradient-to-r from-primary/5 via-accent/5 to-transparent border-none shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">{scannedData.header.id}</h2>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    <span className="bg-background/50 px-2 py-1 rounded-md border">{scannedData.header.height} cm</span>
                                    <span className="bg-background/50 px-2 py-1 rounded-md border">{scannedData.header.age} Years</span>
                                    <span className="bg-background/50 px-2 py-1 rounded-md border">{scannedData.header.gender}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Scanned On</p>
                                <p className="font-semibold text-foreground">{scannedData.header.date}</p>
                            </div>
                            <Button variant="outline" onClick={handleReset} className="gap-2">
                                <RotateCcw className="w-4 h-4" /> Scan New
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- Left Column (Analysis) --- */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Muscle-Fat Analysis */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center text-purple">
                                    <Dumbbell className="w-5 h-5" />
                                </div>
                                Muscle-Fat Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-6">
                            <InBodyRow label="Weight" value={scannedData.bodyComposition.weight} unit="kg" normalStart={65} normalEnd={90} colorClass="bg-primary" />
                            <InBodyRow label="SMM" subLabel="Skeletal Muscle" value={scannedData.bodyComposition.smm} unit="kg" normalStart={30} normalEnd={40} isTarget colorClass="bg-purple" />
                            <InBodyRow label="Fat Mass" value={scannedData.bodyComposition.bodyFatMass} unit="kg" normalStart={10} normalEnd={20} colorClass="bg-orange" />
                        </CardContent>
                    </Card>

                    {/* Obesity Analysis */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                             <CardTitle className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
                                    <Scale className="w-5 h-5" />
                                </div>
                                Obesity Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-6">
                            <InBodyRow label="BMI" value={scannedData.obesityAnalysis.bmi} unit="kg/m²" normalStart={18.5} normalEnd={25} colorClass="bg-accent" />
                            <InBodyRow label="PBF" subLabel="% Body Fat" value={scannedData.obesityAnalysis.pbf} unit="%" normalStart={10} normalEnd={20} colorClass="bg-orange" />
                        </CardContent>
                    </Card>

                    {/* Segmental Analysis */}
                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                    <Activity className="w-5 h-5" />
                                </div>
                                Segmental Lean Mass
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                                <div className="space-y-4">
                                    <SegmentCard label="Left Arm" kg={scannedData.segmentalLean.leftArm} pct={scannedData.segmentalLean.leftArmPct} />
                                    <SegmentCard label="Left Leg" kg={scannedData.segmentalLean.leftLeg} pct={scannedData.segmentalLean.leftLegPct} />
                                </div>
                                <div className="flex items-center justify-center py-4 md:py-0">
                                     <SegmentCard label="Trunk" kg={scannedData.segmentalLean.trunk} pct={scannedData.segmentalLean.trunkPct} isCenter />
                                </div>
                                <div className="space-y-4">
                                    <SegmentCard label="Right Arm" kg={scannedData.segmentalLean.rightArm} pct={scannedData.segmentalLean.rightArmPct} />
                                    <SegmentCard label="Right Leg" kg={scannedData.segmentalLean.rightLeg} pct={scannedData.segmentalLean.rightLegPct} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Right Column (Scores & Details) --- */}
                <div className="lg:col-span-4 space-y-6">
                    {/* InBody Score */}
                    <Card className="overflow-hidden relative border-primary/20 shadow-lg hover:shadow-primary/10 transition-shadow">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
                        <CardHeader>
                            <CardTitle>InBody Score</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6 relative z-10">
                             <div className="text-6xl font-black text-primary tracking-tighter mb-2">
                                {scannedData.scores.inBodyScore}
                             </div>
                             <div className="text-sm font-medium text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
                                / 100 Points
                             </div>
                             <p className="text-xs text-center text-muted-foreground mt-4 px-2">
                                Score reflects overall body composition. Muscular individuals may exceed 100.
                             </p>
                        </CardContent>
                    </Card>

                    {/* Visceral Fat */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visceral Fat</CardTitle>
                            <CardDescription>Target: Level 10 or lower</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-4xl font-bold">{scannedData.scores.visceralFatLevel}</span>
                                <span className="text-sm text-muted-foreground mb-1">Level</span>
                                <span className={cn(
                                    "ml-auto text-xs px-2 py-1 rounded-full font-bold",
                                    scannedData.scores.visceralFatLevel <= 10 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                    {scannedData.scores.visceralFatLevel <= 10 ? "Healthy" : "High Risk"}
                                </span>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden relative">
                                <div className="absolute top-0 bottom-0 w-0.5 bg-foreground left-1/2 z-10" title="Limit"></div>
                                <div 
                                    className={cn("h-full rounded-full transition-all duration-1000", 
                                    scannedData.scores.visceralFatLevel > 10 ? "bg-red-500" : "bg-green-500")}
                                    style={{ width: `${(scannedData.scores.visceralFatLevel / 20) * 100}%` }}
                                ></div>
                            </div>
                             <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                <span>1</span>
                                <span>10</span>
                                <span>20+</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* BMR Card */}
                    <Card>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
                                    <Flame className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">BMR</p>
                                    <p className="text-xs text-muted-foreground">Basal Metabolic Rate</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-bold">{scannedData.scores.bmr}</span>
                                <span className="text-xs text-muted-foreground ml-1">kcal</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full gap-2 bg-gradient-primary shadow-glow" onClick={() => console.log('Saving to profile...')}>
                         <CheckCircle2 className="w-4 h-4" /> Save to Profile
                    </Button>
                </div>
            </div>
        </div>
      )}
    </MainLayout>
  );
};


// --- Helper Components for Styling ---

const LoadingStep = ({ label, done }: { label: string, done: boolean }) => (
    <div className="flex items-center gap-3">
        <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
            done ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
        )}>
            {done && <CheckCircle2 className="w-3 h-3" />}
        </div>
        <span className={cn("text-sm", done ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
    </div>
);

const InBodyRow = ({ label, subLabel, value, unit, normalStart, normalEnd, isTarget, colorClass = "bg-primary" }: any) => {
    // Simplified visual calculation logic for demo
    // We want to map the value to a position on a bar that has 3 sections (Under, Normal, Over)
    let percent = 50; 
    let stateColor = "bg-green-500";
    
    if(value < normalStart) {
        percent = 25; // Visual position for Under
        stateColor = "bg-blue-400";
    } else if (value > normalEnd) {
        percent = 85; // Visual position for Over
        stateColor = "bg-orange-500";
    } else {
        // Calculate relative position within normal range (33% to 66%)
        const range = normalEnd - normalStart;
        const rel = (value - normalStart) / range;
        percent = 33 + (rel * 33);
        stateColor = "bg-green-500";
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <div>
                    <span className="font-bold text-foreground mr-2">{label}</span>
                    {subLabel && <span className="text-xs text-muted-foreground">({subLabel})</span>}
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-foreground">{value}</span>
                    <span className="text-xs text-muted-foreground">{unit}</span>
                </div>
            </div>
            
            {/* Custom Bar Chart */}
            <div className="relative h-6 w-full">
                {/* Background Tracks */}
                <div className="absolute inset-y-0 w-full rounded-md bg-muted/50 overflow-hidden flex text-[10px] text-muted-foreground/50 font-medium uppercase text-center leading-[24px]">
                    <div className="w-1/3 border-r border-background/50">Under</div>
                    <div className="w-1/3 border-r border-background/50">Normal</div>
                    <div className="w-1/3">Over</div>
                </div>

                {/* Normal Range Highlight (The grey bar in InBody) */}
                <div className="absolute top-1 bottom-1 left-1/3 width-1/3 bg-foreground/5 rounded-sm"></div>

                {/* The Marker */}
                <div 
                    className={cn(
                        "absolute top-0 bottom-0 w-1.5 rounded-full shadow-sm transition-all duration-1000",
                        stateColor
                    )}
                    style={{ left: `${percent}%` }}
                >
                     {isTarget && <div className="absolute -top-1 left-1/2 -translate-x-1/2 -mt-2 text-xs text-primary animate-bounce">▼</div>}
                </div>
            </div>
             
             {/* Labels below */}
             <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                <span className="w-1/3 text-right pr-2">{normalStart}</span>
                <span className="w-1/3 text-right pr-2">{normalEnd}</span>
                <span className="w-1/3"></span>
             </div>
        </div>
    );
}

const SegmentCard = ({ label, kg, pct, isCenter }: any) => {
    return (
        <div className={cn(
            "p-3 rounded-xl border bg-card hover:border-primary/50 transition-colors",
            isCenter && "border-primary/20 bg-primary/5 text-center"
        )}>
            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">{label}</p>
            <div className={cn("flex items-end gap-2", isCenter && "justify-center")}>
                <span className="text-xl font-bold text-foreground">{kg}<span className="text-xs font-normal text-muted-foreground ml-0.5">kg</span></span>
                <span className={cn(
                    "text-xs font-bold px-1.5 py-0.5 rounded-md",
                    pct > 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                )}>
                    {pct}%
                </span>
            </div>
            {/* Mini Progress */}
            <div className="h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }}></div>
            </div>
        </div>
    )
}

export default InBodyPage;