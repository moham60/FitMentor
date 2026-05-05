export interface Plan{
    id?: string,
    name: string,
    desc: string,
    image?: string,
}

export interface CoachPlan {
    id: string;
    coach_id: string;
    name: string;
    type: 'basic' | 'gold' | 'premium';
    description?: string | null;
    image_url?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PlanMuscle {
    id: string;
    plan_id: string;
    muscle_id: string;
    muscle_name: string;
    exercise_count: number;
    sets: number;
    reps: string;
    equipment?: string | null;
    exercise_description?: string | null;
    order_index: number;
    created_at: string;
}