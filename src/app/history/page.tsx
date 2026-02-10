
"use client";

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, LayoutGrid, History, BarChart2, Utensils, Settings, Pencil, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function HistoryPage() {
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

  const handleDeleteMeal = async (id: string) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'users', user.uid, 'meals', id));
  };

  const handleEditMeal = (meal: any) => {
    setEditingMeal({ ...meal });
    setIsEditModalOpen(true);
  };

  const saveEditedMeal = async () => {
    if (!editingMeal || !user || !db) return;
    await updateDoc(doc(db, 'users', user.uid, 'meals', editingMeal.id), {
      name: editingMeal.name,
      calories: editingMeal.calories,
      macros: editingMeal.macros
    });
    setIsEditModalOpen(false);
  };

  if (!user || !selectedDate) return <div className="p-20 text-center">Caricamento...</div>;

  return (
    <div className="flex min-h-screen bg-[#f6f8f7]">
      <nav className="fixed left-0 top-0 h-full w-20 bg-white border-r flex flex-col items-center py-8 z-50">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-12 shadow-lg"><Utensils /></div>
        <div className="flex flex-col space-y-8 flex-1">
          <Link href="/dashboard" className="p-3 text-slate-400 hover:text-primary"><LayoutGrid size={24} /></Link>
          <Link href="/history" className="p-3 text-primary bg-primary/10 rounded-2xl"><History size={24} /></Link>
          <Link href="/profile" className="p-3 text-slate-400 hover:text-primary"><User size={24} /></Link>
        </div>
        <Link href="/profile" className="p-3 text-slate-400"><Settings size={24} /></Link>
      </nav>

      <main className="ml-20 p-8 max-w-6xl mx-auto w-full">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Cronologia e Log</h1>
            <p className="text-slate-500">Monitora i tuoi progressi giornalieri.</p>
          </div>
          <Link href="/profile">
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm hover:ring-2 hover:ring-primary transition-all">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-8">
            <Card className="bg-white p-8 rounded-[2rem] border-none shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">{format(selectedDate, 'MMMM yyyy', { locale: it })}</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}><ChevronLeft /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}><ChevronRight /></Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-3">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>)}
                <div className="col-span-7 py-4 text-center text-sm text-slate-400">Seleziona un giorno per vedere i dettagli</div>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-6">
              <MacroCard label="Proteine" value={`${dailyStats.protein}g`} progress={Math.min(100, (dailyStats.protein/150)*100)} color="text-primary" bgColor="bg-primary/10" />
              <MacroCard label="Carboidrati" value={`${dailyStats.carbs}g`} progress={Math.min(100, (dailyStats.carbs/300)*100)} color="text-blue-500" bgColor="bg-blue-50" />
              <MacroCard label="Grassi" value={`${dailyStats.fat}g`} progress={Math.min(100, (dailyStats.fat/80)*100)} color="text-purple-500" bgColor="bg-purple-50" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card className="bg-white rounded-[2rem] border-none shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b">
                <h3 className="text-xl font-bold">{format(selectedDate, 'EEEE, d MMM', { locale: it })}</h3>
                <div className="relative py-8 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-5xl font-black">{dailyStats.calories}</span>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase">kcal totali</span>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Pasti Inseriti</h4>
                <div className="space-y-4">
                  {mealsForSelectedDay.map((meal: any) => (
                    <div key={meal.id} className="group flex items-center p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100">
                      <div className="w-16 h-16 rounded-xl overflow-hidden mr-5 shadow-sm bg-slate-100">
                        <img src={meal.image || 'https://picsum.photos/seed/food/100/100'} alt={meal.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-900 truncate">{meal.name}</h5>
                        <p className="text-[11px] text-slate-400 uppercase font-bold">{meal.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{meal.calories}</p>
                      </div>
                      <div className="flex ml-4 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEditMeal(meal)} className="p-2 text-slate-300 hover:text-primary"><Pencil size={18} /></button>
                        <button onClick={() => handleDeleteMeal(meal.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                  {mealsForSelectedDay.length === 0 && <div className="text-center text-slate-400 py-10">Nessun pasto registrato</div>}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="rounded-[32px] p-8 bg-white">
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
    </div>
  );
}

function MacroCard({ label, value, progress, color, bgColor }: any) {
  return (
    <Card className="p-6 rounded-2xl border bg-white flex flex-col justify-between shadow-sm">
      <p className={cn("text-[10px] font-extrabold uppercase tracking-widest mb-3", color)}>{label}</p>
      <div className="flex items-end justify-between"><span className="text-2xl font-black">{value}</span><span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", bgColor, color)}>{Math.round(progress)}%</span></div>
    </Card>
  );
}
