
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, differenceInDays, isAfter, startOfDay, isValid, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Plus, Camera, Pencil, Calendar as CalendarIcon, 
  History, LayoutGrid, Utensils, 
  Droplets, Sparkles, Trash2, Check, Zap, User, Loader2, Search, X, Clock, Menu, TrendingUp,
  Coffee, Sun, Moon, Apple
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { analyzeFoodImage } from '@/ai/flows/analyze-food-image';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [manualSearch, setManualSearch] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
  const [mealType, setMealType] = useState('pranzo');
  const [mealDate, setMealDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDate(new Date());
  }, []);

  const userProfileRef = useMemo(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userProfile, loading: profileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (mounted && !authLoading) {
      if (!user) {
        router.replace('/');
      } else if (!profileLoading && userProfile === null) {
        router.push('/onboarding');
      }
    }
  }, [user, userProfile, authLoading, profileLoading, router, mounted]);

  const mealsQuery = useMemo(() => {
    if (!user || !db) return null;
    return collection(db, 'users', user.uid, 'meals');
  }, [db, user]);

  const ingredientsQuery = useMemo(() => {
    if (!user || !db) return null;
    return collection(db, 'users', user.uid, 'ingredients');
  }, [db, user]);

  const { data: allMeals = [] } = useCollection(mealsQuery);
  const { data: allIngredients = [] } = useCollection(ingredientsQuery as any);

  const dailyGoal = userProfile?.tdeeGoal || 2000;
  
  const meals = useMemo(() => {
    if (!date || !allMeals || !isValid(date)) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return allMeals.filter((m: any) => {
      try {
        if (!m.timestamp) return false;
        const d = typeof m.timestamp === 'string' ? parseISO(m.timestamp) : new Date(m.timestamp);
        return isValid(d) && format(d, 'yyyy-MM-dd') === dateStr;
      } catch (e) {
        return false;
      }
    });
  }, [allMeals, date]);

  const totals = useMemo(() => {
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.macros?.protein || 0),
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  const dietProgress = useMemo(() => {
    if (!userProfile?.dietStartDate || !userProfile?.dietEndDate) return null;
    const start = new Date(userProfile.dietStartDate);
    const end = new Date(userProfile.dietEndDate);
    if (!isValid(start) || !isValid(end)) return null;
    
    const today = startOfDay(new Date());

    const totalDays = Math.max(1, differenceInDays(end, start));
    const elapsedDays = Math.max(0, differenceInDays(today, start));
    const remainingDays = Math.max(0, differenceInDays(end, today));
    const percent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    return { 
      totalDays, 
      elapsedDays, 
      daysRemaining: remainingDays, 
      percent, 
      isFinished: isAfter(today, end) 
    };
  }, [userProfile]);

  const caloriesLeft = Math.max(0, dailyGoal - totals.calories);
  
  const mainChartData = useMemo(() => {
    if (dietProgress) {
      return [
        { name: 'Passati', value: dietProgress.elapsedDays },
        { name: 'Rimanenti', value: dietProgress.daysRemaining }
      ];
    }
    return [
      { name: 'Consumate', value: totals.calories },
      { name: 'Rimanenti', value: caloriesLeft }
    ];
  }, [dietProgress, totals.calories, caloriesLeft]);

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
        toast({ variant: "destructive", title: "Errore IA", description: "Impossibile analizzare l'immagine." });
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredPantry = useMemo(() => {
    return allIngredients.filter((ing: any) => 
      ing.name.toLowerCase().includes(manualSearch.toLowerCase())
    );
  }, [allIngredients, manualSearch]);

  const addIngredientToSelection = (ing: any) => {
    if (selectedIngredients.find(i => i.id === ing.id)) return;
    setSelectedIngredients([...selectedIngredients, { ...ing, grams: 100 }]);
  };

  const removeIngredientFromSelection = (id: string) => {
    setSelectedIngredients(selectedIngredients.filter(i => i.id !== id));
  };

  const updateGrams = (id: string, grams: number) => {
    setSelectedIngredients(selectedIngredients.map(i => i.id === id ? { ...i, grams } : i));
  };

  const manualMealTotals = useMemo(() => {
    return selectedIngredients.reduce((acc, ing) => {
      const ratio = ing.grams / 100;
      return {
        calories: acc.calories + (ing.calories * ratio),
        protein: acc.protein + (ing.protein * ratio),
        carbs: acc.carbs + (ing.carbs * ratio),
        fat: acc.fat + (ing.fat * ratio),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [selectedIngredients]);

  const saveManualMeal = () => {
    if (!user || !db || selectedIngredients.length === 0) return;
    setIsSaving(true);
    
    const mealName = selectedIngredients.length === 1 
      ? selectedIngredients[0].name 
      : `Pasto composto (${selectedIngredients.length} ingredienti)`;

    const mealData = {
      name: mealName,
      description: selectedIngredients.map(i => `${i.name} (${i.grams}g)`).join(', '),
      calories: Math.round(manualMealTotals.calories),
      macros: {
        protein: Math.round(manualMealTotals.protein),
        carbs: Math.round(manualMealTotals.carbs),
        fat: Math.round(manualMealTotals.fat),
      },
      timestamp: mealDate.toISOString(),
      type: mealType,
      ingredients: selectedIngredients.map(i => ({ id: i.id, grams: i.grams }))
    };

    const mealsCol = collection(db, 'users', user.uid, 'meals');
    addDoc(mealsCol, mealData)
      .then(() => {
        toast({ title: "Pasto registrato!", description: "Il pasto è stato aggiunto al tuo diario." });
        setIsAddModalOpen(false);
        setSelectedIngredients([]);
        setIsSaving(false);
      })
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: mealsCol.path,
          operation: 'create',
          requestResourceData: mealData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setIsSaving(false);
      });
  };

  if (!mounted || authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Caricamento dati...</p>
      </div>
    );
  }

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
          <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Buongiorno, {user?.displayName?.split(' ')[0]} 👋</h1>
              <p className="text-slate-400 font-medium text-sm">{date && isValid(date) ? format(date, 'EEEE, d MMMM', { locale: it }) : 'Caricamento...'}</p>
            </div>
            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="rounded-2xl h-11 px-4 bg-white border-none shadow-sm gap-2 font-semibold text-slate-600">
                    <CalendarIcon size={18} className="text-primary" /> Oggi
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={date || new Date()} onSelect={(d) => d && setDate(d)} locale={it} />
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
                      data={mainChartData} 
                      innerRadius="85%" 
                      outerRadius="100%" 
                      startAngle={220} 
                      endAngle={-40} 
                      paddingAngle={0} 
                      dataKey="value" 
                      stroke="none" 
                      cornerRadius={40}
                    >
                      <Cell fill={dietProgress ? "#3b82f6" : "#4ADE80"} />
                      <Cell fill="#F1F5F9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center -mt-4">
                  <span className="text-4xl font-extrabold text-slate-900">
                    {dietProgress ? dietProgress.daysRemaining : caloriesLeft.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {dietProgress ? 'Giorni alla fine' : 'Kcal Rimanenti'}
                  </span>
                  {dietProgress && (
                    <span className="text-[10px] font-bold text-slate-300 mt-2">
                      Giorno {dietProgress.elapsedDays} di {dietProgress.totalDays}
                    </span>
                  )}
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
              <MacroRow icon={<Zap className="text-blue-500" size={18} />} label="Proteine" current={totals.protein} goal={150} color="bg-blue-500" bgColor="bg-blue-50" />
              <MacroRow icon={<Utensils className="text-yellow-500" size={18} />} label="Carboidrati" current={totals.carbs} goal={300} color="bg-yellow-500" bgColor="bg-yellow-50" />
              <MacroRow icon={<Droplets className="text-purple-500" size={18} />} label="Grassi" current={totals.fat} goal={80} color="bg-purple-500" bgColor="bg-purple-50" />
            </div>
          </div>

          <section className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold text-slate-900">Pasti di Oggi</h2>
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 shadow-lg shadow-primary/20 gap-2 w-full sm:w-auto">
                    <Plus size={20} /> AGGIUNGI
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl rounded-[32px] p-0 overflow-hidden border-none bg-white">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Aggiungi Nuovo Pasto</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="camera" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 h-14 bg-slate-50 border-b rounded-none">
                      <TabsTrigger value="camera" className="data-[state=active]:bg-white rounded-none h-full"><Camera size={18} className="mr-2" /> Foto IA</TabsTrigger>
                      <TabsTrigger value="manual" className="data-[state=active]:bg-white rounded-none h-full"><Utensils size={18} className="mr-2" /> Dispensa Smart</TabsTrigger>
                    </TabsList>
                    
                    <div className="p-8 max-h-[80vh] overflow-y-auto">
                      <TabsContent value="camera" className="m-0 text-center">
                        <Camera className="w-12 h-12 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">Analisi Istantanea</h3>
                        <p className="text-slate-400 mb-8 max-w-sm mx-auto">Scatta una foto del tuo piatto e la nostra IA calcolerà calorie e macro per te.</p>
                        <Label htmlFor="image-upload" className="block max-w-sm mx-auto">
                          <div className="w-full h-16 bg-primary text-white rounded-2xl flex items-center justify-center font-bold cursor-pointer hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                            {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : "SCATTA O SCEGLI FOTO"}
                          </div>
                          <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                        </Label>
                      </TabsContent>

                      <TabsContent value="manual" className="m-0 space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              <Input 
                                placeholder="Cerca in dispensa..." 
                                className="pl-11 h-12 rounded-xl bg-slate-50 border-none"
                                value={manualSearch}
                                onChange={(e) => setManualSearch(e.target.value)}
                              />
                            </div>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                              {filteredPantry.map((ing: any) => (
                                <button 
                                  key={ing.id} 
                                  onClick={() => addIngredientToSelection(ing)}
                                  className="w-full flex items-center justify-between p-4 rounded-2xl border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                                >
                                  <div className="text-left">
                                    <p className="text-sm font-bold text-slate-900">{ing.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{ing.calories} kcal / 100g</p>
                                  </div>
                                  <Plus size={18} className="text-slate-300 group-hover:text-primary" />
                                </button>
                              ))}
                              {filteredPantry.length === 0 && (
                                <div className="text-center py-10">
                                  <p className="text-xs text-slate-400 font-medium italic">Nessun ingrediente trovato.</p>
                                  <Button asChild variant="link" className="text-primary text-xs h-auto p-0 mt-1">
                                    <Link href="/pantry">Aggiungi nuovo alimento</Link>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-6">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <Sparkles size={16} className="text-primary" /> Il tuo Piatto
                            </h4>
                            
                            <div className="space-y-3">
                              {selectedIngredients.map((ing) => (
                                <div key={ing.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">{ing.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input 
                                        type="number" 
                                        className="h-8 w-16 text-xs font-bold p-1 text-center"
                                        value={ing.grams}
                                        onChange={(e) => updateGrams(ing.id, Number(e.target.value))}
                                      />
                                      <span className="text-[10px] font-bold text-slate-400">grammi</span>
                                    </div>
                                  </div>
                                  <button onClick={() => removeIngredientFromSelection(ing.id)} className="text-slate-300 hover:text-red-500">
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                              {selectedIngredients.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Piatto Vuoto</p>
                                </div>
                              )}
                            </div>

                            {selectedIngredients.length > 0 && (
                              <div className="pt-6 border-t space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Tipo Pasto</Label>
                                    <Select value={mealType} onValueChange={setMealType}>
                                      <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue placeholder="Tipo pasto" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="colazione">Colazione</SelectItem>
                                        <SelectItem value="pranzo">Pranzo</SelectItem>
                                        <SelectItem value="cena">Cena</SelectItem>
                                        <SelectItem value="spuntino">Spuntino</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Data e Ora</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-10 rounded-xl text-xs justify-start px-3 font-normal">
                                          <Clock size={14} className="mr-2" /> {format(mealDate, 'HH:mm - dd/MM')}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar mode="single" selected={mealDate} onSelect={(d) => d && setMealDate(d)} />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calorie Totali</p>
                                    <p className="text-3xl font-black text-slate-900">{Math.round(manualMealTotals.calories)} <span className="text-sm font-bold text-slate-400">kcal</span></p>
                                  </div>
                                  <Button onClick={saveManualMeal} disabled={isSaving} className="rounded-xl h-12 px-6 bg-slate-900 text-white font-bold hover:bg-slate-800 w-full sm:w-auto">
                                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : "CONFERMA"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid gap-6">
              {meals.map((meal: any) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
              {meals.length === 0 && <div className="text-center p-12 text-slate-400 font-medium bg-white/50 border-2 border-dashed rounded-[32px]">Nessun pasto registrato per oggi</div>}
            </div>
          </section>
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

function MealCard({ meal }: any) {
  const getMealIcon = () => {
    switch (meal.type?.toLowerCase()) {
      case 'colazione': return <Coffee className="text-orange-600" size={24} />;
      case 'pranzo': return <Sun className="text-yellow-600" size={24} />;
      case 'cena': return <Moon className="text-indigo-600" size={24} />;
      case 'spuntino': return <Apple className="text-red-600" size={24} />;
      default: return <Utensils className="text-slate-500" size={24} />;
    }
  };

  const getMealBg = () => {
    switch (meal.type?.toLowerCase()) {
      case 'colazione': return 'bg-orange-50';
      case 'pranzo': return 'bg-yellow-50';
      case 'cena': return 'bg-indigo-50';
      case 'spuntino': return 'bg-red-50';
      default: return 'bg-slate-50';
    }
  };

  return (
    <Card className="border-none rounded-[28px] bg-white nutrio-shadow overflow-hidden p-5 flex items-center gap-5">
      <div className={cn("w-20 h-20 shrink-0 rounded-2xl flex items-center justify-center relative", getMealBg())}>
        {meal.image ? (
          <img 
            src={meal.image} 
            alt={meal.name} 
            className="w-full h-full object-cover rounded-2xl" 
          />
        ) : (
          getMealIcon()
        )}
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-white/80 backdrop-blur-md rounded-lg text-[8px] font-black uppercase text-primary border border-primary/20">
          {meal.type}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 truncate">{meal.name}</h3>
        <p className="text-[11px] text-slate-400 truncate">{meal.description}</p>
        <div className="flex gap-2 mt-1">
          <div className="text-[9px] font-bold text-slate-400">P: {meal.macros?.protein}g</div>
          <div className="text-[9px] font-bold text-slate-400">C: {meal.macros?.carbs}g</div>
          <div className="text-[9px] font-bold text-slate-400">G: {meal.macros?.fat}g</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-black text-xl text-slate-900">{meal.calories}</div>
        <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Kcal</div>
      </div>
    </Card>
  );
}
