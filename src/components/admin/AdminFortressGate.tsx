import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, KeyRound, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MASTER_SECURITY_PIN = "778899";

export default function AdminFortressGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  const isSuperAdmin = user?.user_metadata?.account_type === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4" dir="rtl">
        <ShieldAlert className="w-20 h-20 text-red-500 animate-bounce mb-4" />
        <h1 className="text-3xl font-black mb-2">ACCESS DENIED</h1>
        <p className="text-slate-400 mb-6 text-center max-w-md">
          هذه المنطقة مخصصة لمسؤولي النظام ذوي الصلاحيات العليا فقط. محاولتك للدخول تم تسجيلها أمنياً.
        </p>
        <Button onClick={() => navigate('/dashboard')} variant="destructive" className="gap-2 font-bold">
          <ArrowLeft className="w-4 h-4 ml-1" /> العودة للموقع
        </Button>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-cyan-400">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black mb-1">بوابة الأمان الفائقة</h2>
          <p className="text-xs text-slate-400 mb-6">أدخل كود الـ MASTER PIN لتأكيد هويتك الإدارية</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pin === MASTER_SECURITY_PIN) { setUnlocked(true); setError(false); } 
            else { setError(true); setPin(''); }
          }}>
            <Input 
              type="password" 
              placeholder="••••••" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center tracking-[1em] font-mono text-2xl h-14 bg-slate-950 border-slate-800 mb-4 text-cyan-400 placeholder:tracking-normal"
              maxLength={6}
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mb-4">الكود غير صحيح، عاود المحاولة</p>}
            <Button type="submit" className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-black font-black text-base">
              فـك القـفـل 🔓
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}