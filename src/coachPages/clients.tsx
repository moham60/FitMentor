import MainLayout from "@/components/layout/MainLayout";
import { Client } from "@/interfaces/clients";
import { useState } from "react";



export default function Clients() {
    const [clients, setClients] = useState<Client[]|null>(null);

    return (
        <MainLayout title="Clients">
    <div className="clientCarts grid gap-4  md:grid-cols-3">
                
           </div>
        </MainLayout>
  );
}