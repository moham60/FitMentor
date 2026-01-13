import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowUpRight, User } from "lucide-react";

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
    // 1. استخدام مصفوفة فارغة كقيمة ابتدائية لتجنب أخطاء الـ Render
    const [clients, setClients] = useState<Client[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        // محاكاة جلب البيانات من API
        const mockData: Client[] = [
            { id: "1", name: "Mohamed Abdelwahab", plan: "Premium", desc: "Advanced fitness and nutrition track.", progress: 75 },
            { id: "2", name: "Ahmed Ali", plan: "Standard", desc: "Focusing on weight loss and stamina.", progress: 45 },
            { id: "3", name: "Sara Smith", plan: "Premium", desc: "Muscle building and powerlifting.", progress: 90 },
        ];
        setClients(mockData);
    }, []);

    return (
        <MainLayout title="Client Management">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4">
                {clients.map((client) => (
                    <Card 
                        key={client.id} 
                        className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900 dark:to-zinc-950"
                    >
                        {/* Header: Profile & Plan Badge */}
                        <CardHeader className="p-5 pb-2">
                            <div className="flex justify-between items-start">
                                <div className="relative">
                                    <Avatar className="h-16 w-16 border-2 border-primary/20 p-0.5">
                                        {/* وضع صورة افتراضية أو استخدام id لجعلها فريدة */}
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} className="rounded-full object-cover" />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            <User size={24} />
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* مؤشر الحالة أونلاين */}
                                    <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                                </div>
                                <Badge variant={client.plan === "Premium" ? "default" : "secondary"} className="font-medium">
                                    {client.plan}
                                </Badge>
                            </div>
                        </CardHeader>

                        {/* Content: Name & Progress */}
                        <CardContent className="px-5 py-2">
                            <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                                {client.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-4 leading-relaxed h-10">
                                {client.desc}
                            </p>

                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="text-primary">{client.progress}%</span>
                                </div>
                                <Progress value={client.progress} className="h-2" />
                            </div>
                        </CardContent>

                        {/* Footer: Actions */}
                        <CardFooter className="p-5 pt-4 flex gap-2">
                            <Button 
                                onClick={() => navigate(`/chat/${client.id}`)} 
                                variant="outline" 
                                className="flex-1 gap-2 hover:bg-primary hover:text-white transition-all"
                            >
                                <MessageSquare size={16} />
                                Chat
                            </Button>
                            <Button 
                                onClick={() => navigate(`/summary/${client.id}`)} 
                                className="flex-1 gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                Details
                                <ArrowUpRight size={16} />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </MainLayout>
    );
}