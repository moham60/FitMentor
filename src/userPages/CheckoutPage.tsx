import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge'; // ✅ الحل 1: استيراد مكون الـ Badge
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CreditCard,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
  Star,
  Crown,
  Zap,
  Wallet,
  Loader2,
  Send,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// تخطي فحص TypeScript للجداول غير المحدثة محلياً
const sb = supabase as any;

// تنسيقات الخطط البصرية (ألوان وأيقونات)
const PLAN_STYLES: Record<string, { icon: any; color: string; border: string; bg: string }> = {
  basic: { icon: Zap, color: 'text-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
  gold: { icon: Star, color: 'text-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
  premium: { icon: Crown, color: 'text-rose-500', border: 'border-rose-500/20', bg: 'bg-rose-500/10' }
};

// ✅ الحل 2: تعريف المزايا محلياً وتمريرها حسب معرف الخطة
const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    'General training plan',
    'Exercise Images guidance',
    'Standard customer support'
  ],
  gold: [
    'Partially customized plan',
    'Images + Videos Guidance',
    'Basic Performance Tracking',
    'General Meal Plan'
  ],
  premium: [
    'Fully customized plan',
    'Images + Videos + Coach Notes',
    'Full & Continuous Tracking',
    'Personalized Nutrition Plan',
    'Priority Direct Chat'
  ]
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // جلب الخطة من الرابط ?plan=gold
  const planId = searchParams.get('plan') || 'basic';
  const selectedPlan = useMemo(() => {
    return SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[0];
  }, [planId]);

  const totalAmount = selectedPlan.priceEgpPerMonth || 450;
  const style = PLAN_STYLES[selectedPlan.id] || PLAN_STYLES.basic;
  const PlanIcon = style.icon;
  const featuresList = PLAN_FEATURES[selectedPlan.id] || PLAN_FEATURES.basic;

  // States
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'instapay' | 'vodafone'>('card');
  const [transferRef, setTransferRef] = useState('');
  const [loading, setLoading] = useState(false);

  // بيانات البطاقة الوهمية (للمظهر الواقعي فقط)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // ==========================================
  // 🚀 معالجة الدفع (فوري للبطاقة / معلق للمحافظ)
  // ==========================================
  const handleConfirmCheckout = async () => {
    if (!user?.id) {
      toast.error("يرجى تسجيل الدخول أولاً لإتمام الطلب");
      return;
    }

    setLoading(true);

    try {
      // 1. الدفع اليدوي عبر المحافظ الإلكترونية أو إنستا باي
      if (paymentMethod === 'instapay' || paymentMethod === 'vodafone') {
        if (!transferRef.trim()) {
          toast.error(
            paymentMethod === 'instapay'
              ? "يرجى إدخال عنوان إنستا باي (IPA) أو اسم المحول"
              : "يرجى إدخال رقم فودافون كاش الذي قمت بالتحويل منه"
          );
          setLoading(false);
          return;
        }

        // تسجيل الطلب في جدول pending_subscriptions للإدارة
        const { error: pendingErr } = await sb.from('pending_subscriptions').insert({
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member',
          user_email: user.email,
          requested_plan_id: selectedPlan.id,
          amount: totalAmount,
          payment_method: paymentMethod,
          transfer_reference: transferRef.trim(),
          status: 'pending'
        });

        if (pendingErr) throw pendingErr;

        // تحديث حالة اشتراك المستخدم إلى 'pending_approval'
        await sb.from('profiles').update({
          plan_status: 'pending_approval'
        }).eq('user_id', user.id);

        toast.success("⏳ تم إرسال طلب الاشتراك للإدارة!", {
          description: "طلبك الآن قيد المراجعة. سيتم تفعيل حسابك تلقائياً فور مطابقة بيانات التحويل."
        });

        navigate('/dashboard');
      } 
      
      // 2. الدفع بالبطاقة الائتمانية (تفعيل فوري محاكي)
      else {
        if (!cardNumber || !cardExpiry || !cardCvc) {
          toast.error("يرجى إدخال بيانات البطاقة كاملة");
          setLoading(false);
          return;
        }

        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        const { error: updateErr } = await sb.from('profiles').update({
          plan_id: selectedPlan.id,
          plan_status: 'active',
          plan_started_at: now.toISOString(),
          plan_expires_at: thirtyDaysLater.toISOString()
        }).eq('user_id', user.id);

        if (updateErr) throw updateErr;

        toast.success("🎉 تم تفعيل اشتراكك بنجاح!", {
          description: `مرحباً بك في عالم FitMentor // باقة ${selectedPlan.name}`
        });

        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Checkout Error:", err);
      toast.error(err.message || "حدث خطأ أثناء معالجة الطلب، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Secure Checkout" subtitle="Upgrade your fitness journey">
      <div className="container max-w-5xl mx-auto py-8 px-4" dir="rtl">
        
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6 text-muted-foreground hover:text-foreground gap-2 font-bold"
        >
          <ArrowLeft className="w-4 h-4 ml-1" /> العودة للباقات
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ================= 1. ملخص الخطة (اليمين) ================= */}
          <div className="lg:col-span-5 space-y-6">
            <Card className={cn("border-2 shadow-xl relative overflow-hidden", style.border)}>
              <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full -z-10 opacity-20", style.bg)} />
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={cn("p-3 rounded-2xl", style.bg, style.color)}>
                    <PlanIcon className="w-8 h-8" />
                  </div>
                  <Badge variant="outline" className={cn("font-mono font-bold text-sm border", style.color, style.border)}>
                    {selectedPlan.id.toUpperCase()} TIER
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black mt-4">{selectedPlan.name}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1 font-mono" dir="ltr">
                  <span className={cn("text-4xl font-black", style.color)}>{totalAmount}</span>
                  <span className="text-muted-foreground font-bold">EGP / month</span>
                </div>

                <Separator />

                <div className="space-y-2.5 text-sm">
                  <p className="font-bold text-muted-foreground">تتضمن هذه الباقة:</p>
                  {featuresList.map((feat: string, i: number) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-slate-300">{feat}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="bg-muted/20 px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> حماية RLS 256-bit</span>
                <span>إلغاء فوري في أي وقت</span>
              </CardFooter>
            </Card>
          </div>

          {/* ================= 2. خيارات الدفع (اليسار) ================= */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-border/60 shadow-xl bg-card/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" /> اختر طريقة الدفع
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                
                {/* أزرار اختيار الطريقة */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('card')}
                    className={cn("h-14 rounded-2xl flex flex-col gap-1 border-border font-bold", 
                      paymentMethod === 'card' && "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    )}
                  >
                    <CreditCard className="w-5 h-5" /> بطاقة بنكية
                  </Button>

                  <Button
                    type="button"
                    variant={paymentMethod === 'instapay' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('instapay')}
                    className={cn("h-14 rounded-2xl flex flex-col gap-1 border-border font-bold", 
                      paymentMethod === 'instapay' && "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-500"
                    )}
                  >
                    <Send className="w-5 h-5" /> InstaPay
                  </Button>

                  <Button
                    type="button"
                    variant={paymentMethod === 'vodafone' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('vodafone')}
                    className={cn("h-14 rounded-2xl flex flex-col gap-1 border-border font-bold", 
                      paymentMethod === 'vodafone' && "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/25 hover:bg-red-500"
                    )}
                  >
                    <Smartphone className="w-5 h-5" /> فودافون كاش
                  </Button>
                </div>

                <Separator />

                {/* ===== الحالة A: الدفع بالبطاقة ===== */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">رقم البطاقة</Label>
                      <div className="relative">
                        <Input 
                          placeholder="4000 1234 5678 9010" 
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          className="pl-10 font-mono text-left bg-background/50 h-12 rounded-xl"
                          dir="ltr"
                          maxLength={19}
                        />
                        <CreditCard className="absolute left-3.5 top-3.5 w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground">تاريخ الانتهاء</Label>
                        <Input 
                          placeholder="MM / YY" 
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          className="font-mono text-center bg-background/50 h-12 rounded-xl"
                          dir="ltr"
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground">رمز الأمان (CVC)</Label>
                        <Input 
                          type="password" 
                          placeholder="•••" 
                          value={cardCvc}
                          onChange={e => setCardCvc(e.target.value)}
                          className="font-mono text-center bg-background/50 h-12 rounded-xl"
                          dir="ltr"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== الحالة B: إنستا باي ===== */}
                {paymentMethod === 'instapay' && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/90 text-sm leading-relaxed">
                      قم بتحويل مبلغ <span className="font-bold text-white font-mono">({totalAmount} EGP)</span> عبر تطبيق إنستا باي إلى الحساب التالي:
                      <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/30 font-mono font-black text-emerald-400 text-center tracking-wider select-all" dir="ltr">
                        fitmentor@instapay
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-300">عنوان إنستا باي الخاص بك (أو اسم المحول)</Label>
                      <Input 
                        placeholder="مثال: fares@instapay أو Fares Mohamed" 
                        value={transferRef}
                        onChange={e => setTransferRef(e.target.value)}
                        className="bg-background/50 h-12 rounded-xl border-emerald-500/30 focus-visible:ring-emerald-500 text-left font-mono placeholder:text-right placeholder:font-sans"
                        dir="ltr"
                      />
                      <span className="text-[11px] text-muted-foreground block mt-1">سيتأكد فريق الحسابات من مطابقة هذا الاسم مع إشعار التحويل البنكي.</span>
                    </div>
                  </div>
                )}

                {/* ===== الحالة C: فودافون كاش ===== */}
                {paymentMethod === 'vodafone' && (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300/90 text-sm leading-relaxed">
                      قم بتحويل مبلغ <span className="font-bold text-white font-mono">({totalAmount} EGP)</span> عبر فودافون كاش إلى الرقم التالي:
                      <div className="mt-2.5 p-3 rounded-xl bg-red-950/80 border border-red-500/30 font-mono font-black text-red-400 text-center tracking-widest text-lg select-all" dir="ltr">
                        010 1234 5678
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-300">رقم المحفظة الذي قمت بالتحويل منه</Label>
                      <Input 
                        type="tel"
                        placeholder="010 •••• ••••" 
                        value={transferRef}
                        onChange={e => setTransferRef(e.target.value)}
                        className="bg-background/50 h-12 rounded-xl border-red-500/30 focus-visible:ring-red-500 text-left font-mono tracking-widest placeholder:text-right placeholder:tracking-normal placeholder:font-sans"
                        dir="ltr"
                        maxLength={11}
                      />
                      <span className="text-[11px] text-muted-foreground block mt-1">تأكد من كتابة الرقم بشكل صحيح لضمان سرعة تفعيل الباقة.</span>
                    </div>
                  </div>
                )}

              </CardContent>

              <CardFooter className="pt-2">
                <Button
                  onClick={handleConfirmCheckout}
                  disabled={loading}
                  className={cn(
                    "w-full h-14 text-lg font-black rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.01]",
                    loading && "opacity-80 cursor-not-allowed",
                    paymentMethod === 'card' && "bg-primary text-primary-foreground hover:bg-primary/90",
                    paymentMethod === 'instapay' && "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25",
                    paymentMethod === 'vodafone' && "bg-red-600 hover:bg-red-500 text-white shadow-red-600/25"
                  )}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> جاري معالجة الطلب...
                    </span>
                  ) : (
                    paymentMethod === 'card' 
                      ? `ادفع الآن (${totalAmount} EGP)` 
                      : 'تأكيد إرسال التحويل 🚀'
                  )}
                </Button>
              </CardFooter>
            </Card>

            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> مشفر ومؤمن بتقنية SSL الحديثة
            </p>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}