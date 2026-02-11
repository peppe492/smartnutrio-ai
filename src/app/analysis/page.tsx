"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Zap, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MealAnalysisPage() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [mealData, setMealData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedData = sessionStorage.getItem('last_meal_analysis');
    if (savedData) {
      setMealData(JSON.parse(savedData));
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const handleConfirm = async () => {
    if (!user || !db || !mealData || isSaving) return;
    
    setIsSaving(true);
    try {
      const mealsCol = collection(db, 'users', user.uid, 'meals');
      await addDoc(mealsCol, {
        name: mealData.food_name,
        description: mealData.description,
        calories: mealData.calories,
        macros: {
          protein: mealData.macros.protein_g,
          carbs: mealData.macros.carbs_g,
          fat: mealData.macros.fat_g,
        },
        timestamp: new Date().toISOString(),
        type: mealData.type || 'pasto',
        image: mealData.image || ''
      });
      
      sessionStorage.removeItem('last_meal_analysis');
      
      toast({
        title: "Pasto registrato!",
        description: `${mealData.food_name} è stato aggiunto al tuo log giornaliero.`,
      });
      
      router.push('/dashboard');
    } catch (e) {
      console.error("Errore salvataggio pasto:", e);
      setIsSaving(false);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile salvare il pasto. Riprova.",
      });
    }
  };

  if (!mounted || !mealData) return null;

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-sans text-slate-800">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">SmartNutrio <span className="text-primary">AI</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Avatar className="h-10 w-10 border-2 border-primary/20 hover:scale-105 transition-transform">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary">
              <ArrowLeft size={16} /> Torna indietro
            </button>
            <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border bg-white shadow-2xl">
              <img src={mealData.image || 'https://picsum.photos/seed/food/800/600'} alt={mealData.food_name} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="w-full lg:w-[400px] flex flex-col gap-6">
            <div className="bg-white p-8 rounded-[2rem] border shadow-xl">
              <div className="mb-8">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Analisi Pasto</span>
                <h1 className="text-3xl font-extrabold text-slate-900 mt-1">{mealData.food_name}</h1>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">{mealData.description}</p>
              </div>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-black">{mealData.calories}</span>
                <span className="text-xl font-bold text-slate-400">kcal</span>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleConfirm} 
                  disabled={isSaving}
                  className="w-full py-7 bg-primary hover:bg-primary/90 text-white font-bold rounded-full"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : "Conferma e Registra"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
