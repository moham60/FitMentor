import React from "react";
import { FemaleMuscleMap } from "@/components/workout/FemaleMuscleMap";

export type ViewMode = "front" | "back";

export type AnatomyMapProps = {
  selected?: string;
  onMuscleClick?: (id: string) => void;
  dimmed?: boolean;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  view?: ViewMode;
};

/**
 * Female anatomy (FRONT/BACK)
 * Wrapper around your existing FemaleMuscleMap which already accepts {view}
 * as used in ExercisesPage.tsx.
 */
export function FemaleAnatomy({
  selected,
  onMuscleClick,
  dimmed,
  svgRef,
  view = "front",
}: AnatomyMapProps) {
  return (
    <FemaleMuscleMap
      selected={selected}
      onMuscleClick={onMuscleClick}
      dimmed={dimmed}
      svgRef={svgRef}
      view={view}
    />
  );
}
