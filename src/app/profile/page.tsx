'use client';

import { useAuth, useFirestore, useDoc } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  User, Mail, Target, Award, LogOut, ChevronRight, 
  Settings, Shield, Bell, Zap, Camera, LayoutGrid, History, Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { auth } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileQuery = user && db ? doc(db, 'users', user.uid) : null;
  const { data: userProfile, loading: profileLoading } = useDoc(userProfileQuery);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/');
      toast({ title: "Sessione chiusa", description: "A presto!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: "Impossibile disconnettersi." });
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <Zap className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-8 px-6 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">SmartNutrio<span className="text-primary">.</span></span>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarLink href="/dashboard" icon={<LayoutGrid size={20} />} label="Dashboard" active={pathname === '/dashboard'} />
          <SidebarLink href="/pantry" icon={<Utensils size={20} />} label="Dispensa" active={pathname === '/pantry'} />
          <SidebarLink href="/history" icon={<History size={20} />} label="Cronologia" active={pathname === '/history'} />
          <SidebarLink href="/profile" icon={<User size={20} />} label="Profilo" active={pathname === '/profile'} />
        </nav>
      </aside>

      <main className="flex-1 lg:ml-64 p-6 lg:p-10">
        <div className="flex flex-col items-center text-center mb-12">
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
          <h1 className="text-3xl font-black text-slate-900 mb-1">{user.displayName}</h1>
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
              <Target className="text-primary" size={20} /> Il Tuo Piano
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-6 bg-slate-50 rounded-[28px]">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Obiettivo Giornaliero</p>
                  <p className="text-2xl font-black text-slate-900">{userProfile?.tdeeGoal || '2000'} <span className="text-sm text-slate-400">kcal</span></p>
                </div>
                <Button variant="outline" size="sm" asChild className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5">
                  <Link href="/onboarding">Modifica</Link>
                </Button>
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
            </div>
          </Card>

          <div className="space-y-4">
            <ProfileMenuItem icon={<User size={18} />} label="Informazioni Personali" />
            <ProfileMenuItem icon={<Bell size={18} />} label="Notifiche" />
            <ProfileMenuItem icon={<Shield size={18} />} label="Privacy e Sicurezza" />
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
