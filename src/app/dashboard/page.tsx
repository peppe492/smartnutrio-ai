
"use client";

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Plus, Camera, Pencil, Calendar as CalendarIcon, 
  History, LayoutGrid, BarChart2, Utensils, 
  Settings, Bell, Dumbbell, Droplets, Sparkles, Trash2, Check, Zap, Scale, ArrowRight, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { analyzeFoodImage } from '@/ai/flows/analyze-food-image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface Ingredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface SelectedIngredient extends Ingredient {
  amount: number;
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
  timestamp: string;
  type: string;
  image?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  
  const [date, setDate] = useState<Date | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [mealType, setMealType] = useState('pranzo');
  
  useEffect(() => {
    setDate(new Date());
  }, []);

  const ingredientsQuery = useMemo(() => user && db ? collection(db, 'users', user.uid, 'ingredients') : null, [db, user]);
  const mealsQuery = useMemo(() => user && db ? collection(db, 'users', user.uid, 'meals') : null, [db, user]);
  const userProfileQuery = useMemo(() => user && db ? doc(db, 'users', user.uid) : null, [db, user]);

  const { data: allowedIngredients = [] } = useCollection(ingredientsQuery);
  const { data: allMeals = [] } = useCollection(mealsQuery);
  const { data: userProfile, loading: profileLoading } = useDoc(userProfileQuery);

  useEffect(() => {
    if (!authLoading && !profileLoading && user && !userProfile) {
      router.push('/onboarding');
    }
  }, [user, userProfile, authLoading, profileLoading, router]);

  const dailyGoal = userProfile?.tdeeGoal || 2000;
  
  const meals = useMemo(() => {
    if (!date) return [];
    return allMeals.filter((m: any) => format(new Date(m.timestamp), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
  }, [allMeals, date]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const totals = useMemo(() => {
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + (meal.macros?.protein || 0),
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0)
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
      macros: { protein_g: totalProtein, carbs_g: totalCarbs, fat_g: totalFat },
      type: mealType,
      image: 'https://picsum.photos/seed/builder/800/600'
    };

    sessionStorage.setItem('last_meal_analysis', JSON.stringify(analysisResult));
    router.push('/analysis');
  };

  const toggleIngredientSelection = (ing: any) => {
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
        const analysisResult = { ...result, image: base64String, type: mealType };
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

  const handleDeleteMeal = async (id: string) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'users', user.uid, 'meals', id));
  };

  const handleEditMeal = (meal: Meal) => {
    setEditingMeal({ ...meal });
    setIsEditModalOpen(true);
  };

  const saveEditedMeal = async () => {
    if (!editingMeal || !user || !db) return;
    const mealRef = doc(db, 'users', user.uid, 'meals', editingMeal.id);
    await updateDoc(mealRef, {
      name: editingMeal.name,
      calories: editingMeal.calories,
      macros: editingMeal.macros
    });
    setIsEditModalOpen(false);
    setEditingMeal(null);
  };

  if (authLoading || profileLoading || !date) return <div className="p-20 text-center"><Zap className="animate-spin inline mr-2 text-primary" /> Caricamento profilo...</div>;
  if (!user) return <div className="p-20 text-center">Effettua il login per accedere.</div>;

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
          <Link href="/dashboard" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm sidebar-active text-primary">
            <LayoutGrid size={20} /> Dashboard
          </Link>
          <Link href="/history" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <History size={20} /> Cronologia
          </Link>
          <Link href="/profile" className="w-full flex items-center gap-4 py-4 px-3 rounded-2xl transition-all font-semibold text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <User size={20} /> Profilo
          </Link>
        </nav>
        <div className="space-y-4 pt-8 border-t">
          <Link href="/profile" className="bg-[#F8FAFC] rounded-2xl p-3 flex items-center gap-3 hover:bg-slate-100 transition-colors">
            <Avatar className="w-10 h-10"><AvatarImage src={user.photoURL || undefined} /><AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback></Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 truncate w-32">{user.displayName || 'Utente'}</span>
              <span className="text-[10px] text-slate-400 font-medium">Membro Pro</span>
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 lg:mr-80 p-6 lg:p-10">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Buongiorno, {user.displayName?.split(' ')[0]} 👋</h1>
            <p className="text-slate-400 font-medium text-sm">{format(date, 'EEEE, d MMMM', { locale: it })}</p>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-2xl h-11 px-4 bg-white border-none shadow-sm gap-2 font-semibold">
                  <CalendarIcon size={18} className="text-primary" /> Oggi
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} locale={it} />
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 mb-12">
          <Card className="xl:col-span-2 border-none rounded-[32px] bg-white nutrio-shadow p-8 flex flex-col items-center">
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
                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Consumate</span>
                <span className="text-lg font-bold text-slate-900">{totals.calories}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Obiettivo</span>
                <span className="text-lg font-bold text-slate-900">{dailyGoal}</span>
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
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 shadow-lg shadow-primary/20 gap-2">
                  <Plus size={20} /> AGGIUNGI
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl rounded-[32px] p-0 overflow-hidden border-none bg-white">
                <Tabs defaultValue="camera" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 h-14 bg-slate-50 border-b">
                    <TabsTrigger value="camera" className="data-[state=active]:bg-white"><Camera size={18} className="mr-2" /> Foto IA</TabsTrigger>
                    <TabsTrigger value="manual" className="data-[state=active]:bg-white"><Utensils size={18} className="mr-2" /> Dispensa</TabsTrigger>
                  </TabsList>
                  <div className="p-8">
                    <div className="mb-6">
                      <Label>Tipo di pasto</Label>
                      <Select value={mealType} onValueChange={setMealType}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="colazione">Colazione</SelectItem>
                          <SelectItem value="pranzo">Pranzo</SelectItem>
                          <SelectItem value="cena">Cena</SelectItem>
                          <SelectItem value="spuntino">Spuntino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <TabsContent value="camera" className="m-0 text-center">
                      <Camera className="w-12 h-12 text-primary mx-auto mb-4" />
                      <Label htmlFor="image-upload" className="block">
                        <div className="w-full h-14 bg-primary text-white rounded-2xl flex items-center justify-center font-bold cursor-pointer">{isAnalyzing ? "Analisi..." : "Scegli Foto"}</div>
                        <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                      </Label>
                    </TabsContent>
                    <TabsContent value="manual" className="m-0">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                          {allowedIngredients.map((ing: any) => {
                            const selected = selectedIngredients.find(si => si.id === ing.id);
                            return (
                              <div 
                                key={ing.id} 
                                onClick={() => toggleIngredientSelection(ing)} 
                                className={cn(
                                  "p-4 rounded-2xl border-2 cursor-pointer transition-all", 
                                  selected ? "border-primary bg-primary/5" : "border-slate-100 bg-white hover:border-slate-200"
                                )}
                              >
                                <div className="flex justify-between items-start mb-1 font-bold text-sm">
                                  <span>{ing.name}</span>
                                  {selected && <Check size={16} className="text-primary" />}
                                </div>
                                <p className="text-[10px] text-slate-400">{ing.calories} kcal/100g</p>
                                {selected && (
                                  <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <Input 
                                      type="number" 
                                      value={selected.amount} 
                                      onChange={e => updateAmount(ing.id, Number(e.target.value))} 
                                      className="h-8 w-20 text-xs" 
                                    />
                                    <span className="text-[10px] font-bold">g</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <Button className="w-full h-14 bg-primary text-white font-bold" onClick={handleBuildMeal} disabled={selectedIngredients.length === 0}>CREA PASTO</Button>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-6">
            {meals.map((meal: any) => (
              <MealCard key={meal.id} meal={meal} onDelete={() => handleDeleteMeal(meal.id)} onEdit={() => handleEditMeal(meal)} />
            ))}
            {meals.length === 0 && <div className="text-center p-12 text-slate-400 font-medium bg-white/50 border-2 border-dashed rounded-[32px]">Nessun pasto registrato per oggi</div>}
          </div>
        </section>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="rounded-[32px] p-8 border-none bg-white">
            <DialogHeader><DialogTitle className="text-2xl font-bold">Modifica Pasto</DialogTitle></DialogHeader>
            {editingMeal && (
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={editingMeal.name} onChange={e => setEditingMeal({ ...editingMeal, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>kcal</Label><Input type="number" value={editingMeal.calories} onChange={e => setEditingMeal({ ...editingMeal, calories: Number(e.target.value) })} /></div>
                  <div className="space-y-2"><Label>Proteine (g)</Label><Input type="number" value={editingMeal.macros.protein} onChange={e => setEditingMeal({ ...editingMeal, macros: { ...editingMeal.macros, protein: Number(e.target.value) } })} /></div>
                </div>
              </div>
            )}
            <DialogFooter><Button onClick={saveEditedMeal} className="bg-primary text-white">Salva</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <aside className="w-80 bg-white/50 border-l hidden 2xl:flex flex-col py-10 px-8 fixed right-0 h-full overflow-y-auto">
        <h3 className="text-xl font-bold mb-6">Insights IA</h3>
        
        <Card className="border-none rounded-[28px] bg-[#E8FFF1] p-6 mb-10">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Sparkles size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Consiglio Smart</span>
          </div>
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            Hai raggiunto il <span className="text-primary font-bold">{Math.round((totals.protein/150)*100)}%</span> dell'obiettivo proteico. Ottimo lavoro!
          </p>
        </Card>

        <div className="mb-10">
          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Idratazione</h4>
          <div className="bg-white rounded-[28px] p-6 nutrio-shadow flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                <Droplets size={20} />
              </div>
              <div>
                <div className="font-bold">1.2L</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Obiettivo: 2L</div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 h-10 w-10">
              <Plus size={20} />
            </Button>
          </div>
        </div>

        <Card className="border-none rounded-[32px] bg-slate-900 p-8 text-white mt-auto">
          <h4 className="text-lg font-bold mb-2">Passa a Pro 🚀</h4>
          <p className="text-xs text-slate-400 mb-6">Analisi avanzate e piani personalizzati illimitati.</p>
          <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl h-12">SCOPRI DI PIÙ</Button>
        </Card>
      </aside>
    </div>
  );
}

function MacroRow({ icon, label, current, goal, color, bgColor }: any) {
  const progress = Math.min(100, (current / goal) * 100);
  return (
    <div className="bg-white rounded-[28px] p-6 flex items-center gap-6 nutrio-shadow">
      <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0", bgColor)}>{icon}</div>
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-slate-700">{label}</span>
          <span className="text-xs font-bold text-slate-400">{Math.round(current)}g / {goal}g</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}

function MealCard({ meal, onDelete, onEdit }: any) {
  return (
    <Card className="border-none rounded-[28px] bg-white nutrio-shadow overflow-hidden p-5 flex items-center gap-5 group transition-all hover:scale-[1.01]">
      <div className="relative w-20 h-20 shrink-0">
        <img src={meal.image || 'https://picsum.photos/seed/food/100/100'} alt={meal.name} className="w-full h-full object-cover rounded-2xl" />
        <div className="absolute -top-2 -left-2 bg-primary text-white text-[9px] font-extrabold px-2 py-1 rounded-full border-2 border-white uppercase">{meal.type}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-slate-900 truncate">{meal.name}</h3>
          <span className="text-[10px] text-slate-400 font-medium">Pasto registrato</span>
        </div>
        <p className="text-[11px] text-slate-400 truncate mb-3">{meal.description}</p>
        <div className="flex gap-2">
          <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-500">{meal.macros?.protein || 0}g P</span>
          <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-500">{meal.macros?.carbs || 0}g C</span>
          <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-500">{meal.macros?.fat || 0}g G</span>
        </div>
      </div>
      <div className="text-right flex items-center gap-4">
        <div>
          <div className="font-black text-xl text-slate-900">{meal.calories}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Kcal</div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full" onClick={onEdit}>
            <Pencil size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full" onClick={onDelete}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
