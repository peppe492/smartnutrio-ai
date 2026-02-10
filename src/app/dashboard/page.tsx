"use client";

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
} from 'recharts';
import { 
  Plus, Camera, Pencil, Calendar as CalendarIcon, 
  ChefHat, History, LayoutGrid, BarChart2, Utensils, 
  Settings, Bell, Dumbbell, Droplets, Sparkles, MoreHorizontal
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
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { analyzeFoodImage } from '@/ai/flows/analyze-food-image';
import { manualEntryAiAssistance } from '@/ai/flows/manual-entry-ai-assistance';

interface Meal {
  id: string;
  name: string;
  description: string;
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
  const [meals, setMeals] = useState<Meal[]>([
    {
      id: '1',
      name: 'Avocado & Egg Toast',
      description: '2 fette, 1 Avocado, 1 Uovo',
      calories: 450,
      macros: { protein: 18, carbs: 24, fat: 12 },
      time: '08:30',
      image: 'https://picsum.photos/seed/toast/100/100'
    },
    {
      id: '2',
      name: 'Grilled Chicken Salad',
      description: 'Insalata mediterranea, Olio d\'oliva',
      calories: 630,
      macros: { protein: 42, carbs: 12, fat: 18 },
      time: '13:15',
      image: 'https://picsum.photos/seed/salad/100/100'
    }
  ]);
  const [dailyGoal, setDailyGoal] = useState(2500);
  const [waterIntake, setWaterIntake] = useState(1.2);
  const waterGoal = 2.5;
  
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

  const caloriesLeft = Math.max(0, dailyGoal - totals.calories);

  const chartData = [
    { name: 'Consumate', value: totals.calories },
    { name: 'Rimanenti', value: caloriesLeft }
  ];

  const handleManualEntry = async () => {
    if (!manualInput) return;
    setIsAnalyzing(true);
    try {
      const result = await manualEntryAiAssistance({ foodEntry: manualInput });
      const newMeal: Meal = {
        id: Math.random().toString(36).substr(2, 9),
        name: result.food_name,
        description: result.description || 'Pasto aggiunto manualmente',
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
          description: result.description,
          calories: result.calories,
          macros: {
            protein: result.macros.protein_g,
            carbs: result.macros.carbs_g,
            fat: result.macros.fat_g,
          },
          time: format(new Date(), 'HH:mm'),
          image: base64String
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
    <div className="flex min-h-screen bg-[#F7F8FA]">
      {/* Sidebar Sinistra */}
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-8 px-6 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-nutrio-mint rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
            <Utensils className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">SmartNutrio<span className="text-nutrio-mint">.</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarLink icon={<LayoutGrid size={20} />} label="Dashboard" active />
          <SidebarLink icon={<History size={20} />} label="Meal History" />
          <SidebarLink icon={<BarChart2 size={20} />} label="Analytics" />
          <SidebarLink icon={<Utensils size={20} />} label="Recipe AI" />
        </nav>

        <div className="space-y-4 pt-8 border-t">
          <SidebarLink icon={<Settings size={20} />} label="Settings" />
          <div className="bg-[#F8FAFC] rounded-2xl p-3 flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src="https://picsum.photos/seed/alex/100/100" />
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900">Alex Morgan</span>
              <span className="text-[10px] text-slate-400 font-medium">Pro Member</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 lg:mr-80 p-6 lg:p-10">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Buongiorno, Alex 👋</h1>
            <p className="text-slate-400 font-medium text-sm">{format(date, 'EEEE, d MMMM', { locale: it })}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full h-11 w-11 bg-white border-none shadow-sm">
              <Bell size={20} className="text-slate-600" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-2xl h-11 px-4 bg-white border-none shadow-sm gap-2 font-semibold">
                  <CalendarIcon size={18} className="text-nutrio-mint" />
                  Oggi
                  <span className="ml-1 opacity-20">▼</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} locale={it} />
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 mb-12">
          {/* Calorie Gauge Card */}
          <Card className="xl:col-span-2 border-none rounded-[32px] bg-white nutrio-shadow overflow-hidden p-8 flex flex-col items-center">
            <div className="relative w-full aspect-square max-w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius="85%"
                    outerRadius="100%"
                    startAngle={220}
                    endAngle={-40}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={40}
                  >
                    <Cell fill="#4ADE80" />
                    <Cell fill="#F1F5F9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center -mt-4">
                <span className="text-4xl font-extrabold text-slate-900">{caloriesLeft.toLocaleString()}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Left to Goal</span>
              </div>
            </div>
            <div className="flex justify-between w-full mt-4 px-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Consumed</span>
                <span className="text-lg font-bold text-slate-900">{totals.calories} <span className="text-[10px] text-slate-400 font-medium">kcal</span></span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Daily Goal</span>
                <span className="text-lg font-bold text-slate-900">{dailyGoal} <span className="text-[10px] text-slate-400 font-medium">kcal</span></span>
              </div>
            </div>
          </Card>

          {/* Macros Card Column */}
          <div className="xl:col-span-3 flex flex-col gap-6">
            <MacroRow 
              icon={<Dumbbell className="text-blue-500" size={18} />} 
              label="Protein" 
              current={totals.protein} 
              goal={150} 
              color="bg-blue-500" 
              bgColor="bg-blue-50"
            />
            <MacroRow 
              icon={<Utensils className="text-yellow-500" size={18} />} 
              label="Carbohydrates" 
              current={totals.carbs} 
              goal={300} 
              color="bg-yellow-500" 
              bgColor="bg-yellow-50"
            />
            <MacroRow 
              icon={<Droplets className="text-purple-500" size={18} />} 
              label="Healthy Fats" 
              current={totals.fat} 
              goal={80} 
              color="bg-purple-500" 
              bgColor="bg-purple-50"
            />
          </div>
        </div>

        {/* Daily Meals Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Daily Meals</h2>
            <Button variant="ghost" className="text-nutrio-mint font-bold hover:bg-nutrio-mint/10">View All <span className="ml-1">›</span></Button>
          </div>

          <div className="space-y-6">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}

            <Card className="border-none bg-transparent shadow-none border-2 border-dashed border-slate-200 rounded-[28px] p-8 flex flex-col items-center justify-center group relative overflow-hidden">
              <div className="bg-white/50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Utensils className="text-slate-300" size={24} />
              </div>
              <p className="text-slate-400 font-bold text-sm mb-2">No dinner logged yet</p>
              <p className="text-slate-300 text-xs font-medium">Target for today: 2,500 kcal</p>
              
              <div className="mt-6">
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-2xl bg-nutrio-mint hover:bg-nutrio-mint/90 text-white font-bold h-12 px-8 shadow-lg shadow-nutrio-mint/20 gap-2">
                      <Plus size={20} />
                      ADD NEW MEAL
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none bg-white">
                    <Tabs defaultValue="camera" className="w-full">
                      <TabsList className="w-full grid grid-cols-2 h-14 bg-slate-50 border-b">
                        <TabsTrigger value="camera" className="data-[state=active]:bg-white"><Camera size={18} className="mr-2" /> Foto</TabsTrigger>
                        <TabsTrigger value="manual" className="data-[state=active]:bg-white"><Pencil size={18} className="mr-2" /> Manuale</TabsTrigger>
                      </TabsList>
                      <div className="p-8">
                        <TabsContent value="camera" className="m-0">
                          <div className="space-y-6 text-center">
                            <div className="w-20 h-20 bg-nutrio-mint/10 rounded-full flex items-center justify-center mx-auto">
                              <Camera className="w-8 h-8 text-nutrio-mint" />
                            </div>
                            <DialogTitle className="text-2xl font-bold">Scatta una Foto</DialogTitle>
                            <Label htmlFor="image-upload" className="block">
                              <div className="w-full h-14 bg-nutrio-mint text-white rounded-2xl flex items-center justify-center font-bold cursor-pointer hover:bg-nutrio-mint/90 shadow-md">
                                {isAnalyzing ? "Analisi..." : "Scegli Foto"}
                              </div>
                              <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                            </Label>
                          </div>
                        </TabsContent>
                        <TabsContent value="manual" className="m-0">
                          <div className="space-y-6">
                            <DialogTitle className="text-2xl font-bold text-center">Inserimento Manuale</DialogTitle>
                            <Input placeholder="Es: Pizza Margherita" className="h-14 rounded-2xl border-slate-200" value={manualInput} onChange={(e) => setManualInput(e.target.value)} />
                            <Button className="w-full h-14 rounded-2xl bg-nutrio-mint hover:bg-nutrio-mint/90 text-white font-bold shadow-md" onClick={handleManualEntry} disabled={isAnalyzing}>
                              {isAnalyzing ? "Recupero..." : "Aggiungi"}
                            </Button>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* Sidebar Destra */}
      <aside className="w-80 bg-white/50 border-l hidden 2xl:flex flex-col py-10 px-8 fixed right-0 h-full overflow-y-auto">
        <section className="mb-10">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Insights AI</h3>
          <Card className="border-none rounded-[28px] bg-[#E8FFF1] p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 text-nutrio-mint mb-4">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Smart Advice</span>
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Hai raggiunto il <span className="text-nutrio-mint font-bold">56% del tuo obiettivo proteico</span> per oggi. Prova ad aggiungere uno yogurt greco a cena per un finale equilibrato!
            </p>
          </Card>
        </section>

        <section className="mb-10">
          <h3 className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mb-4">Water Intake</h3>
          <div className="bg-white rounded-[24px] p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <Droplets size={20} className="text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{waterIntake}L</span>
                <span className="text-[10px] text-slate-400 font-medium">OF {waterGoal}L GOAL</span>
              </div>
            </div>
            <Button size="icon" className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600" onClick={() => setWaterIntake(prev => Math.min(waterGoal, prev + 0.25))}>
              <Plus size={16} />
            </Button>
          </div>
        </section>

        <div className="mt-auto">
          <Card className="bg-[#0F172A] rounded-[32px] p-8 text-white relative overflow-hidden border-none">
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-2">SmartNutrio Pro</h4>
              <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                Sblocca l'analisi dettagliata dei nutrienti e il logging fotografico illimitato.
              </p>
              <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-2xl h-12">
                Upgrade Now
              </Button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-nutrio-mint/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </Card>
        </div>
      </aside>
    </div>
  );
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm",
      active ? "sidebar-active text-nutrio-mint" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
    )}>
      <span className={active ? "text-nutrio-mint" : "text-slate-400"}>{icon}</span>
      {label}
    </button>
  );
}

function MacroRow({ icon, label, current, goal, color, bgColor }: { icon: React.ReactNode, label: string, current: number, goal: number, color: string, bgColor: string }) {
  const progress = Math.min(100, (current / goal) * 100);
  return (
    <div className="bg-white rounded-[28px] p-6 flex items-center gap-6 nutrio-shadow">
      <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0", bgColor)}>
        {icon}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-slate-900">{label}</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{Math.round(current)}g / {goal}g</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  return (
    <Card className="border-none rounded-[28px] bg-white meal-card-shadow overflow-hidden p-5 flex items-center gap-5 group hover:scale-[1.01] transition-transform">
      <div className="relative w-20 h-20 shrink-0">
        <img src={meal.image} alt={meal.name} className="w-full h-full object-cover rounded-2xl" />
        <div className="absolute -top-2 -left-2 bg-nutrio-mint text-white text-[9px] font-extrabold px-2 py-1 rounded-full border-2 border-white shadow-sm">
          {meal.time}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 truncate">{meal.name}</h3>
        <p className="text-[11px] text-slate-400 font-medium truncate mb-2">{meal.description}</p>
        <div className="flex flex-wrap gap-2">
          <MacroBadge label="P" value={meal.macros.protein} color="text-blue-500 bg-blue-50" />
          <MacroBadge label="C" value={meal.macros.carbs} color="text-yellow-500 bg-yellow-50" />
          <MacroBadge label="F" value={meal.macros.fat} color="text-purple-500 bg-purple-50" />
        </div>
      </div>
      <div className="text-right flex items-center gap-4">
        <div>
          <div className="font-bold text-lg text-slate-900 leading-none">{meal.calories}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kcal</div>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-300">
          <MoreHorizontal size={20} />
        </Button>
      </div>
    </Card>
  );
}

function MacroBadge({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0", color)}>
      {value}g {label}
    </span>
  );
}