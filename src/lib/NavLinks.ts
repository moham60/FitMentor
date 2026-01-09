 import { MdPostAdd,  MdAttachMoney } from "react-icons/md";
import {  FaRegListAlt } from "react-icons/fa";
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
} from 'lucide-react';
import { NavType } from "@/types/navLinks";
export const userNavItems: NavType[] = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: BicepsFlexed, label: 'Exercises', path: '/Exercises' },
  { icon: Utensils, label: 'Nutrition', path: '/nutrition' },
  { icon: Dumbbell, label: 'Workouts', path: '/workouts' },
  { icon: BarChart3, label: 'InBody', path: '/inbody' },
  { icon: Sparkles, label: 'AI Assistant', path: '/ai' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];
export const coachNavItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: User, label: 'Clients', path: '/Clients' },
  { icon: FaRegListAlt, label: 'Plans', path: '/Plans' },
  { icon: MdPostAdd, label: 'posts', path: '/Posts' },
  {icon:MdAttachMoney,label:"Earnings",path:"/Earnings"},
  { icon: Sparkles, label: 'AI Assistant', path: '/ai' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];