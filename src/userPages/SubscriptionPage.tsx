import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // تأكد من وجود هذا المكون أو استخدم div بتنسيق مشابه
import {
  Check,
  X,
  Zap,
  Crown,
  Star,
  Dumbbell,
  Utensils,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  // حالة لاختيار فترة الدفع إذا رغبت مستقبلاً (شهري/سنوي)
  const [billingCycle, setBillingCycle] = useState<'monthly'>('monthly');

  const plans = SUBSCRIPTION_PLANS.map((p) => {
    const isPopular = p.id === 'gold';
    const isPremium = p.id === 'premium';

    return {
      ...p,
      price: String(p.priceEgpPerMonth),
      range: p.rangeLabel,
      popular: isPopular,
      glow: isPremium,
      cta: p.id === 'basic' ? 'Start Basic' : p.id === 'gold' ? 'Go Gold' : 'Get Premium',
      features:
        p.id === 'basic'
          ? [
              { text: 'General training plan', included: true },
              { text: 'Limited schedule flexibility', included: true, limited: true },
              { text: 'Exercise Images', included: true },
              { text: 'Basic Performance Tracking', included: false },
              { text: 'Nutrition Plan', included: false },
              { text: 'Coach Communication', included: false },
              { text: 'Adjustments', included: false },
            ]
          : p.id === 'gold'
            ? [
                { text: 'Partially customized plan', included: true },
                { text: 'Moderate schedule flexibility', included: true },
                { text: 'Images + Videos Guidance', included: true },
                { text: 'Basic Performance Tracking', included: true },
                { text: 'General Meal Plan', included: true },
                { text: 'Food Alternatives (Limited)', included: true, limited: true },
                { text: 'Direct Chat', included: false },
              ]
            : [
                { text: 'Fully customized plan', included: true },
                { text: 'Full flexibility', included: true },
                { text: 'Images + Videos + Coach Notes', included: true },
                { text: 'Full & Continuous Tracking', included: true },
                { text: 'Personalized Nutrition Plan', included: true },
                { text: 'Full Food Alternatives', included: true },
                { text: 'Direct Chat (Priority)', included: true },
                { text: 'Weekly Check-ins & Reports', included: true },
                { text: 'Adjustment Guarantee (7 Days)', included: true },
              ],
    };
  });

  return (
    <MainLayout
      title="Choose Your Plan"
      subtitle="Invest in your body with the perfect coaching plan"
    >
      {/* Header Section */}
      <div className="text-center mb-10 animate-fade-in">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-purple inline-block mb-4">
          Unlock Your Full Potential
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Whether you're just starting or pushing for professional results, we have a plan tailored to your goals.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 px-2 md:px-0">
        {plans.map((plan, index) => (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col transition-all duration-500 hover:-translate-y-2 border-muted overflow-hidden group",
              plan.popular ? "border-amber-500/50 shadow-lg shadow-amber-500/10 scale-105 z-20 md:scale-110" : "hover:border-primary/50 hover:shadow-glow",
              plan.glow ? "border-rose-500/50 shadow-lg shadow-rose-500/20" : ""
            )}
            style={{ animationDelay: `${index * 0.15}s` }} // Staggered animation
          >
            {/* الخلفية الملونة الخفيفة */}
            <div className={cn(
              "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none",
              plan.color === 'emerald' && "bg-emerald-500",
              plan.color === 'amber' && "bg-amber-500",
              plan.color === 'rose' && "bg-rose-500"
            )} />
            {/* Premium Badge */}
            {plan.id === 'premium' && (
              <div className="absolute top-4 right-4 animate-pulse">
                <ShieldCheck className="w-6 h-6 text-rose-500" />
              </div>
            )}

            <CardHeader className="text-center pb-2 pt-8">
              <div className={cn(
                "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg",
                plan.color === 'emerald' && "bg-emerald-500/10 text-emerald-500",
                plan.color === 'amber' && "bg-amber-500/10 text-amber-500",
                plan.color === 'rose' && "bg-rose-500/10 text-rose-500"
              )}>
                <plan.icon className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col items-center">
              <div className="my-6 text-center">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="text-sm font-medium text-muted-foreground ml-1">EGP / month</span>
                <p className="text-xs text-muted-foreground mt-1">Range: {plan.range}</p>
              </div>

              {/* Separator */}
              <div className="w-full h-px bg-muted mb-6" />

              <ul className="space-y-3 w-full text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 min-w-[1.25rem]",
                      feature.included 
                        ? (feature.limited ? "text-orange-400" : (plan.color === 'rose' ? "text-rose-500" : "text-primary")) 
                        : "text-muted-foreground/30"
                    )}>
                      {feature.included ? (feature.limited ? <TrendingUp className="w-5 h-5" /> : <Check className="w-5 h-5" />) : <X className="w-5 h-5" />}
                    </div>
                    <span className={cn(
                      feature.included ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/30"
                    )}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4 pb-8">
              <Button 
                onClick={() =>
                  navigate({
                    pathname: '/checkout',
                    search: createSearchParams({ plan: plan.id }).toString(),
                  })
                }
                className={cn(
                  "w-full h-12 text-base font-semibold shadow-md transition-all hover:scale-[1.02]",
                  plan.color === 'emerald' && "bg-emerald-600 hover:bg-emerald-700 text-white",
                  plan.color === 'amber' && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white",
                  plan.color === 'rose' && "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-rose-500/25"
                )}
                variant={plan.id === 'basic' ? 'outline' : 'default'}
              >
                {plan.cta} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Additional Trust Indicators */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in text-center">
        <div className="p-4 rounded-xl bg-muted/30">
          <Dumbbell className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Scientific Approach</h3>
          <p className="text-sm text-muted-foreground">Plans based on data & physiology.</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/30">
          <Utensils className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Flexible Nutrition</h3>
          <p className="text-sm text-muted-foreground">Eat what you love, hit your goals.</p>
        </div>
        <div className="p-4 rounded-xl bg-muted/30">
          <MessageCircle className="w-8 h-8 text-purple mx-auto mb-3" />
          <h3 className="font-semibold mb-1">24/7 Support</h3>
          <p className="text-sm text-muted-foreground">Never feel lost in your journey.</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;