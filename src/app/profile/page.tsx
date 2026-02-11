
'use client';

import { useAuth, useFirestore, useDoc, useAuthInstance } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  User, Mail, Target, Award, LogOut, ChevronRight, 
  Settings, Shield, Bell, Zap, Camera, LayoutGrid, History, Utensils, Loader2, Menu, Edit2, Sparkles, TrendingUp, Droplets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { calculateTDEE, ACTIVITY_LEVELS } from '@/lib/tdee';

export default function ProfilePage() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const auth = useAuthInstance();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemo(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userProfile, loading: profileLoading } = useDoc(userProfileRef);

  const [editData, setEditData] = useState({
    weight: 0,
    height: 0,
    age: 0,
    gender: 'male' as 'male' | 'female',
    activityLevel: 1.55
  });

  useEffect(() => {
    if (userProfile) {
      setEditData({
        weight: userProfile.weight || 70,
        height: userProfile.height || 175,
        age: userProfile.age || 25,
        gender: userProfile.gender || 'male',
        activityLevel: userProfile.activityLevel || 1.55
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.replace('/');
    }
  }, [mounted, authLoading, user, router]);

  const handleUpdateParams = async () => {
    if (!user || !db || !userProfileRef) return;
    setIsUpdating(true);
    try {
      const newTdee = calculateTDEE({
        weight: editData.weight,
        height: editData.height,
        age: editData.age,
        gender: editData.gender,
        activityLevel: editData.activityLevel as any
      });

      await updateDoc(userProfileRef, {
        ...editData,
        tdeeGoal: newTdee
      });

      toast({
        title: "Parametri aggiornati!",
        description: `Il tuo nuovo obiettivo è ${newTdee} kcal al giorno.`,
      });
      setIsEditModalOpen(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile aggiornare i parametri.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      sessionStorage.clear();
      localStorage.clear();
      router.push('/');
      toast({ title: "Sessione chiusa", description: "A presto!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: "Impossibile disconnettersi." });
    }
  };

  if (!mounted || authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Caricamento profilo...</p>
      </div>
    );
  }

  if (!user) return null;

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
          <header className="mb-10">
            <h1 className="text-2xl font-bold text-slate-900">Il Tuo Account</h1>
            <p className="text-slate-400 font-medium text-sm">Gestisci le tue impostazioni e visualizza il tuo piano.</p>
          </header>

          <div className="flex flex-col items-center text-center mb-12 bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
            <div className="relative group mb-6">
              <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback className="text-4xl bg-primary text-white font-bold">
                  {user.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors">
                <Camera size={18} className="text-slate-400" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-1">{user.displayName}</h2>
            <p className="text-slate-500 font-medium flex items-center justify-center gap-2">
              <Mail size={16} /> {user.email}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-widest">
              <Award size={14} /> Membro SmartNutrio Pro
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 border-none shadow-xl rounded-[40px] bg-white">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-900">
                <Target className="text-primary" size={20} /> Piano Nutrizionale
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-6 bg-slate-50 rounded-[28px] gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Obiettivo Giornaliero</p>
                    <p className="text-2xl font-black text-slate-900">{userProfile?.tdeeGoal || '2000'} <span className="text-sm text-slate-400">kcal</span></p>
                  </div>
                  <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 w-full sm:w-auto gap-2">
                        <Edit2 size={14} /> Aggiorna Parametri
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[32px] p-8 border-none bg-white">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">Aggiorna Parametri</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Peso (kg)</Label>
                            <Input type="number" value={editData.weight} onChange={e => setEditData({ ...editData, weight: Number(e.target.value) })} className="h-12 rounded-xl" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Altezza (cm)</Label>
                            <Input type="number" value={editData.height} onChange={e => setEditData({ ...editData, height: Number(e.target.value) })} className="h-12 rounded-xl" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Età</Label>
                            <Input type="number" value={editData.age} onChange={e => setEditData({ ...editData, age: Number(e.target.value) })} className="h-12 rounded-xl" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Sesso</Label>
                            <Select value={editData.gender} onValueChange={(v: any) => setEditData({ ...editData, gender: v })}>
                              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Uomo</SelectItem>
                                <SelectItem value="female">Donna</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Attività</Label>
                          <Select value={editData.activityLevel.toString()} onValueChange={(v) => setEditData({ ...editData, activityLevel: Number(v) })}>
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ACTIVITY_LEVELS.map(l => (
                                <SelectItem key={l.value} value={l.value.toString()}>{l.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleUpdateParams} 
                          disabled={isUpdating}
                          className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20"
                        >
                          {isUpdating ? <Loader2 className="animate-spin mr-2" /> : "Salva e Ricalcola"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Proteine</p>
                    <p className="text-sm font-bold text-slate-900">150g</p>
                  </div>
                  <div className="text-center p-3 border-x border-slate-50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Carboidrati</p>
                    <p className="text-sm font-bold text-slate-900">300g</p>
                  </div>
                  <div className="text-center p-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Grassi</p>
                    <p className="text-sm font-bold text-slate-900">80g</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-50">
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    Questi valori sono ricalcolati istantaneamente in base ai tuoi nuovi parametri fisici.
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4 mb-2">Impostazioni</h3>
              <ProfileMenuItem icon={<Settings size={18} />} label="Preferenze Account" />
              <ProfileMenuItem icon={<Bell size={18} />} label="Notifiche e Avvisi" />
              <ProfileMenuItem icon={<Shield size={18} />} label="Privacy e Sicurezza" />
              
              <div className="pt-6">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-6 bg-white rounded-[32px] shadow-sm hover:bg-red-50 transition-all group border border-transparent hover:border-red-100"
                >
                  <div className="flex items-center gap-4 text-red-500 font-bold">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center transition-colors group-hover:bg-red-200">
                      <LogOut size={20} />
                    </div>
                    Esci dall'account
                  </div>
                  <ChevronRight size={20} className="text-red-200 group-hover:text-red-500" />
                </button>
              </div>
            </div>
          </div>
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

function ProfileMenuItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="w-full flex items-center justify-between p-6 bg-white rounded-[32px] shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center gap-4 font-bold text-slate-700">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          {icon}
        </div>
        {label}
      </div>
      <ChevronRight size={20} className="text-slate-300 group-hover:text-primary" />
    </button>
  );
}
