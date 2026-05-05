export interface Client {
    id: string;
    user_id: string;
    name: string;
    avatar_url?: string;
    plan_name: string;
    plan_type: 'basic' | 'gold' | 'premium';
    plan_description?: string;
    plan_status: string;
    plan_started_at: string;
    plan_expires_at: string;
    progress: number;
    email?: string;
}
