
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Sparkles, Bell, CheckCircle, 
  Pencil, Info, Camera, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function MealAnalysisPage() {
  const router = useRouter();
  const [mealData, setMealData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedData = sessionStorage.getItem('last_meal_analysis');
    if (savedData) {
      setMealData(JSON.parse(savedData));
    } else {
      // Dati di fallback per scopi dimostrativi se non ci sono dati in sessione
      setMealData({
        food_name: "Toast con Avocado e Uova",
        description: "Porzione stimata: 320g. Include 2 uova, pane integrale e avocado medio.",
        calories: 450,
        macros: {
          protein_g: 18,
          carbs_g: 32,
          fat_g: 28,
        },
        image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800&auto=format&fit=crop"
      });
    }
  }, []);

  const handleConfirm = () => {
    // Qui andrebbe la logica di salvataggio su Firestore
    router.push('/dashboard');
  };

  if (!mounted || !mealData) return null;

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-sans antialiased text-slate-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#44E484]/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#44E484] rounded-xl flex items-center justify-center">
              <Zap className="text-white w-6 h-6 fill-current" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              SmartNutrio <span className="text-[#44E484]">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:bg-[#44E484]/10">
              <Bell size={24} />
            </Button>
            <Avatar className="h-10 w-10 border-2 border-[#44E484]/20">
              <AvatarImage src="https://picsum.photos/seed/user123/100/100" />
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column: Image Preview */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#44E484] transition-colors"
              >
                <ArrowLeft size={16} />
                Torna alla Dashboard
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#44E484]/10 rounded-full">
                <span className="w-2 h-2 bg-[#44E484] rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-[#44E484] uppercase tracking-wider">Analisi IA Attiva</span>
              </div>
            </div>

            <div className="relative group aspect-[4/3] rounded-[2rem] overflow-hidden border border-[#44E484]/10 bg-white shadow-2xl shadow-[#44E484]/5">
              <img 
                src={mealData.image} 
                alt="Anteprima Pasto" 
                className="w-full h-full object-cover"
                data-ai-hint="healthy meal"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              
              {/* Mock Hotspots */}
              <div className="absolute top-[35%] left-[45%] flex flex-col items-center">
                <div className="w-6 h-6 bg-[#44E484] rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                <div className="mt-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-xl">
                  <span className="text-[10px] font-bold text-slate-800">Uovo in camicia</span>
                </div>
              </div>
              
              <div className="absolute top-[55%] left-[30%] flex flex-col items-center">
                <div className="w-6 h-6 bg-[#44E484] rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                <div className="mt-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-xl">
                  <span className="text-[10px] font-bold text-slate-800">Avocado Fresco</span>
                </div>
              </div>

              {/* Viewfinder corners */}
              <div className="absolute inset-0 border-[2px] border-[#44E484]/30 rounded-[2rem] pointer-events-none">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[#44E484] rounded-tl-[2rem]"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[#44E484] rounded-tr-[2rem]"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[#44E484] rounded-bl-[2rem]"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[#44E484] rounded-br-[2rem]"></div>
              </div>
            </div>
          </div>

          {/* Right Column: Nutrition Details */}
          <div className="w-full lg:w-[400px] flex flex-col gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-[#44E484]/10 shadow-xl shadow-[#44E484]/5">
              <div className="mb-8">
                <span className="text-xs font-bold text-[#44E484] uppercase tracking-[0.2em]">Piatto Rilevato</span>
                <h1 className="text-3xl font-extrabold text-slate-900 mt-1 leading-tight">{mealData.food_name}</h1>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">{mealData.description}</p>
              </div>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-black text-slate-900">{mealData.calories}</span>
                <span className="text-xl font-bold text-slate-400">kcal</span>
              </div>

              <div className="space-y-6 mb-8">
                <MacroBar label="Proteine" value={mealData.macros.protein_g} goal={50} color="bg-[#44E484]" />
                <MacroBar label="Carboidrati" value={mealData.macros.carbs_g} goal={100} color="bg-[#44E484]" />
                <MacroBar label="Grassi" value={mealData.macros.fat_g} goal={40} color="bg-[#44E484]" />
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleConfirm}
                  className="w-full flex items-center justify-center gap-2 py-7 bg-[#FF7E67] hover:bg-[#FF7E67]/90 text-white font-bold rounded-full transition-all shadow-lg shadow-[#FF7E67]/20 border-none"
                >
                  <CheckCircle size={20} />
                  Conferma e Registra
                </Button>
                <Button 
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 py-7 bg-slate-100 border-none hover:bg-[#44E484]/10 text-slate-600 font-bold rounded-full transition-all"
                >
                  <Pencil size={20} />
                  Modifica Dettagli
                </Button>
              </div>
            </div>

            <div className="bg-[#44E484]/5 p-6 rounded-[2rem] border border-[#44E484]/20">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Info size={18} className="text-[#44E484]" />
                Suggerimento IA
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Questo pasto è ricco di grassi sani e fibre. Per bilanciare il tuo apporto giornaliero, considera una cena a basso contenuto di grassi come pollo alla griglia o tofu con verdure al vapore.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Confidence Badge */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-xl px-6 py-3 rounded-full border border-[#44E484]/20 shadow-2xl">
        <Sparkles size={18} className="text-[#44E484]" />
        <span className="text-sm font-bold text-slate-700">Affidabilità IA: 94%</span>
        <div className="w-px h-4 bg-slate-300 mx-2"></div>
        <button 
          onClick={() => router.push('/dashboard')}
          className="text-xs font-bold text-[#44E484] hover:underline uppercase tracking-tight"
        >
          Scatta di nuovo
        </button>
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, color }: { label: string, value: number, goal: number, color: string }) {
  const percentage = Math.min(100, (value / goal) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-900">{value}g</span>
      </div>
      <div className="h-2 w-full bg-[#44E484]/10 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", color)} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
