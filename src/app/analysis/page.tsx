
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, CheckCircle, Pencil, Zap, Bell, Info 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function MealAnalysisPage() {
  const router = useRouter();
  const { user } = useAuth();
  const db = useFirestore();
  
  const [mealData, setMealData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

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
    if (!user || !db || !mealData) return;
    
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
      router.push('/dashboard');
    } catch (e) {
      console.error("Errore salvataggio pasto:", e);
    }
  };

  if (!mounted || !mealData) return null;

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-sans text-slate-800">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#44E484] rounded-xl flex items-center justify-center text-white">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">SmartNutrio <span className="text-[#44E484]">AI</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border-2 border-[#44E484]/20">
              <AvatarImage src={user?.photoURL || undefined} />
              <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#44E484]">
              <ArrowLeft size={16} /> Torna indietro
            </button>
            <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border bg-white shadow-2xl">
              <img src={mealData.image} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              {/* Mock Hotspots */}
              <div className="absolute top-[35%] left-[45%] flex flex-col items-center">
                <div className="w-6 h-6 bg-[#44E484] rounded-full border-4 border-white animate-pulse"></div>
                <div className="mt-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-xl text-[10px] font-bold">Rilevato</div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[400px] flex flex-col gap-6">
            <div className="bg-white p-8 rounded-[2rem] border shadow-xl">
              <div className="mb-8">
                <span className="text-xs font-bold text-[#44E484] uppercase tracking-widest">Analisi Pasto</span>
                <h1 className="text-3xl font-extrabold text-slate-900 mt-1">{mealData.food_name}</h1>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">{mealData.description}</p>
                <div className="mt-2 inline-block px-3 py-1 bg-[#44E484]/10 rounded-full text-[10px] font-bold text-[#44E484] uppercase">{mealData.type}</div>
              </div>
              <div className="flex items-baseline gap-2 mb-8"><span className="text-5xl font-black">{mealData.calories}</span><span className="text-xl font-bold text-slate-400">kcal</span></div>
              <div className="space-y-6 mb-8">
                <MacroBar label="Proteine" value={mealData.macros.protein_g} goal={50} color="bg-[#44E484]" />
                <MacroBar label="Carboidrati" value={mealData.macros.carbs_g} goal={100} color="bg-[#44E484]" />
                <MacroBar label="Grassi" value={mealData.macros.fat_g} goal={40} color="bg-[#44E484]" />
              </div>
              <div className="space-y-3">
                <Button onClick={handleConfirm} className="w-full py-7 bg-[#FF7E67] hover:bg-[#FF7E67]/90 text-white font-bold rounded-full">
                  <CheckCircle size={20} className="mr-2" /> Conferma e Registra
                </Button>
                <Button variant="outline" className="w-full py-7 rounded-full font-bold">
                  <Pencil size={20} className="mr-2" /> Modifica Dettagli
                </Button>
              </div>
            </div>
            <div className="bg-[#44E484]/5 p-6 rounded-[2rem] border border-[#44E484]/20">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2"><Info size={18} className="text-[#44E484]" /> Analisi Nutrizionale</h3>
              <p className="text-sm text-slate-600 leading-relaxed">I valori sono stimati in base alla dimensione della porzione rilevata.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MacroBar({ label, value, goal, color }: any) {
  const percentage = Math.min(100, (value / goal) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold"><span className="text-slate-600">{label}</span><span className="text-slate-900">{value}g</span></div>
      <div className="h-2 w-full bg-[#44E484]/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
