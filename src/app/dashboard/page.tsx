
"use client";

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
} from 'recharts';
import { 
  Plus, Camera, Pencil, Calendar as CalendarIcon, 
  History, LayoutGrid, BarChart2, Utensils, 
  Settings, Bell, Dumbbell, Droplets, Sparkles, Trash2, Check, Zap, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { analyzeFoodImage } from '@/ai/flows/analyze-food-image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Ingredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface SelectedIngredient extends Ingredient {
  amount: number; // in grams
}

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
  const router = useRouter();
  const [date, setDate] = useState<Date>(new Date());
  const [allowedIngredients, setAllowedIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  
  const [meals, setMeals] = useState<Meal[]>([
    {
      id: '1',
      name: 'Avocado & Egg Toast',
      description: '2 fette, 1 Avocado, 1 Uovo',
      calories: 450,
      macros: { protein: 18, carbs: 24, fat: 12 },
      time: '08:30',
      image: 'https://picsum.photos/seed/toast/100/100'
    }
  ]);

  const [dailyGoal, setDailyGoal] = useState(2500);
  const [waterIntake, setWaterIntake] = useState(1.2);
  const waterGoal = 2.5;
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedIngredients = localStorage.getItem('nutrio_allowed_ingredients');
    if (savedIngredients) {
      setAllowedIngredients(JSON.parse(savedIngredients));
    }
    const savedGoal = localStorage.getItem('nutrio_tdee_goal');
    if (savedGoal) {
      setDailyGoal(Number(savedGoal));
    }
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

  const handleBuildMeal = () => {
    if (selectedIngredients.length === 0) return;
    
    const mealName = selectedIngredients.map(i => i.name).join(' & ');
    const totalCalories = Math.round(selectedIngredients.reduce((acc, i) => acc + (i.calories * i.amount / 100), 0));
    const totalProtein = Math.round(selectedIngredients.reduce((acc, i) => acc + (i.protein * i.amount / 100), 0));
    const totalCarbs = Math.round(selectedIngredients.reduce((acc, i) => acc + (i.carbs * i.amount / 100), 0));
    const totalFat = Math.round(selectedIngredients.reduce((acc, i) => acc + (i.fat * i.amount / 100), 0));

    const analysisResult = {
      food_name: mealName,
      description: `Composto da: ${selectedIngredients.map(i => `${i.amount}g ${i.name}`).join(', ')}`,
      calories: totalCalories,
      macros: {
        protein_g: totalProtein,
        carbs_g: totalCarbs,
        fat_g: totalFat
      },
      image: 'https://picsum.photos/seed/builder/800/600'
    };

    sessionStorage.setItem('last_meal_analysis', JSON.stringify(analysisResult));
    router.push('/analysis');
  };

  const toggleIngredientSelection = (ing: Ingredient) => {
    const exists = selectedIngredients.find(si => si.id === ing.id);
    if (exists) {
      setSelectedIngredients(selectedIngredients.filter(si => si.id !== ing.id));
    } else {
      setSelectedIngredients([...selectedIngredients, { ...ing, amount: 100 }]);
    }
  };

  const updateAmount = (id: string, amount: number) => {
    setSelectedIngredients(selectedIngredients.map(si => si.id === id ? { ...si, amount } : si));
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
        const analysisResult = { ...result, image: base64String };
        sessionStorage.setItem('last_meal_analysis', JSON.stringify(analysisResult));
        router.push('/analysis');
      } catch (error) {
        console.error(error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal({ ...meal });
    setIsEditModalOpen(true);
  };

  const saveEditedMeal = () => {
    if (!editingMeal) return;
    setMeals(meals.map(m => m.id === editingMeal.id ? editingMeal : m));
    setIsEditModalOpen(false);
    setEditingMeal(null);
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col py-8 px-6 fixed h-full z-40">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-nutrio-mint rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">SmartNutrio<span className="text-nutrio-mint">.</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm sidebar-active text-nutrio-mint">
            <LayoutGrid size={20} />
            Dashboard
          </Link>
          <Link href="/history" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <History size={20} />
            Cronologia
          </Link>
          <Link href="/dashboard" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <BarChart2 size={20} />
            Analisi
          </Link>
          <Link href="/dashboard" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <Utensils size={20} />
            Ricette AI
          </Link>
        </nav>

        <div className="space-y-4 pt-8 border-t">
          <Link href="/dashboard" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <Settings size={20} />
            Impostazioni
          </Link>
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
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rimanenti</span>
              </div>
            </div>
            <div className="flex justify-between w-full mt-4 px-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Consumate</span>
                <span className="text-lg font-bold text-slate-900">{totals.calories} <span className="text-[10px] text-slate-400 font-medium">kcal</span></span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Obiettivo</span>
                <span className="text-lg font-bold text-slate-900">{dailyGoal} <span className="text-[10px] text-slate-400 font-medium">kcal</span></span>
              </div>
            </div>
          </Card>

          <div className="xl:col-span-3 flex flex-col gap-6">
            <MacroRow icon={<Dumbbell className="text-blue-500" size={18} />} label="Proteine" current={totals.protein} goal={150} color="bg-blue-500" bgColor="bg-blue-50" />
            <MacroRow icon={<Utensils className="text-yellow-500" size={18} />} label="Carboidrati" current={totals.carbs} goal={300} color="bg-yellow-500" bgColor="bg-yellow-50" />
            <MacroRow icon={<Droplets className="text-purple-500" size={18} />} label="Grassi" current={totals.fat} goal={80} color="bg-purple-500" bgColor="bg-purple-50" />
          </div>
        </div>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Pasti di Oggi</h2>
            <Button variant="ghost" className="text-nutrio-mint font-bold hover:bg-nutrio-mint/10">Vedi Tutti <span className="ml-1">›</span></Button>
          </div>

          <div className="space-y-6">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={() => handleDeleteMeal(meal.id)} onEdit={() => handleEditMeal(meal)} />
            ))}

            <Card className="border-none bg-transparent shadow-none border-2 border-dashed border-slate-200 rounded-[28px] p-8 flex flex-col items-center justify-center group relative overflow-hidden">
              <div className="bg-white/50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Utensils className="text-slate-300" size={24} />
              </div>
              <p className="text-slate-400 font-bold text-sm mb-2">Nessun pasto registrato per stasera</p>
              
              <div className="mt-6">
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-2xl bg-nutrio-mint hover:bg-nutrio-mint/90 text-white font-bold h-12 px-8 shadow-lg shadow-nutrio-mint/20 gap-2">
                      <Plus size={20} />
                      AGGIUNGI PASTO
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl rounded-[32px] p-0 overflow-hidden border-none bg-white">
                    <Tabs defaultValue="camera" className="w-full">
                      <TabsList className="w-full grid grid-cols-2 h-14 bg-slate-50 border-b">
                        <TabsTrigger value="camera" className="data-[state=active]:bg-white"><Camera size={18} className="mr-2" /> Foto AI</TabsTrigger>
                        <TabsTrigger value="manual" className="data-[state=active]:bg-white"><Utensils size={18} className="mr-2" /> Dispensa</TabsTrigger>
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
                            <DialogTitle className="text-2xl font-bold">Crea Pasto dalla Dispensa</DialogTitle>
                            <p className="text-sm text-slate-400">Seleziona gli ingredienti consentiti e imposta la quantità.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                              {allowedIngredients.map((ing) => {
                                const selected = selectedIngredients.find(si => si.id === ing.id);
                                return (
                                  <div key={ing.id} className={cn(
                                    "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                    selected ? "border-nutrio-mint bg-nutrio-mint/5" : "border-slate-100 bg-white"
                                  )} onClick={() => toggleIngredientSelection(ing)}>
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="font-bold text-sm text-slate-900">{ing.name}</span>
                                      {selected && <Check size={16} className="text-nutrio-mint" />}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-3">{ing.calories} kcal/100g</p>
                                    
                                    {selected && (
                                      <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                        <Scale size={14} className="text-slate-400" />
                                        <Input 
                                          type="number" 
                                          value={selected.amount} 
                                          onChange={(e) => updateAmount(ing.id, Number(e.target.value))}
                                          className="h-8 rounded-lg text-xs w-20"
                                        />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Grammi</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {selectedIngredients.length > 0 && (
                              <div className="bg-slate-50 p-4 rounded-2xl">
                                <div className="flex justify-between items-center text-sm font-bold mb-1">
                                  <span>Totale Calorie:</span>
                                  <span className="text-nutrio-mint">
                                    {Math.round(selectedIngredients.reduce((acc, i) => acc + (i.calories * i.amount / 100), 0))} kcal
                                  </span>
                                </div>
                              </div>
                            )}

                            <Button 
                              className="w-full h-14 rounded-2xl bg-nutrio-mint hover:bg-nutrio-mint/90 text-white font-bold shadow-md" 
                              onClick={handleBuildMeal}
                              disabled={selectedIngredients.length === 0}
                            >
                              CREA PASTO ({selectedIngredients.length} ingredienti)
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

        {/* Edit Meal Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md rounded-[32px] p-8 border-none bg-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Modifica Pasto</DialogTitle>
            </DialogHeader>
            {editingMeal && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input id="edit-name" value={editingMeal.name} onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-cal">Calorie (kcal)</Label>
                    <Input id="edit-cal" type="number" value={editingMeal.calories} onChange={(e) => setEditingMeal({ ...editingMeal, calories: Number(e.target.value) })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-prot">Proteine (g)</Label>
                    <Input id="edit-prot" type="number" value={editingMeal.macros.protein} onChange={(e) => setEditingMeal({ ...editingMeal, macros: { ...editingMeal.macros, protein: Number(e.target.value) } })} className="rounded-xl" />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl">Annulla</Button>
              <Button onClick={saveEditedMeal} className="rounded-xl bg-nutrio-mint hover:bg-nutrio-mint/90 text-white">Salva Modifiche</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <aside className="w-80 bg-white/50 border-l hidden 2xl:flex flex-col py-10 px-8 fixed right-0 h-full overflow-y-auto">
        <section className="mb-10">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Insights IA</h3>
          <Card className="border-none rounded-[28px] bg-[#E8FFF1] p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 text-nutrio-mint mb-4">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Consiglio Smart</span>
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Hai raggiunto il <span className="text-nutrio-mint font-bold">56% del tuo obiettivo proteico</span> per oggi. Prova ad aggiungere uno yogurt greco a cena!
            </p>
          </Card>
        </section>

        <section className="mb-10">
          <h3 className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mb-4">Assunzione Acqua</h3>
          <div className="bg-white rounded-[24px] p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                <Droplets size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{waterIntake}L</span>
                <span className="text-[10px] text-slate-400 font-medium">DI {waterGoal}L</span>
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
              <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">Sblocca l'analisi dettagliata dei nutrienti e il logging fotografico illimitato.</p>
              <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-2xl h-12">Passa a Pro</Button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-nutrio-mint/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </Card>
        </div>
      </aside>
    </div>
  );
}

function MacroRow({ icon, label, current, goal, color, bgColor }: { icon: React.ReactNode, label: string, current: number, goal: number, color: string, bgColor: string }) {
  const progress = Math.min(100, (current / goal) * 100);
  return (
    <div className="bg-white rounded-[28px] p-6 flex items-center gap-6 nutrio-shadow">
      <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0", bgColor)}>{icon}</div>
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

function MealCard({ meal, onDelete, onEdit }: { meal: Meal, onDelete: () => void, onEdit: () => void }) {
  return (
    <Card className="border-none rounded-[28px] bg-white meal-card-shadow overflow-hidden p-5 flex items-center gap-5 group hover:scale-[1.01] transition-transform">
      <div className="relative w-20 h-20 shrink-0">
        <img src={meal.image || 'https://picsum.photos/seed/food/100/100'} alt={meal.name} className="w-full h-full object-cover rounded-2xl" />
        <div className="absolute -top-2 -left-2 bg-nutrio-mint text-white text-[9px] font-extrabold px-2 py-1 rounded-full border-2 border-white shadow-sm">{meal.time}</div>
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
      <div className="text-right flex items-center gap-2">
        <div>
          <div className="font-bold text-lg text-slate-900 leading-none">{meal.calories}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kcal</div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-nutrio-mint" onClick={onEdit}><Pencil size={14} /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={onDelete}><Trash2 size={14} /></Button>
        </div>
      </div>
    </Card>
  );
}

function MacroBadge({ label, value, color }: { label: string, value: number, color: string }) {
  return <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0", color)}>{value}g {label}</span>;
}
