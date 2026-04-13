import { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from '@/lib/subscriptionPlans';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CreditCard,
  Smartphone,
  ShieldCheck,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Star,
  Crown,
  Zap,
  Globe,
  Wallet,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// تنسيقات الخطط (ألوان وأيقونات) للعرض البصري
const PLAN_STYLES: Record<string, { icon: any; color: string; border: string; bg: string }> = {
  basic: { icon: Zap, color: 'text-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
  gold: { icon: Star, color: 'text-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
  premium: { icon: Crown, color: 'text-rose-500', border: 'border-rose-500/20', bg: 'bg-rose-500/10' },
  // Fallback styling
  default: { icon: Zap, color: 'text-primary', border: 'border-primary/20', bg: 'bg-primary/10' }
};

type PaymentMethodType = 'stripe' | 'paypal' | 'instapay' | 'vodafone';

const CheckoutPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('stripe');
  const [loading, setLoading] = useState(false);

  // استخراج الخطة من الرابط
  const planId = (searchParams.get('plan') as SubscriptionPlanId | null) ?? null;
  const returnTo = searchParams.get('returnTo');

  // البحث عن تفاصيل الخطة
  const selectedPlan = useMemo(() => {
    if (!planId || planId === 'free') return null;
    return SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? null;
  }, [planId]);

  // الحصول على التنسيق المناسب للخطة
  const style = PLAN_STYLES[planId as string] || PLAN_STYLES.default;
  const PlanIcon = style.icon;

  // توجيه المستخدم إذا لم يختر خطة
  useEffect(() => {
    if (!selectedPlan && !loading) {
      // يمكن تفعيل هذا السطر لإجبار المستخدم على العودة إذا لم يكن هناك خطة
      // navigate('/subscription'); 
    }
  }, [selectedPlan, navigate, loading]);

  if (!selectedPlan) {
    return (
      <MainLayout title="Checkout" subtitle="No plan selected">
        <div className="text-center py-10">
          <p className="mb-4">Please select a subscription plan first.</p>
          <Button onClick={() => navigate('/subscription')}>View Plans</Button>
        </div>
      </MainLayout>
    );
  }

  // حساب الضرائب والمجموع
  const price = selectedPlan.priceEgpPerMonth;
  const taxRate = 0.14;
  const taxAmount = Math.round(price * taxRate);
  const totalAmount = price + taxAmount;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('You must be signed in.');
      navigate('/signin');
      return;
    }

    setLoading(true);

    try {
      // 1. محاكاة وقت المعالجة (Stripe/Paymob Integration would be here)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const startedAt = new Date();
      const expiresAt = new Date(startedAt);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const updatePayload: Record<string, any> = {
        plan_id: selectedPlan.id,
        // After checkout we keep it pending until an admin approves it.
        plan_status: 'pending',
        plan_started_at: startedAt.toISOString(),
        plan_expires_at: expiresAt.toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Order received! Pending admin approval.');
      
      // توجيه للبروفايل أو لوحة التحكم
      if (returnTo) {
        navigate(returnTo);
      } else {
        navigate('/profile');
      }

    } catch (err: any) {
      console.error('Payment Error:', err);
      toast.error(err?.message ?? 'Failed to process payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Secure Checkout" subtitle="Complete your subscription securely">
      <div className="max-w-6xl mx-auto pb-10 px-4">
        
        <Button 
          variant="ghost" 
          onClick={() => navigate(returnTo || '/subscription')} 
          className="mb-6 pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Right Section: Payment Details (8 Columns) */}
          <div className="lg:col-span-8 space-y-6 animate-fade-in">
            
            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Select Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stripe */}
                  <div 
                    onClick={() => setPaymentMethod('stripe')}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:bg-muted/50",
                      paymentMethod === 'stripe' ? "border-primary bg-primary/5 shadow-sm" : "border-muted"
                    )}
                  >
                    <CreditCard className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Credit Card</p>
                      <p className="text-[10px] text-muted-foreground">Via Stripe</p>
                    </div>
                    {paymentMethod === 'stripe' && <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />}
                  </div>

                  {/* PayPal */}
                  <div 
                    onClick={() => setPaymentMethod('paypal')}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:bg-muted/50",
                      paymentMethod === 'paypal' ? "border-[#003087] bg-[#003087]/5 shadow-sm" : "border-muted"
                    )}
                  >
                    <Globe className="w-6 h-6 text-[#003087]" />
                    <div>
                      <p className="font-semibold text-sm">PayPal</p>
                      <p className="text-[10px] text-muted-foreground">Fast & Secure</p>
                    </div>
                    {paymentMethod === 'paypal' && <CheckCircle2 className="w-5 h-5 text-[#003087] ml-auto" />}
                  </div>

                  {/* InstaPay */}
                  <div 
                    onClick={() => setPaymentMethod('instapay')}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:bg-muted/50",
                      paymentMethod === 'instapay' ? "border-purple bg-purple/5 shadow-sm" : "border-muted"
                    )}
                  >
                    <Smartphone className="w-6 h-6 text-purple" />
                    <div>
                      <p className="font-semibold text-sm">InstaPay</p>
                      <p className="text-[10px] text-muted-foreground">Instant Transfer</p>
                    </div>
                    {paymentMethod === 'instapay' && <CheckCircle2 className="w-5 h-5 text-purple ml-auto" />}
                  </div>

                  {/* Vodafone Cash */}
                  <div 
                    onClick={() => setPaymentMethod('vodafone')}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:bg-muted/50",
                      paymentMethod === 'vodafone' ? "border-red-500 bg-red-500/5 shadow-sm" : "border-muted"
                    )}
                  >
                    <Smartphone className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-semibold text-sm">Vodafone Cash</p>
                      <p className="text-[10px] text-muted-foreground">Mobile Wallet</p>
                    </div>
                    {paymentMethod === 'vodafone' && <CheckCircle2 className="w-5 h-5 text-red-500 ml-auto" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Payment Form */}
            <Card className="overflow-hidden relative min-h-[300px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
              
              <CardHeader>
                <CardTitle>
                  {paymentMethod === 'stripe' && 'Enter Card Details'}
                  {paymentMethod === 'paypal' && 'Login to PayPal'}
                  {paymentMethod === 'instapay' && 'InstaPay Instructions'}
                  {paymentMethod === 'vodafone' && 'Wallet Instructions'}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <form id="checkout-form" onSubmit={handlePayment} className="space-y-4">
                  
                  {/* STRIPE FORM */}
                  {paymentMethod === 'stripe' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                      <div className="grid gap-2">
                        <Label>Cardholder Name</Label>
                        <Input placeholder="John Doe" required className="bg-muted/50" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Card Number</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="0000 0000 0000 0000" className="pl-9 bg-muted/50" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Expiry</Label>
                          <Input placeholder="MM/YY" className="bg-muted/50" required />
                        </div>
                        <div className="grid gap-2">
                          <Label>CVC</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="123" className="pl-9 bg-muted/50" required />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <ShieldCheck className="w-3 h-3 text-green-500" />
                        Powered by Stripe. Your data is encrypted.
                      </div>
                    </div>
                  )}

                  {/* PAYPAL MESSAGE */}
                  {paymentMethod === 'paypal' && (
                    <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95">
                      <div className="w-16 h-16 bg-[#003087]/10 rounded-full flex items-center justify-center mb-4">
                        <Globe className="w-8 h-8 text-[#003087]" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Pay with PayPal</h3>
                      <p className="text-muted-foreground max-w-xs mb-6">
                        You will be redirected to PayPal's secure website to complete your payment.
                      </p>
                      {/* Note: PayPal integration logic would be handled by SDK */}
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        Simulating redirection... click "Confirm" on the right.
                      </div>
                    </div>
                  )}

                  {/* INSTAPAY FORM */}
                  {paymentMethod === 'instapay' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-2">
                      <div className="p-4 bg-purple/10 rounded-xl border border-purple/20">
                        <p className="text-sm font-medium text-purple mb-1">Send transfer to IPA:</p>
                        <div className="flex items-center justify-between bg-background/50 p-2 rounded border border-purple/20">
                          <code className="text-lg font-bold text-foreground">Fitmentor@instapay</code>
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText('gym@instapay')}>Copy</Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid gap-2">
                          <Label>Your InstaPay Address (IPA)</Label>
                          <Input placeholder="username@instapay" required className="bg-muted/50" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Transaction Reference (Optional)</Label>
                          <Input placeholder="Enter ref number" className="bg-muted/50" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VODAFONE CASH FORM */}
                  {paymentMethod === 'vodafone' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-2">
                      <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <p className="text-sm font-medium text-red-600 mb-1">Send total amount to:</p>
                        <div className="flex items-center justify-between bg-background/50 p-2 rounded border border-red-500/20">
                          <code className="text-lg font-bold text-foreground">01018522398</code>
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText('01018522398')}>Copy</Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid gap-2">
                          <Label>Your Wallet Number</Label>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="010 xxxx xxxx" required className="pl-9 bg-muted/50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </form>
              </CardContent>
            </Card>
          </div>

          {/* Left Section: Order Summary (4 Columns) */}
          <div className="lg:col-span-4 space-y-6 animate-fade-in">
            <Card className={cn("border-2 shadow-lg sticky top-6", style.border)}>
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                
                {/* معلومات الخطة المختارة */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                    style.bg,
                    style.color
                  )}>
                    <PlanIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedPlan.name}</h3>
                    <p className="text-sm text-muted-foreground">Monthly Subscription</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{price} EGP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax (14%)</span>
                    <span>{taxAmount} EGP</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{totalAmount} EGP</span>
                  </div>
                </div>

                <div className="mt-6 bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground space-y-2">
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary" />
                        <span>Instant Access upon payment</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-primary" />
                        <span>Secure SSL Connection</span>
                    </div>
                </div>

              </CardContent>
              <CardFooter className="pb-6">
                <Button 
                  type="submit" 
                  form="checkout-form"
                  className={cn(
                    "w-full h-12 text-base font-semibold shadow-lg hover:scale-[1.02] transition-transform",
                    loading && "opacity-80 cursor-not-allowed",
                    // تغيير لون الزر حسب نوع الخطة
                    planId === 'basic' && "bg-emerald-600 hover:bg-emerald-700",
                    planId === 'gold' && "bg-amber-600 hover:bg-amber-700",
                    planId === 'premium' && "bg-rose-600 hover:bg-rose-700",
                    // Fallback
                    !['basic', 'gold', 'premium'].includes(planId!) && "bg-primary"
                  )}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    paymentMethod === 'instapay' || paymentMethod === 'vodafone' 
                      ? 'Confirm Transfer' 
                      : `Pay ${totalAmount} EGP`
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            <div className="text-center text-xs text-muted-foreground">
               By confirming, you update your plan to <strong>{selectedPlan.name}</strong>.
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CheckoutPage;