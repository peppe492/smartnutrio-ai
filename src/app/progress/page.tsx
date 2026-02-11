
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Zap, LayoutGrid, History, User, Utensils, Scale, Droplets,
  Plus, Trash2, Loader2, Menu, TrendingUp, Calendar as CalendarIcon, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ProgressPage() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({
    weight: '',
    waist: '',
    bodyFat: '',
  });

  const progressQuery = useMemo(() => {
    if (!user || !db) return null;
    return query(collection(db, 'users', user.uid, 'progress'), orderBy('timestamp', 'asc'));
  }, [db, user]);

  const { data: allEntries = [], loading: progressLoading } = useCollection<any>(progressQuery);

  const chartData = useMemo(() => {
    return allEntries.map(entry => ({
      date: format(new Date(entry.timestamp), 'dd/MM'),
      weight: entry.weight,
      waist: entry.waist || null,
      bodyFat: entry.bodyFat || null,
    }));
  }, [allEntries]);

  const latestEntry = allEntries[allEntries.length - 1];

  const handleAddEntry = async () => {
    if (!user || !db || !newEntry.weight) return;
    
    setIsSaving(true);
    try {
      const progressCol = collection(db, 'users', user.uid, 'progress');
      await addDoc(progressCol, {
        weight: Number(newEntry.weight),
        waist: newEntry.waist ? Number(newEntry.waist) : null,
        bodyFat: newEntry.bodyFat ? Number(newEntry.bodyFat) : null,
        timestamp: new Date().toISOString(),
      });
      
      setIsAddModalOpen(false);
      setNewEntry({ weight: '', waist: '', bodyFat: '' });
      toast({ title: "Dati salvati!", description: "Il tuo progresso è stato aggiornato." });
    } catch (e) {
      toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare i dati." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'progress', id));
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
              <h1 className="text-2xl font-bold text-slate-900">Tracciamento Fisico 📈</h1>
              <p className="text-slate-400 font-medium text-sm">Monitora il tuo peso e le tue misure nel tempo.</p>
            </div>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6 shadow-lg shadow-primary/20 gap-2 w-full sm:w-auto">
                  <Plus size={20} /> NUOVA VOCE
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-[32px] p-8 border-none bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Registra Dati</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Peso attuale (kg)</Label>
                      <Input type="number" step="0.1" placeholder="Es: 70.5" className="h-12 rounded-xl" value={newEntry.weight} onChange={e => setNewEntry({...newEntry, weight: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Vita (cm)</Label>
                        <Input type="number" step="0.5" placeholder="Es: 85" className="h-12 rounded-xl" value={newEntry.waist} onChange={e => setNewEntry({...newEntry, waist: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Grasso (%)</Label>
                        <Input type="number" step="0.1" placeholder="Es: 15" className="h-12 rounded-xl" value={newEntry.bodyFat} onChange={e => setNewEntry({...newEntry, bodyFat: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddEntry} disabled={isSaving} className="w-full h-14 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors">
                    {isSaving ? <Loader2 className="animate-spin" /> : "Salva Progressi"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <Card className="border-none rounded-[32px] bg-white nutrio-shadow p-8 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Scale size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Peso Attuale</p>
                  <p className="text-3xl font-black text-slate-900">{latestEntry?.weight || '--'} <span className="text-sm text-slate-400 font-bold">kg</span></p>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium">Ultimo aggiornamento: {latestEntry ? format(new Date(latestEntry.timestamp), 'd MMM yyyy', { locale: it }) : 'Nessun dato'}</p>
            </Card>

            <Card className="border-none rounded-[32px] bg-white nutrio-shadow p-8 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Circonferenza Vita</p>
                  <p className="text-3xl font-black text-slate-900">{latestEntry?.waist || '--'} <span className="text-sm text-slate-400 font-bold">cm</span></p>
                </div>
              </div>
            </Card>

            <Card className="border-none rounded-[32px] bg-white nutrio-shadow p-8 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                  <Zap size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grasso Corporeo</p>
                  <p className="text-3xl font-black text-slate-900">{latestEntry?.bodyFat || '--'} <span className="text-sm text-slate-400 font-bold">%</span></p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="border-none rounded-[40px] bg-white nutrio-shadow p-8 lg:p-12 mb-12">
            <CardHeader className="px-0 pt-0 pb-8">
              <CardTitle className="text-xl font-bold">Andamento Peso</CardTitle>
              <CardDescription>Visualizza come cambia il tuo peso nel corso del tempo.</CardDescription>
            </CardHeader>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}
                    labelStyle={{fontWeight: 'bold', color: '#1e293b'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#4ADE80" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorWeight)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Registro Storico</h2>
            <div className="space-y-4">
              {allEntries.slice().reverse().map((entry: any) => (
                <Card key={entry.id} className="border-none rounded-3xl bg-white nutrio-shadow p-6 flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <CalendarIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{format(new Date(entry.timestamp), 'd MMMM yyyy', { locale: it })}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(new Date(entry.timestamp), 'HH:mm')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Peso</p>
                      <p className="font-black text-slate-900">{entry.weight} kg</p>
                    </div>
                    {entry.waist && (
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Vita</p>
                        <p className="font-black text-slate-900">{entry.waist} cm</p>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100" onClick={() => handleDeleteEntry(entry.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </Card>
              ))}
              {allEntries.length === 0 && (
                <div className="text-center py-20 bg-white/50 border-2 border-dashed rounded-[40px]">
                  <p className="text-slate-400 font-medium">Inizia a registrare il tuo peso per vedere i progressi!</p>
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
