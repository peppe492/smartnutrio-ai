
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, isSameDay, isValid, parseISO, addMonths, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Trash2, LayoutGrid, History, Utensils, Pencil, User, Zap, Menu, TrendingUp, Droplets,
  Coffee, Sun, Moon, Apple, Calendar as CalendarIcon, ChevronRight, ChevronLeft, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function HistoryPage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const db = useFirestore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemo(() => user && db ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);
  const dailyGoal = userProfile?.tdeeGoal || 2000;

  const mealsQuery = useMemo(() => user && db ? collection(db, 'users', user.uid, 'meals') : null, [db, user]);
  const { data: allMeals = [] } = useCollection(mealsQuery);

  const dailyStatusMap = useMemo(() => {
    const map: Record<string, 'met' | 'exceeded' | 'none'> = {};
    const mealsByDate: Record<string, number> = {};
    
    allMeals.forEach((meal: any) => {
      if (!meal.timestamp) return;
      const d = typeof meal.timestamp === 'string' ? parseISO(meal.timestamp) : new Date(meal.timestamp);
      if (!isValid(d)) return;
      
      const dateStr = format(d, 'yyyy-MM-dd');
      mealsByDate[dateStr] = (mealsByDate[dateStr] || 0) + (meal.calories || 0);
    });

    Object.keys(mealsByDate).forEach(dateStr => {
      map[dateStr] = mealsByDate[dateStr] > dailyGoal ? 'exceeded' : 'met';
    });
    
    return map;
  }, [allMeals, dailyGoal]);

  const mealsForSelectedDay = useMemo(() => {
    if (!selectedDate || !isValid(selectedDate)) return [];
    const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
    return allMeals.filter((m: any) => {
      try {
        if (!m.timestamp) return false;
        const d = typeof m.timestamp === 'string' ? parseISO(m.timestamp) : new Date(m.timestamp);
        return isValid(d) && format(d, 'yyyy-MM-dd') === targetDateStr;
      } catch (e) {
        return false;
      }
    });
  }, [allMeals, selectedDate]);

  const dailyStats = useMemo(() => {
    return mealsForSelectedDay.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.macros?.protein || 0),
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [mealsForSelectedDay]);

  const handleDeleteMeal = (id: string) => {
    if (!user || !db) return;
    const docRef = doc(db, 'users', user.uid, 'meals', id);
    deleteDoc(docRef)
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleEditMeal = (meal: any) => {
    setEditingMeal({ ...meal });
    setIsEditModalOpen(true);
  };

  const saveEditedMeal = () => {
    if (!editingMeal || !user || !db) return;
    const docRef = doc(db, 'users', user.uid, 'meals', editingMeal.id);
    const updateData = {
      name: editingMeal.name,
      calories: editingMeal.calories,
      macros: editingMeal.macros
    };
    
    updateDoc(docRef, updateData)
      .then(() => {
        setIsEditModalOpen(false);
      })
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  if (!mounted || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Zap className="w-8 h-8 text-primary animate-pulse" />
    </div>
  );

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

  const getMealIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'colazione': return <Coffee className="text-orange-500" size={20} />;
      case 'pranzo': return <Sun className="text-yellow-500" size={20} />;
      case 'cena': return <Moon className="text-indigo-500" size={20} />;
      case 'spuntino': return <Apple className="text-red-500" size={20} />;
      default: return <Utensils className="text-slate-500" size={20} />;
    }
  };

  const getMealBg = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'colazione': return 'bg-orange-50';
      case 'pranzo': return 'bg-yellow-50';
      case 'cena': return 'bg-indigo-50';
      case 'spuntino': return 'bg-red-50';
      default: return 'bg-slate-50';
    }
  };

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

        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cronologia Nutrizionale 📅</h1>
              <p className="text-slate-400 font-medium text-sm">Visualizza e gestisci i tuoi log passati.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <Card className="xl:col-span-1 bg-white p-8 rounded-[40px] border-none shadow-xl flex flex-col">
              <div className="w-full flex items-center justify-between mb-8">
                <div className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-lg font-bold text-slate-900 capitalize">{currentMonth && isValid(currentMonth) ? format(currentMonth, 'MMMM yyyy', { locale: it }) : ''}</span>
                  <ChevronDown size={16} className="text-slate-400" />
                </div>
                <div className="flex gap-4">
                   <ChevronLeft size={20} className="text-slate-400 cursor-pointer hover:text-primary transition-colors" onClick={handlePrevMonth} />
                   <ChevronRight size={20} className="text-slate-400 cursor-pointer hover:text-primary transition-colors" onClick={handleNextMonth} />
                </div>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border-none p-0 w-full"
                locale={it}
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-6",
                  caption: "hidden",
                  table: "w-full border-collapse",
                  head_row: "grid grid-cols-7 mb-4",
                  head_cell: "text-slate-300 font-bold text-[10px] uppercase text-center tracking-widest",
                  row: "grid grid-cols-7 w-full mt-2",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                  day: "h-11 w-11 p-0 font-bold transition-all rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-50 mx-auto",
                  day_selected: "hidden", 
                  day_today: "text-primary",
                  day_outside: "text-slate-200 opacity-20",
                }}
                components={{
                  Day: ({ day }: any) => {
                    const date = day?.date;
                    if (!date || !isValid(date)) return null;

                    const dateStr = format(date, 'yyyy-MM-dd');
                    const status = dailyStatusMap[dateStr];
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isOutside = !isSameMonth(date, currentMonth);
                    
                    return (
                      <div 
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "relative flex flex-col items-center justify-center cursor-pointer group h-16 w-full",
                          isOutside && "opacity-20"
                        )}
                      >
                        <div className={cn(
                          "h-11 w-11 flex flex-col items-center justify-center rounded-full font-bold transition-all relative",
                          isSelected ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20 z-10" : "text-slate-600 hover:bg-slate-50"
                        )}>
                          {format(date, 'd')}
                          {isSelected && (
                            <div className="w-1 h-1 rounded-full bg-white mt-0.5" />
                          )}
                        </div>
                        {!isSelected && status && (
                          <div className={cn(
                            "absolute bottom-1 w-1 h-1 rounded-full",
                            status === 'met' ? "bg-emerald-400" : "bg-orange-400"
                          )} />
                        )}
                      </div>
                    );
                  }
                }}
              />

              <div className="w-full mt-10 pt-8 border-t border-slate-50 flex flex-wrap justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Goal Met</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Exceeded</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-100" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">No Entry</span>
                </div>
              </div>
            </Card>

            <div className="xl:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MacroCard label="Proteine" value={`${Math.round(dailyStats.protein)}g`} progress={Math.min(100, (dailyStats.protein/150)*100)} color="text-blue-500" bgColor="bg-blue-50" />
                <MacroCard label="Carboidrati" value={`${Math.round(dailyStats.carbs)}g`} progress={Math.min(100, (dailyStats.carbs/300)*100)} color="text-yellow-600" bgColor="bg-yellow-50" />
                <MacroCard label="Grassi" value={`${Math.round(dailyStats.fat)}g`} progress={Math.min(100, (dailyStats.fat/80)*100)} color="text-purple-500" bgColor="bg-purple-50" />
              </div>

              <Card className="bg-white rounded-[40px] border-none shadow-xl overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedDate && isValid(selectedDate) ? format(selectedDate, 'EEEE, d MMMM', { locale: it }) : 'Seleziona una data'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">Riepilogo nutrizionale del giorno</p>
                  </div>
                  <div className="flex flex-col items-center sm:items-end">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-slate-900">{Math.round(dailyStats.calories)}</span>
                      <span className="text-sm font-bold text-slate-400">kcal</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">energia totale</span>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Utensils size={16} className="text-primary" /> Pasti Registrati
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">{mealsForSelectedDay.length} Voci</span>
                  </div>
                  
                  <div className="space-y-4">
                    {mealsForSelectedDay.map((meal: any) => (
                      <div key={meal.id} className="group flex items-center p-5 rounded-[24px] bg-slate-50/50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mr-5 shadow-sm shrink-0 overflow-hidden relative", getMealBg(meal.type))}>
                          {meal.image ? (
                            <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
                          ) : (
                            getMealIcon(meal.type)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-900 truncate text-sm">{meal.name}</h5>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <div className={cn("w-1.5 h-1.5 rounded-full", meal.type === 'colazione' ? 'bg-orange-400' : meal.type === 'pranzo' ? 'bg-yellow-400' : meal.type === 'cena' ? 'bg-indigo-400' : 'bg-red-400')} />
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{meal.type}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold uppercase">
                              P: {meal.macros?.protein}g · C: {meal.macros?.carbs}g · G: {meal.macros?.fat}g
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-black text-lg text-slate-900 leading-none">{meal.calories}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">kcal</p>
                        </div>
                        <div className="flex ml-6 gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                          <Button variant="ghost" size="icon" onClick={() => handleEditMeal(meal)} className="h-9 w-9 rounded-xl text-slate-300 hover:text-primary hover:bg-primary/5"><Pencil size={16} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.id)} className="h-9 w-9 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"><Trash2 size={16} /></Button>
                        </div>
                      </div>
                    ))}
                    {mealsForSelectedDay.length === 0 && (
                      <div className="text-center py-16 flex flex-col items-center justify-center bg-slate-50/30 rounded-[32px] border-2 border-dashed border-slate-100">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                           <History className="text-slate-200" size={24} />
                        </div>
                        <p className="text-slate-400 font-bold text-sm">Nessun pasto registrato</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="rounded-[32px] p-8 border-none bg-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Modifica Voce</DialogTitle>
              </DialogHeader>
              {editingMeal && (
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Nome del Pasto</Label>
                    <Input value={editingMeal.name} onChange={e => setEditingMeal({ ...editingMeal, name: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Kcal Totali</Label>
                      <Input type="number" value={editingMeal.calories} onChange={e => setEditingMeal({ ...editingMeal, calories: Number(e.target.value) })} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={saveEditedMeal} className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">Salva Modifiche</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

function MacroCard({ label, value, progress, color, bgColor }: any) {
  return (
    <Card className="p-5 rounded-[28px] border-none bg-white flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <p className={cn("text-[10px] font-extrabold uppercase tracking-widest", color)}>{label}</p>
        <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold", bgColor, color)}>
          {Math.round(progress)}%
        </div>
      </div>
      <div className="space-y-3">
        <span className="text-2xl font-black text-slate-900">{value}</span>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-1000", color.replace('text', 'bg'))} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Card>
  );
}
