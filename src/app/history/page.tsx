
'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Trash2, LayoutGrid, History, Utensils, Pencil, User, Zap, Menu, TrendingUp, Droplets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function HistoryPage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const db = useFirestore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);

  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  const mealsQuery = useMemo(() => user && db ? collection(db, 'users', user.uid, 'meals') : null, [db, user]);
  const { data: allMeals = [] } = useCollection(mealsQuery);

  const mealsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return allMeals.filter((m: any) => format(new Date(m.timestamp), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
  }, [allMeals, selectedDate]);

  const dailyStats = useMemo(() => {
    return mealsForSelectedDay.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
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

  if (!user || !selectedDate) return <div className="p-20 text-center">Caricamento...</div>;

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
        {/* Mobile Header */}
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
              <h1 className="text-2xl font-bold text-slate-900">Cronologia e Log</h1>
              <p className="text-slate-400 font-medium text-sm">Monitora i tuoi progressi nel tempo.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-7 space-y-6">
              <Card className="bg-white p-8 rounded-[32px] border-none shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-bold text-slate-900">{format(selectedDate, 'MMMM yyyy', { locale: it })}</h2>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}><ChevronLeft size={20}/></Button>
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}><ChevronRight size={20}/></Button>
                  </div>
                </div>
                <div className="text-center py-4 text-sm text-slate-400 font-medium italic">
                  La visualizzazione calendario completa è in arrivo. Seleziona oggi per i dettagli.
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <MacroCard label="Proteine" value={`${Math.round(dailyStats.protein)}g`} progress={Math.min(100, (dailyStats.protein/150)*100)} color="text-primary" bgColor="bg-primary/10" />
                <MacroCard label="Carboidrati" value={`${Math.round(dailyStats.carbs)}g`} progress={Math.min(100, (dailyStats.carbs/300)*100)} color="text-blue-500" bgColor="bg-blue-50" />
                <MacroCard label="Grassi" value={`${Math.round(dailyStats.fat)}g`} progress={Math.min(100, (dailyStats.fat/80)*100)} color="text-purple-500" bgColor="bg-purple-50" />
              </div>
            </div>

            <div className="xl:col-span-5">
              <Card className="bg-white rounded-[32px] border-none shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-8 border-b border-slate-50">
                  <h3 className="text-xl font-bold text-slate-900">{format(selectedDate, 'EEEE, d MMMM', { locale: it })}</h3>
                  <div className="relative py-8 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-5xl font-black text-slate-900">{dailyStats.calories}</span>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">kcal totali</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Pasti Inseriti</h4>
                  <div className="space-y-4">
                    {mealsForSelectedDay.map((meal: any) => (
                      <div key={meal.id} className="group flex items-center p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent">
                        <div className="w-14 h-14 rounded-xl overflow-hidden mr-4 shadow-sm bg-slate-100 flex-shrink-0">
                          <img src={meal.image || 'https://picsum.photos/seed/food/100/100'} alt={meal.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-900 truncate text-sm">{meal.name}</h5>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{meal.type}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-black text-slate-900">{meal.calories}</p>
                        </div>
                        <div className="flex ml-4 gap-1 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEditMeal(meal)} className="p-2 text-slate-300 hover:text-primary"><Pencil size={18} /></button>
                          <button onClick={() => handleDeleteMeal(meal.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                    {mealsForSelectedDay.length === 0 && <div className="text-center text-slate-400 py-10 font-medium">Nessun pasto registrato</div>}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="rounded-[32px] p-8 border-none bg-white">
              <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">Modifica Pasto</DialogTitle></DialogHeader>
              {editingMeal && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Nome</Label>
                    <Input value={editingMeal.name} onChange={e => setEditingMeal({ ...editingMeal, name: e.target.value })} className="h-12 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">kcal</Label>
                      <Input type="number" value={editingMeal.calories} onChange={e => setEditingMeal({ ...editingMeal, calories: Number(e.target.value) })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400">Proteine (g)</Label>
                      <Input type="number" value={editingMeal.macros.protein} onChange={e => setEditingMeal({ ...editingMeal, macros: { ...editingMeal.macros, protein: Number(e.target.value) } })} className="h-12 rounded-xl" />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={saveEditedMeal} className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20">Salva Modifiche</Button>
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
    <Card className="p-6 rounded-[28px] border-none bg-white flex flex-col justify-between shadow-sm">
      <p className={cn("text-[10px] font-extrabold uppercase tracking-widest mb-3", color)}>{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-black text-slate-900">{value}</span>
        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", bgColor, color)}>{Math.round(progress)}%</span>
      </div>
    </Card>
  );
}
