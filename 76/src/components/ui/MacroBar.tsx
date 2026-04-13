interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: 'primary' | 'accent' | 'warning';
  unit?: string;
}

const MacroBar = ({ label, current, target, color, unit = 'g' }: MacroBarProps) => {
  const progress = Math.min((current / target) * 100, 100);
  
  const colorClasses = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    warning: 'bg-warning',
  };

  const glowColors = {
    primary: 'shadow-[0_0_12px_hsl(168_100%_45%/0.5)]',
    accent: 'shadow-[0_0_12px_hsl(14_90%_62%/0.5)]',
    warning: 'shadow-[0_0_12px_hsl(38_92%_50%/0.5)]',
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">
          {current}/{target}{unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClasses[color]} ${glowColors[color]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default MacroBar;
