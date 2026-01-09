import MainLayout from "@/components/layout/MainLayout";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Client } from "@/interfaces/clients";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { MdAccountBalanceWallet } from "react-icons/md";
import { useNavigate } from "react-router-dom";



export default function Clients() {
    const [clients, setClients] = useState<Client[] | null>(null);
    const navigate = useNavigate();
    useEffect(() => {
        /*supabase get clients info*/
        setClients([
            {id:"1", name: "mohamed abdelwahab", plan: "permuim", desc:"plan description.......", progress: 90 },
            {id:"2", name: "mohamed abdelwahab", plan: "permuim", desc:"plan description.......", progress: 90 },
            {id:"3", name: "mohamed abdelwahab", plan: "permuim", desc:"plan description.......", progress: 90 }
            ,{id:"4", name: "mohamed abdelwahab", plan: "permuim", desc:"plan description.......", progress: 90 },
            {id:"5", name: "mohamed abdelwahab", plan: "permuim", desc:"plan description.......", progress: 90 },
            {id:"6", name: "mohamed abdelwahab", plan: "permuim", desc:"plan description.......", progress: 90 },
            {id:"7", name: "mohamed abdelwahab", plan: "permuim", desc:"plan description.......", progress: 90 },
            {id:"8",name:"mohamed abdelwahab",plan:"permuim", desc:"plan description.......",progress:90}
        ])
        },[])
    return (
        <MainLayout title="Clients">
    <div className="clientCarts grid gap-4  md:grid-cols-3">
            {clients&&clients.map(client => (
                    <Card key={client.id}>
            <CardHeader className="flex py-2 px-6  flex-row items-center justify-between">
                        <CardTitle className="text-sm text-muted-foreground">
                          {client.name}
                        </CardTitle>
                        <Avatar>
                        <AvatarImage src=".../../../../src/assets/hero-workout.jpg"/>
                        </Avatar>
                    </CardHeader>
                    <CardContent >
                        <p>Package : { client.plan}</p>
                        <p>{client.desc}</p>
                        <div className="progress">
                            <h4>Progress Value</h4>
                            <Progress value={client.progress}/>
                        </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                     <Button onClick={()=>navigate(`chat/${client.id}`)} variant={"outline"} >
                            Chat
                        </Button>
                         <Button onClick={()=>navigate(`summary/${client.id}`)} >
                            More Details
                        </Button>
                    </CardFooter>
                </Card>
             ))}
           </div>
        </MainLayout>
  );
}