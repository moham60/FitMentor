import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowUpRight, User as UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Components
import MainLayout from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Interfaces
import { Client } from "@/interfaces/clients";

export default function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const sb = supabase as any;

    useEffect(() => {
        if (!user?.id) return;

        const fetchClients = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1) جلب جميع الخطط التي أنشأها هذا الكابتن فقط
                const { data: myPlans, error: plansErr } = await sb
                    .from('coach_plans')
                    .select('id, name, type, description')
                    .eq('coach_id', user.id);

                if (plansErr) throw plansErr;

                if (!myPlans || myPlans.length === 0) {
                    setClients([]);
                    return;
                }

                const myPlanIds = myPlans.map((p: any) => p.id);
                
                // ✅ التعديل 1: إخبار TypeScript صراحة بنوع بيانات الـ Map
                const planMap = new Map<string, any>(myPlans.map((p: any) => [p.id, p]));

                // 2) البحث عن المتدربين المشتركين في هذه الخطط
                const { data: subscribedUsers, error: usersErr } = await sb
                    .from('profiles')
                    .select('id, user_id, full_name, avatar_url, coach_plan_id, coach_plan_status, coach_plan_started_at, coach_plan_expires_at')
                    .eq('coach_plan_status', 'active')
                    .in('coach_plan_id', myPlanIds);

                if (usersErr) throw usersErr;

                if (!subscribedUsers || subscribedUsers.length === 0) {
                    setClients([]);
                    return;
                }

                // 3) تنسيق البيانات
                const formattedClients: Client[] = await Promise.all(
                    subscribedUsers.map(async (prof: any) => {
                        // ✅ التعديل 2: إجبار المترجم على معاملة الخطة كـ any
                        const plan = planMap.get(prof.coach_plan_id) as any;
                        const startDate = prof.coach_plan_started_at ? new Date(prof.coach_plan_started_at) : null;
                        const expiryDate = prof.coach_plan_expires_at ? new Date(prof.coach_plan_expires_at) : null;

                        const progress = (startDate && expiryDate)
                            ? (() => {
                                const today = new Date();
                                const totalDays = Math.floor((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                if (totalDays <= 0) return 0;
                                return Math.min(Math.max(Math.round((daysElapsed / totalDays) * 100), 0), 100);
                            })()
                            : 0;

                        let avatarUrl = prof.avatar_url;
                        if (avatarUrl && !avatarUrl.startsWith('http')) {
                            try {
                                const { data } = await supabase.storage
                                    .from('avatars')
                                    .createSignedUrl(avatarUrl, 60 * 60);
                                avatarUrl = data?.signedUrl || null;
                            } catch {
                                avatarUrl = null;
                            }
                        }

                        return {
                            id: prof.id,
                            user_id: prof.user_id,
                            name: prof.full_name || 'Member',
                            avatar_url: avatarUrl,
                            plan_name: plan?.name || 'Coach Plan',
                            plan_type: plan?.type || 'basic',
                            plan_description: plan?.description || '',
                            plan_status: prof.coach_plan_status || 'active',
                            plan_started_at: prof.coach_plan_started_at || '',
                            plan_expires_at: prof.coach_plan_expires_at || '',
                            progress
                        };
                    })
                );

                setClients(formattedClients);
            } catch (err: any) {
                console.error('Error fetching clients:', err);
                setError(err.message || 'An error occurred while fetching data');
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, [user?.id]);

    if (loading) {
        return (
            <MainLayout title="Clients Management">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout title="Clients Management">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <Button onClick={() => window.location.reload()}>Retry</Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (clients.length === 0) {
        return (
            <MainLayout title="Clients Management">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <UserIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">No clients yet</h3>
                        <p className="text-muted-foreground">Clients will appear here when they subscribe to your plans</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Clients Management">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
                {clients.map((client) => (
                    <Card 
                        key={client.id} 
                        className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900 dark:to-zinc-950"
                    >
                        <CardHeader className="p-5 pb-2">
                            <div className="flex justify-between items-start">
                                <div className="relative">
                                    <Avatar className="h-16 w-16 border-2 border-primary/20 p-0.5">
                                        {client.avatar_url ? (
                                            <AvatarImage 
                                                src={client.avatar_url} 
                                                alt={client.name}
                                                className="rounded-full object-cover" 
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`;
                                                }}
                                            />
                                        ) : (
                                            <AvatarImage 
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`}
                                                alt={client.name}
                                                className="rounded-full object-cover" 
                                            />
                                        )}
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {client.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {client.plan_status === 'active' && (
                                        <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                                    )}
                                </div>
                                <Badge 
                                    variant={client.plan_type === "premium" ? "default" : client.plan_type === "gold" ? "secondary" : "outline"} 
                                    className="font-medium capitalize"
                                >
                                    {client.plan_type}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="px-5 py-2">
                            <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                                {client.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-4 leading-relaxed h-10">
                                {client.plan_description || client.plan_name}
                            </p>

                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="text-primary">{client.progress}%</span>
                                </div>
                                <Progress value={client.progress} className="h-2" />
                            </div>
                        </CardContent>

                        <CardFooter className="p-5 pt-4 flex gap-2">
                            <Button 
                                onClick={() => navigate(`/chat/${client.user_id}`)} 
                                variant="outline" 
                                className="flex-1 gap-2 hover:bg-primary hover:text-white transition-all"
                            >
                                <MessageSquare size={16} />
                                chat
                            </Button>
                            <Button 
                                onClick={() => navigate(`/profile/${client.user_id}`)} 
                                className="flex-1 gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                profile
                                <ArrowUpRight size={16} />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </MainLayout>
    );
}