import { MdPostAdd, MdAttachMoney } from "react-icons/md";
import { FaRegListAlt } from "react-icons/fa";
import {
  Home,
  Utensils,
  Dumbbell,
  Sparkles,
  User,
  Settings,
  BarChart3,
  Target,
  BicepsFlexed
} from "lucide-react";
import { NavType } from "@/types/navLinks";

export const userNavItems: NavType[] = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: BicepsFlexed, label: "Exercises", path: "/exercises" }, 
  { icon: Utensils, label: "Nutrition", path: "/nutrition" },
  { icon: Dumbbell, label: "Workouts", path: "/workouts" },
  { icon: BarChart3, label: "InBody", path: "/inbody" },
   { icon: MdPostAdd, label: "Posts", path: "/posts" },  
  { icon: Sparkles, label: "AI Assistant", path: "/ai-assistant" },
  // { icon: Target, label: "Goals", path: "/goals" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const coachNavItems: NavType[] = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: User, label: "Clients", path: "/coach/clients" }, 
  { icon: FaRegListAlt, label: "Plans", path: "/coach/plans" },       
  { icon: MdPostAdd, label: "Posts", path: "/posts" },          
  { icon: MdAttachMoney, label: "Earnings", path: "/coach/earnings" },
  { icon: Sparkles, label: "AI Assistant", path: "/ai-assistant" },   
  // { icon: Target, label: "Goals", path: "/goals" },               
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];
