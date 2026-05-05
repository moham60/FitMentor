import type { LucideIcon } from 'lucide-react';
import { Crown, Star, Zap } from 'lucide-react';

export type SubscriptionPlanId = 'free' | 'basic' | 'gold' | 'premium';

export type SubscriptionPlan = {
  id: Exclude<SubscriptionPlanId, 'free'>;
  name: string;
  icon: LucideIcon;
  color: 'emerald' | 'amber' | 'rose';
  priceEgpPerMonth: number;
  rangeLabel: string;
  description: string;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    icon: Zap,
    color: 'emerald',
    priceEgpPerMonth: 350,
    rangeLabel: '300-400 EGP',
    description: 'Perfect for beginners starting their journey.',
  },
  {
    id: 'gold',
    name: 'Gold Plan',
    icon: Star,
    color: 'amber',
    priceEgpPerMonth: 650,
    rangeLabel: '600-700 EGP',
    description: 'Balanced approach for consistent results.',
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    icon: Crown,
    color: 'rose',
    priceEgpPerMonth: 1000,
    rangeLabel: '1000 EGP',
    description: 'The ultimate experience for serious athletes.',
  },
];

export function planLabel(planId: SubscriptionPlanId | string | null | undefined) {
  switch (planId) {
    case 'basic':
      return 'Basic Plan';
    case 'gold':
      return 'Gold Plan';
    case 'premium':
      return 'Premium Plan';
    case 'free':
    default:
      return 'Free Plan';
  }
}

export type PlanStatus = 'pending' | 'suspended' | 'active';

export function normalizePlanStatus(status: string | null | undefined): PlanStatus | null {
  if (status === 'pending' || status === 'suspended' || status === 'active') return status;
  return null;
}

export function planStatusLabel(status: PlanStatus | string | null | undefined) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'suspended':
      return 'Suspended';
    case 'active':
      return 'Active';
    default:
      return 'Unknown';
  }
}
