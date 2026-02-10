"use client";

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
} from 'recharts';
import { 
  Plus, Camera, Pencil, Calendar as CalendarIcon, 
  ChefHat, Info, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { analyzeFoodImage } from '@/ai/flows/analyze-food-image';
import { manualEntryAiAssistance } from '@/ai/flows/manual-entry-ai-assistance';

interface Meal {
  id: string;
  name: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  time: string;
  image?: string;
}

export default function Dashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualInput, setManualInput] = useState("");
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const savedGoal = localStorage.getItem('nutrio_tdee_goal');
    if (savedGoal) setDailyGoal(Number(savedGoal));
  }, []);

  const totals = useMemo(() => {
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.macros.protein,
      carbs: acc.carbs + meal.macros.carbs,
      fat: acc.fat + meal.macros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  const chartData = useMemo(() => [
    { name: 'Consumate', value: totals.calories },
    { name: 'Rimanenti', value: Math.max(0, dailyGoal - totals.calories) }
  ], [totals.calories, dailyGoal]);

  const handleManualEntry = async () => {
    if (!manualInput) return;
    setIsAnalyzing(true);
    try {
      const result = await manualEntryAiAssistance({ foodEntry: manualInput });
      const newMeal: Meal = {
        id: Math.random().toString(36).substr(2, 9),
        name: result.food_name,
        calories: result.calories,
        macros: {
          protein: result.macros.protein_g,
          carbs: result.macros.carbs_g,
          fat: result.macros.fat_g,
        },
        time: format(new Date(), 'HH:mm'),
      };
      setMeals([newMeal, ...meals]);
      setManualInput("");
      setIsAddModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const result = await analyzeFoodImage({ foodPhotoDataUri: base64String });
        const newMeal: Meal = {
          id: Math.random().toString(36).substr(2, 9),
          name: result.food_name,
          calories: result.calories,
          macros: {
            protein: result.macros.protein_g,
            carbs: result.macros.carbs_g,
            fat: result.macros.fat_g,
          },
          time: format(new Date(), 'HH:mm'),
        };
        setMeals([newMeal, ...meals]);
        setIsAddModalOpen(false);
      } catch (error) {
        console.error(error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-nutrio-bg pb-24">
      <header className="p-6 bg-white flex items-center justify-between border-b sticky top-0 z-30">
        <div className="flex flex-col">
          <span className="text-sm text-slate-400 font-medium capitalize">{format(date, 'EEEE, d MMM', { locale: it })}</span>
          <h1 className="text-xl font-bold text-slate-900">Riepilogo di Oggi</h1>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-xl h-12 w-12 border-slate-100 shadow-sm">
              <CalendarIcon className="w-5 h-5 text-slate-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              locale={it}
            />
          </PopoverContent>
        </Popover>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-8">
        <div className="relative h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={80}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
                cornerRadius={10}
              >
                <Cell fill="#4ADE80" />
                <Cell fill="#F1F5F9" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-slate-900">{Math.round(totals.calories)}</span>
            <span className="text-sm text-slate-400 font-medium">di {dailyGoal} kcal</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <MacroCard 
            label="Proteine" 
            value={Math.round(totals.protein)} 
            color="#60A5FA" 
            bgColor="bg-blue-50"
          />
          <MacroCard 
            label="Carbi" 
            value={Math.round(totals.carbs)} 
            color="#FACC15" 
            bgColor="bg-yellow-50"
          />
          <MacroCard 
            label="Grassi" 
            value={Math.round(totals.fat)} 
            color="#A78BFA" 
            bgColor="bg-purple-50"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-slate-900">Pasti Aggiunti</h2>
            <Button variant="ghost" size="sm" className="text-nutrio-mint font-semibold">Vedi Tutti</Button>
          </div>
          
          {meals.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center space-y-3 border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <ChefHat className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm">Nessun pasto aggiunto. Tocca + per iniziare.</p>
            </div>
          ) : (
            meals.map((meal) => (
              <Card key={meal.id} className="border-none nutrio-shadow overflow-hidden group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-nutrio-bg flex items-center justify-center text-slate-300">
                    {meal.image ? (
                      <img src={meal.image} alt={meal.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <ChefHat className="w-8 h-8" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{meal.name}</h3>
                    <div className="flex gap-3 text-xs text-slate-400 font-medium">
                      <span>P: {meal.macros.protein}g</span>
                      <span>C: {meal.macros.carbs}g</span>
                      <span>G: {meal.macros.fat}g</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{meal.calories}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{meal.time}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center pointer-events-none">
        <div className="flex items-center gap-4 bg-white/80 backdrop-blur-lg border border-white/50 px-6 py-3 rounded-2xl nutrio-shadow pointer-events-auto">
          <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10">
            <History className="w-6 h-6" />
          </Button>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="h-16 w-16 rounded-2xl bg-nutrio-mint hover:bg-nutrio-mint/90 text-white shadow-lg shadow-nutrio-mint/20 -mt-8 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                <Plus className="w-10 h-10" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-none">
              <Tabs defaultValue="camera" className="w-full">
                <TabsList className="w-full grid grid-cols-2 rounded-none h-14 bg-slate-50 border-b">
                  <TabsTrigger value="camera" className="data-[state=active]:bg-white rounded-none border-r"><Camera className="w-4 h-4 mr-2" /> Foto</TabsTrigger>
                  <TabsTrigger value="manual" className="data-[state=active]:bg-white rounded-none"><Pencil className="w-4 h-4 mr-2" /> Manuale</TabsTrigger>
                </TabsList>
                
                <div className="p-6">
                  <TabsContent value="camera" className="mt-0">
                    <div className="space-y-6 text-center">
                      <div className="w-24 h-24 bg-nutrio-mint/10 rounded-full flex items-center justify-center mx-auto">
                        <Camera className="w-10 h-10 text-nutrio-mint" />
                      </div>
                      <div className="space-y-2">
                        <DialogTitle className="text-xl font-bold">Scatta una Foto</DialogTitle>
                        <p className="text-sm text-slate-500">Lascia che la nostra IA calcoli i nutrienti dal tuo piatto.</p>
                      </div>
                      <Label htmlFor="image-upload" className="block">
                        <div className="w-full h-14 bg-nutrio-mint text-white rounded-xl flex items-center justify-center font-semibold cursor-pointer hover:bg-nutrio-mint/90 transition-colors shadow-md">
                          {isAnalyzing ? "Analisi in corso..." : "Scegli Foto / Scatta"}
                        </div>
                        <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                      </Label>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="manual" className="mt-0">
                    <div className="space-y-6">
                      <div className="space-y-2 text-center">
                        <DialogTitle className="text-xl font-bold">Inserimento Manuale</DialogTitle>
                        <p className="text-sm text-slate-500">Scrivi cosa hai mangiato (es. "Mela 100g")</p>
                      </div>
                      <div className="space-y-4">
                        <Input 
                          placeholder="Cosa hai mangiato?" 
                          className="h-14 rounded-xl text-lg px-4 border-slate-200"
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                        />
                        <Button 
                          className="w-full h-14 rounded-xl bg-nutrio-mint hover:bg-nutrio-mint/90 text-white font-semibold text-lg"
                          onClick={handleManualEntry}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? "Recupero dati..." : "Aggiungi Pasto"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" className="text-slate-400 h-10 w-10">
            <Info className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MacroCard({ label, value, color, bgColor }: { label: string, value: number, color: string, bgColor: string }) {
  return (
    <Card className={cn("border-none nutrio-shadow", bgColor)}>
      <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
        <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color }}>{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}g</span>
      </CardContent>
    </Card>
  );
}
