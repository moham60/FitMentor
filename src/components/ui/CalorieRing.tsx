import { useEffect, useState } from 'react';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

const CalorieRing = ({ consumed, target, size = 200 }: CalorieRingProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progress = Math.min((consumed / target) * 100, 100);
  const remaining = Math.max(target - consumed, 0);
  
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const getProgressColor = () => {
    if (progress > 100) return 'hsl(0 72% 51%)';
    if (progress > 85) return 'hsl(38 92% 50%)';
    return 'hsl(168 100% 45%)';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(220 14% 18%)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${getProgressColor()})`,
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="flex flex-col items-center justify-center z-10">
        <span className="text-4xl font-display font-bold text-foreground">
          {remaining.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground mt-1">سعرة متبقية</span>
      </div>
    </div>
  );
};

export default CalorieRing;
