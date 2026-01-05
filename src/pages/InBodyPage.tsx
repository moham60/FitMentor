import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity,
  Droplet,
  Flame,
  Scale,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const InBodyPage = () => {
  const latestMeasurement = {
    date: '2024-01-15',
    weight: 85.2,
    muscleMass: 38.5,
    bodyFat: 18.2,
    waterPercentage: 55.8,
    boneMass: 3.2,
    bmi: 24.5,
    bmr: 1850,
  };

  const changes = {
    weight: -1.3,
    muscleMass: 0.8,
    bodyFat: -2.1,
    waterPercentage: 1.5,
  };

  const bodyComposition = [
    {
      label: 'Muscle Mass',
      value: latestMeasurement.muscleMass,
      unit: 'kg',
      change: changes.muscleMass,
      color: 'primary',
      icon: Activity,
      percentage: 45.2,
    },
    {
      label: 'Body Fat',
      value: latestMeasurement.bodyFat,
      unit: '%',
      change: changes.bodyFat,
      color: 'orange',
      icon: Flame,
      percentage: 18.2,
    },
    {
      label: 'Water',
      value: latestMeasurement.waterPercentage,
      unit: '%',
      change: changes.waterPercentage,
      color: 'info',
      icon: Droplet,
      percentage: 55.8,
    },
    {
      label: 'Bone Mass',
      value: latestMeasurement.boneMass,
      unit: 'kg',
      change: 0,
      color: 'purple',
      icon: Scale,
      percentage: 3.8,
    },
  ];

  const history = [
    { date: '2024-01-15', weight: 85.2, bodyFat: 18.2, muscle: 38.5 },
    { date: '2024-01-01', weight: 86.5, bodyFat: 20.3, muscle: 37.7 },
    { date: '2023-12-15', weight: 87.0, bodyFat: 21.0, muscle: 37.2 },
    { date: '2023-12-01', weight: 87.5, bodyFat: 21.5, muscle: 36.8 },
  ];

  return (
    <MainLayout 
      title="InBody Analysis"
      subtitle="Track your body composition over time"
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="text-3xl font-bold text-foreground">{latestMeasurement.weight}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                changes.weight < 0 ? "text-accent" : "text-orange"
              )}>
                {changes.weight < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {Math.abs(changes.weight)}kg
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">BMI</p>
                <p className="text-3xl font-bold text-foreground">{latestMeasurement.bmi}</p>
                <p className="text-xs text-accent">Normal</p>
              </div>
              <Info className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">BMR</p>
                <p className="text-3xl font-bold text-foreground">{latestMeasurement.bmr}</p>
                <p className="text-xs text-muted-foreground">kcal/day</p>
              </div>
              <Flame className="w-5 h-5 text-orange" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Muscle/Fat Ratio</p>
                <p className="text-3xl font-bold text-foreground">2.1</p>
                <p className="text-xs text-accent">Excellent</p>
              </div>
              <Activity className="w-5 h-5 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Body Composition */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Body Composition</CardTitle>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Measurement
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {bodyComposition.map((item, index) => (
                <div key={index} className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        item.color === 'primary' && "bg-primary/10 text-primary",
                        item.color === 'orange' && "bg-orange/10 text-orange",
                        item.color === 'info' && "bg-info/10 text-info",
                        item.color === 'purple' && "bg-purple/10 text-purple"
                      )}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {item.value}<span className="text-sm font-normal">{item.unit}</span>
                        </p>
                      </div>
                    </div>
                    {item.change !== 0 && (
                      <span className={cn(
                        "text-sm font-medium flex items-center gap-1",
                        (item.label === 'Body Fat' ? item.change < 0 : item.change > 0) 
                          ? "text-accent" 
                          : "text-orange"
                      )}>
                        {item.change > 0 ? '+' : ''}{item.change}{item.unit}
                      </span>
                    )}
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        item.color === 'primary' && "bg-gradient-primary",
                        item.color === 'orange' && "bg-orange",
                        item.color === 'info' && "bg-info",
                        item.color === 'purple' && "bg-purple"
                      )}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Body Composition */}
            <div className="mt-8">
              <h3 className="font-semibold text-foreground mb-4">Composition Breakdown</h3>
              <div className="h-8 rounded-full overflow-hidden flex">
                <div className="bg-primary" style={{ width: '45.2%' }} title="Muscle Mass" />
                <div className="bg-orange" style={{ width: '18.2%' }} title="Body Fat" />
                <div className="bg-info" style={{ width: '32.8%' }} title="Water" />
                <div className="bg-purple" style={{ width: '3.8%' }} title="Bone Mass" />
              </div>
              <div className="flex justify-between mt-3 text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  Muscle 45.2%
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange" />
                  Fat 18.2%
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-info" />
                  Water 32.8%
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple" />
                  Bone 3.8%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>History</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.map((entry, index) => (
              <div 
                key={index}
                className={cn(
                  "p-4 rounded-xl border transition-colors",
                  index === 0 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {index === 0 && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">Latest</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground">{entry.weight}</p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange">{entry.bodyFat}%</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">{entry.muscle}</p>
                    <p className="text-xs text-muted-foreground">kg Muscle</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InBodyPage;
