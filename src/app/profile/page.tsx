
"use client";

import { useAuth, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { 
  User, Mail, Target, Award, LogOut, ChevronRight, 
  ArrowLeft, Settings, Shield, Bell, Zap, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
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
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <Zap className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-display text-slate-800">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 h-20 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft size={18} /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Zap size={16} className="fill-current" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">SmartNutrio <span className="text-primary">AI</span></span>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full text-slate-400">
          <Settings size={20} />
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Profile Hero */}
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
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <Mail size={16} /> {user.email}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-xs font-bold text-primary uppercase tracking-widest">
            <Award size={14} /> Membro SmartNutrio Pro
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Stats & Goals */}
          <Card className="p-8 border-none shadow-xl rounded-[2.5rem] bg-white">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Target className="text-primary" size={20} /> Il Tuo Piano
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
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
                <div className="text-center p-3 border-x">
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

          {/* Settings Menu */}
          <div className="space-y-4">
            <ProfileMenuItem icon={<User size={18} />} label="Informazioni Personali" />
            <ProfileMenuItem icon={<Bell size={18} />} label="Notifiche" />
            <ProfileMenuItem icon={<Shield size={18} />} label="Privacy e Sicurezza" />
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] shadow-sm hover:bg-red-50 transition-all group border border-transparent hover:border-red-100"
            >
              <div className="flex items-center gap-4 text-red-500 font-bold">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
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

function ProfileMenuItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
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
