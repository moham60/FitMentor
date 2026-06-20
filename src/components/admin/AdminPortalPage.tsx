import React, { useEffect, useState } from 'react';
import AdminFortressGate from './AdminFortressGate';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShieldCheck, 
  Users, 
  Clock, 
  History, 
  CheckCircle2, 
  UserX, 
  UserCheck, 
  AlertTriangle, 
  Search, 
  RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// تخطي فحص TypeScript للجدول الجديد
const sb = supabase as any;

export default function AdminPortalPage() {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'logs'>('pending');
  const [loading, setLoading] = useState(false);

  // Data states
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const { data } = await sb
          .from('pending_subscriptions')
          .select('*')
          .order('created_at', { ascending: false });
        setPendingRequests(data || []);
      } else if (activeTab === 'users') {
        const { data } = await sb
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        setAllUsers(data || []);
      } else {
        const { data } = await sb
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 1. APPROVE / REJECT PENDING SUBSCRIPTION
  // ==========================================
  const handleApproveSubscription = async (req: any) => {
    if (!window.confirm(`تأكيد تفعيل باقة (${req.requested_plan_id}) للمستخدم ${req.user_name}؟`)) return;

    try {
      // 1. تحديث حالة الطلب
      await sb.from('pending_subscriptions').update({ status: 'approved' }).eq('id', req.id);

      // 2. منح الباقة للمستخدم في البروفايل
      const now = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(now.getDate() + 30);

      await sb.from('profiles').update({
        plan_id: req.requested_plan_id,
        plan_status: 'active',
        plan_started_at: now.toISOString(),
        plan_expires_at: thirtyDaysLater.toISOString()
      }).eq('user_id', req.user_id);

      // 3. تسجيل في الـ Audit Log
      await sb.from('admin_audit_logs').insert({
        admin_email: currentAdmin?.email || 'Admin',
        action_taken: 'APPROVED_MANUAL_PAYMENT',
        target_user_id: req.user_id,
        details: `Approved ${req.requested_plan_id} plan via ${req.payment_method} (${req.amount} EGP)`
      });

      toast.success("تم تفعيل الباقة للمستخدم بنجاح!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء التفعيل");
    }
  };

  const handleRejectSubscription = async (reqId: string, userId: string) => {
    const reason = window.prompt("ما هو سبب الرفض؟ (سيظهر للمستخدم)");
    if (reason === null) return;

    try {
      await sb.from('pending_subscriptions').update({ status: 'rejected' }).eq('id', reqId);
      await sb.from('profiles').update({ plan_status: 'free' }).eq('user_id', userId);

      toast.info("تم رفض الطلب");
      fetchData();
    } catch (err) {
      console.error("Reject error:", err);
    }
  };

  // ==========================================
  // 2. TOGGLE USER MEMBERSHIP (BAN / REVOKE)
  // ==========================================
  const handleToggleUserStatus = async (userObj: any) => {
    const isBanned = userObj.plan_status === 'banned';
    const newStatus = isBanned ? 'free' : 'banned';
    const actionName = isBanned ? 'UNBANNED_USER' : 'BANNED_USER';

    try {
      await sb.from('profiles').update({ plan_status: newStatus }).eq('user_id', userObj.user_id);
      await sb.from('admin_audit_logs').insert({
        admin_email: currentAdmin?.email || 'Admin',
        action_taken: actionName,
        target_user_id: userObj.user_id,
        details: `Changed plan_status to ${newStatus}`
      });

      toast.success(`تم ${isBanned ? 'إلغاء حظر' : 'إيقاف'} المستخدم!`);
      fetchData();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.user_id || '').includes(searchQuery)
  );

  return (
    <AdminFortressGate>
      <div className="min-h-screen bg-[#0a0a16] text-[#e2e2f0] font-sans selection:bg-cyan-500 selection:text-black" dir="rtl">
        {/* Top Cyber Navigation */}
        <header className="bg-[#121226] border-b border-[#26264c] px-6 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <h1 className="text-lg md:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              FITMENTOR // CORE
            </h1>
            <Badge variant="outline" className="border-cyan-500 text-cyan-400 bg-cyan-500/10 ml-4 font-mono text-xs hidden sm:inline-flex">
              GOD MODE
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0a0a16] p-1.5 rounded-2xl border border-[#26264c]">
            <Button 
              onClick={() => setActiveTab('pending')} 
              variant={activeTab === 'pending' ? 'default' : 'ghost'} 
              className={`rounded-xl gap-2 font-bold text-xs md:text-sm ${activeTab === 'pending' ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'text-slate-400'}`}
            >
              <Clock className="w-4 h-4 shrink-0" /> 
              <span className="hidden md:inline">المعاملات</span> ({pendingRequests.filter(r => r.status === 'pending').length})
            </Button>

            <Button 
              onClick={() => setActiveTab('users')} 
              variant={activeTab === 'users' ? 'default' : 'ghost'} 
              className={`rounded-xl gap-2 font-bold text-xs md:text-sm ${activeTab === 'users' ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'text-slate-400'}`}
            >
              <Users className="w-4 h-4 shrink-0" /> 
              <span className="hidden md:inline">المستخدمين</span>
            </Button>

            <Button 
              onClick={() => setActiveTab('logs')} 
              variant={activeTab === 'logs' ? 'default' : 'ghost'} 
              className={`rounded-xl gap-2 font-bold text-xs md:text-sm ${activeTab === 'logs' ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'text-slate-400'}`}
            >
              <History className="w-4 h-4 shrink-0" /> 
              <span className="hidden md:inline">المراقبة</span>
            </Button>
          </div>

          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="icon" 
            className="border-[#26264c] bg-[#121226] hover:bg-[#1f1f3d] text-cyan-400"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-8">
          {/* ==================== TAB 1: PENDING TRANSFERS ==================== */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-black text-white">مراجعة التحويلات المالية اليدوية</h2>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-20 bg-[#121226]/50 rounded-3xl border border-[#26264c]">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-400 font-medium">لا توجد أي طلبات اشتراك معلقة في الوقت الحالي.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingRequests.map((req) => (
                    <div 
                      key={req.id} 
                      className="bg-[#121226] border border-[#26264c] p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
                          req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {(req.requested_plan_id || 'B').charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base md:text-lg text-white truncate">{req.user_name}</h3>
                            <Badge className="bg-[#26264c] text-cyan-300 hover:bg-[#26264c] text-xs">{req.payment_method}</Badge>
                            <span className="text-xs font-mono text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs md:text-sm text-slate-400 mt-1 truncate">
                            البريد: {req.user_email} // المرجع: <span className="text-amber-300 font-mono select-all">{req.transfer_reference}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-[#26264c]">
                        <div className="text-center font-mono" dir="ltr">
                          <span className="text-xl md:text-2xl font-black text-emerald-400">{req.amount}</span>
                          <span className="text-[10px] text-slate-500 block">EGP</span>
                        </div>

                        {req.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleApproveSubscription(req)} 
                              className="bg-emerald-500 hover:bg-emerald-600 text-black font-black gap-1 text-xs md:text-sm"
                            >
                              <ShieldCheck className="w-4 h-4 shrink-0" /> تفعيل
                            </Button>
                            <Button 
                              onClick={() => handleRejectSubscription(req.id, req.user_id)} 
                              variant="destructive" 
                              className="font-bold text-xs md:text-sm"
                            >
                              رفض
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className={req.status === 'approved' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-red-500 text-red-400 bg-red-500/5'}>
                            {req.status === 'approved' ? 'تم التفعيل' : 'مرفوض'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: USER MANAGEMENT ==================== */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121226] p-4 rounded-2xl border border-[#26264c]">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                  <Input 
                    placeholder="ابحث بالاسم أو الـ ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 bg-[#0a0a16] border-[#26264c] text-white placeholder:text-slate-600 text-sm h-10"
                  />
                </div>
                <Badge variant="outline" className="border-[#26264c] text-slate-400 bg-[#0a0a16] px-3 py-1.5 text-xs font-mono">
                  TOTAL ACCOUNTS: {allUsers.length}
                </Badge>
              </div>

              <div className="bg-[#121226] border border-[#26264c] rounded-2xl overflow-x-auto shadow-2xl">
                <table className="w-full text-right border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-[#181833] border-b border-[#26264c] text-xs text-slate-400 font-mono tracking-wider">
                      <th className="p-4">المستخدم</th>
                      <th className="p-4">النوع</th>
                      <th className="p-4">الباقة</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-left">التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26264c] text-sm">
                    {filteredUsers.map((u) => (
                      <tr key={u.user_id} className="hover:bg-[#181833]/50 transition-colors">
                        <td className="p-4 font-bold text-white truncate max-w-[180px]">
                          {u.full_name || <span className="text-slate-600 italic">بدون اسم</span>}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-500/10 font-mono text-xs">
                            {u.account_type || 'user'}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono text-cyan-400 font-bold uppercase">
                          {u.plan_id || 'FREE'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                            u.plan_status === 'banned' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                            u.plan_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {u.plan_status === 'banned' ? 'BANNED 🚫' : u.plan_status === 'active' ? 'ACTIVE 🟢' : 'FREE ⚪'}
                          </span>
                        </td>
                        <td className="p-4 text-left">
                          <Button 
                            onClick={() => handleToggleUserStatus(u)}
                            variant={u.plan_status === 'banned' ? 'outline' : 'destructive'} 
                            size="sm"
                            className="font-bold text-xs rounded-xl gap-1"
                          >
                            {u.plan_status === 'banned' ? (
                              <><UserCheck className="w-3.5 h-3.5 text-emerald-400"/> فك الحظر</>
                            ) : (
                              <><UserX className="w-3.5 h-3.5"/> حظر</>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: SYSTEM AUDIT LOGS ==================== */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start md:items-center gap-3 text-amber-300 text-xs md:text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 md:mt-0" />
                <p className="leading-relaxed">
                  هذا السجل مؤمن تشفيرياً ضد الحذف، ويقوم بتسجيل الـ بصمة الزمنية (Timestamp) لأي مسؤول يقوم بتعديل حالة الحسابات أو تفعيل الاشتراكات.
                </p>
              </div>

              <div className="bg-[#121226] border border-[#26264c] p-4 md:p-6 rounded-2xl font-mono text-xs space-y-2.5">
                {auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3 rounded-xl bg-[#0a0a16] border border-[#26264c] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <span className="text-cyan-400 font-bold shrink-0">[{log.admin_email}]</span>
                      <span className="text-amber-400 font-bold shrink-0">👉 {log.action_taken}</span>
                      <span className="text-slate-400 truncate max-w-xs md:max-w-md">// {log.details}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] sm:text-xs shrink-0 sm:text-right">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </AdminFortressGate>
  );
}