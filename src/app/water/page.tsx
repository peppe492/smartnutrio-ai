
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, startOfDay, endOfDay, isToday, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Zap, LayoutGrid, History, User, Utensils, Droplets, 
  Plus, Trash2, Loader2, Menu, TrendingUp, Calendar as CalendarIcon, GlassWater
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function WaterPage() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const waterQuery = useMemo(() => {
    if (!user || !db) return null;
    return query(collection(db, 'users', user.uid, 'water'), orderBy('timestamp', 'asc'));
  }, [db, user]);

  const { data: allLogs = [], loading: waterLoading } = useCollection<any>(waterQuery);

  const dailyTotal = useMemo(() => {
    return allLogs
      .filter(log => {
        const d = new Date(log.timestamp);
        return isValid(d) && isToday(d);
      })
      .reduce((sum, log) => sum + log.amount, 0);
  }, [allLogs]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'yyyy-MM-dd');
    });

    return last7Days.map(dateStr => {
      const totalForDay = allLogs
        .filter(log => {
          const d = new Date(log.timestamp);
          return isValid(d) && format(d, 'yyyy-MM-dd') === dateStr;
        })
        .reduce((sum, log) => sum + log.amount, 0);
      
      return {
        date: format(new Date(dateStr), 'dd/MM'),
        amount: totalForDay,
      };
    });
  }, [allLogs]);

  const handleAddWater = async (amount: number) => {
    if (!user || !db) return;
    
    setIsSaving(true);
    try {
      const waterCol = collection(db, 'users', user.uid, 'water');
      await addDoc(waterCol, {
        amount: Number(amount),
        timestamp: new Date().toISOString(),
      });
      
      setIsAddModalOpen(false);
      setCustomAmount('');
      toast({ title: "Idratazione registrata!", description: `Hai aggiunto ${amount}ml d'acqua.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare i dati." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'water', id));
      toast({ title: "Rimosso", description: "La voce è stata eliminata." });
    } catch (e) {
      toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare." });
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]"><Loader2 className="animate-spin text-primary" /></div>;

  const navLinks = (
    <nav className="flex-1 space-y-2">
      <SidebarLink href="/dashboard" icon={<LayoutGrid size={20} />} label="Dashboard" active={pathname === '/dashboard'} />
      <SidebarLink href="/pantry" icon={<Utensils size={20} />} label="Dispensa" active={pathname === '/pantry'} />
      <SidebarLink href="/history" icon={<History size={20} />} label="Cronologia" active={pathname === '/history'} />
      <SidebarLink href="/water" icon={<Droplets size={20} />} label="Acqua" active={pathname === '/water'} />
      <SidebarLink href="/progress" icon={<TrendingUp size={20} />} label="Progressi" active={pathname === '/progress'} />
      <SidebarLink href="/profile" icon={<User size={20} />} label="Profilo" active={pathname === '/profile'} />
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-8 px-6 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">SmartNutrio<span className="text-primary">.</span></span>
        </div>
        {navLinks}
      </aside>

      <main className="flex-1 lg:ml-64 w-full">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b px-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">SmartNutrio</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-6">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu di Navigazione</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-3 mb-12">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">SmartNutrio</span>
              </div>
              {navLinks}
            </SheetContent>
          </Sheet>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Idratazione 💧</h1>
              <p className="text-slate-400 font-medium text-sm">Monitora quanta acqua bevi durante il giorno.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleAddWater(250)} className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold h-12 px-4 shadow-lg shadow-blue-500/20 gap-2">
                +250ml
              </Button>
              <Button onClick={() => handleAddWater(500)} className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold h-12 px-4 shadow-lg shadow-blue-500/20 gap-2">
                +500ml
              </Button>
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6 shadow-lg shadow-primary/20 gap-2">
                    <Plus size={20} /> PERSONALIZZA
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-[32px] p-8 border-none bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900">Aggiungi Acqua</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Quantità (ml)</Label>
                      <Input type="number" step="50" placeholder="Es: 330" className="h-12 rounded-xl" value={customAmount} onChange={e => setCustomAmount(e.target.value)} />
                    </div>
                    <Button onClick={() => handleAddWater(Number(customAmount))} disabled={isSaving || !customAmount} className="w-full h-14 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors">
                      {isSaving ? <Loader2 className="animate-spin" /> : "Aggiungi"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <Card className="border-none rounded-[32px] bg-white nutrio-shadow p-8 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                  <Droplets size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Totale Oggi</p>
                  <p className="text-3xl font-black text-slate-900">{dailyTotal} <span className="text-sm text-slate-400 font-bold">ml</span></p>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium">Obiettivo consigliato: 2000ml</p>
              <div className="h-2.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (dailyTotal / 2000) * 100)}%` }}
                ></div>
              </div>
            </Card>

            <Card className="border-none rounded-[32px] bg-white nutrio-shadow p-8 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <GlassWater size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stato Idratazione</p>
                  <p className="text-xl font-bold text-slate-900">
                    {dailyTotal >= 2000 ? "Ottimo lavoro! Sei ben idratato. ✨" : `Ti mancano ${Math.max(0, 2000 - dailyTotal)}ml al traguardo.`}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-none rounded-[40px] bg-white nutrio-shadow p-8 lg:p-12 mb-12">
            <CardHeader className="px-0 pt-0 pb-8">
              <CardTitle className="text-xl font-bold">Andamento Settimanale</CardTitle>
              <CardDescription>Visualizza il tuo consumo di acqua negli ultimi 7 giorni.</CardDescription>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}
                    labelStyle={{fontWeight: 'bold', color: '#1e293b'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorWater)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Log Odierno</h2>
            <div className="space-y-4">
              {allLogs
                .filter(log => {
                  const d = new Date(log.timestamp);
                  return isValid(d) && isToday(d);
                })
                .slice().reverse().map((log: any) => (
                <Card key={log.id} className="border-none rounded-3xl bg-white nutrio-shadow p-6 flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-100 transition-colors">
                      <Droplets size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{log.amount} ml</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(new Date(log.timestamp), 'HH:mm')}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100" onClick={() => handleDeleteLog(log.id)}>
                    <Trash2 size={18} />
                  </Button>
                </Card>
              ))}
              {allLogs.filter(log => {
                const d = new Date(log.timestamp);
                return isValid(d) && isToday(d);
              }).length === 0 && (
                <div className="text-center py-20 bg-white/50 border-2 border-dashed rounded-[40px]">
                  <p className="text-slate-400 font-medium">Ancora nessuna bevuta oggi. Inizia subito!</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm",
        active 
          ? "bg-primary/10 text-primary border-l-4 border-primary shadow-sm" 
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      {icon} {label}
    </Link>
  );
}
