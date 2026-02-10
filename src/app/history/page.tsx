
"use client";

import { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Trash2, LayoutGrid, History, BarChart2, Utensils, Settings,
  CheckCircle2, AlertCircle, Circle, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MealHistory {
  id: string;
  name: string;
  type: string;
  time: string;
  calories: number;
  image: string;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  }
}

export default function HistoryPage() {
  const [currentMonth, setCurrentMonth] = useState("Ottobre 2023");
  const [meals, setMeals] = useState<MealHistory[]>([
    {
      id: '1',
      name: 'Avocado Toast',
      type: 'Colazione',
      time: '08:30',
      calories: 340,
      image: 'https://picsum.photos/seed/avotoast/100/100',
      macros: { protein: 12, carbs: 24, fat: 18 }
    },
    {
      id: '2',
      name: 'Insalata di Pollo',
      type: 'Pranzo',
      time: '13:15',
      calories: 520,
      image: 'https://picsum.photos/seed/chickensalad/100/100',
      macros: { protein: 42, carbs: 10, fat: 12 }
    },
    {
      id: '3',
      name: 'Mix di Noci',
      type: 'Spuntino',
      time: '16:00',
      calories: 180,
      image: 'https://picsum.photos/seed/nuts/100/100',
      macros: { protein: 5, carbs: 4, fat: 15 }
    },
    {
      id: '4',
      name: 'Salmone al Forno',
      type: 'Cena',
      time: '19:45',
      calories: 810,
      image: 'https://picsum.photos/seed/salmon/100/100',
      macros: { protein: 45, carbs: 5, fat: 22 }
    }
  ]);

  const [editingMeal, setEditingMeal] = useState<MealHistory | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDeleteMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const handleEditMeal = (meal: MealHistory) => {
    setEditingMeal({ ...meal });
    setIsEditModalOpen(true);
  };

  const saveEditedMeal = () => {
    if (!editingMeal) return;
    setMeals(meals.map(m => m.id === editingMeal.id ? editingMeal : m));
    setIsEditModalOpen(false);
    setEditingMeal(null);
  };

  return (
    <div className="flex min-h-screen bg-[#f6f8f7]">
      {/* Sidebar Stretta (Desktop) */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 z-50">
        <div className="mb-12">
          <div className="w-12 h-12 bg-nutrio-mint rounded-xl flex items-center justify-center text-white shadow-lg shadow-nutrio-mint/20">
            <Utensils className="w-6 h-6" />
          </div>
        </div>
        <div className="flex flex-col space-y-8 flex-1">
          <Link href="/dashboard" className="p-3 text-slate-400 hover:text-nutrio-mint transition-colors">
            <LayoutGrid size={24} />
          </Link>
          <Link href="/history" className="p-3 text-nutrio-mint bg-nutrio-mint/10 rounded-2xl">
            <History size={24} />
          </Link>
          <Link href="/dashboard" className="p-3 text-slate-400 hover:text-nutrio-mint transition-colors">
            <BarChart2 size={24} />
          </Link>
          <Link href="/dashboard" className="p-3 text-slate-400 hover:text-nutrio-mint transition-colors">
            <Utensils size={24} />
          </Link>
        </div>
        <Link href="/dashboard" className="p-3 text-slate-400 hover:text-nutrio-mint transition-colors">
          <Settings size={24} />
        </Link>
      </nav>

      {/* Main Content */}
      <main className="ml-20 p-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Cronologia e Log</h1>
            <p className="text-slate-500 font-medium">Monitora i tuoi progressi e rivedi i pasti passati.</p>
          </div>
          <div className="flex items-center space-x-6">
            <Avatar className="w-10 h-10 border-2 border-white shadow-sm cursor-pointer">
              <AvatarImage src="https://picsum.photos/seed/alex/100/100" />
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <Button className="bg-nutrio-mint hover:bg-nutrio-mint/90 text-white px-6 py-6 rounded-full font-bold flex items-center shadow-lg shadow-nutrio-mint/20 transition-all gap-2">
              <Plus size={20} />
              Nuovo Inserimento
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Calendar Container (Left) */}
          <div className="lg:col-span-7 space-y-8">
            <Card className="bg-white p-8 rounded-[2rem] border-none shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-3 cursor-pointer group">
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-nutrio-mint transition-colors">{currentMonth}</h2>
                  <ChevronLeft size={20} className="text-slate-300 -rotate-90 group-hover:text-nutrio-mint transition-colors" />
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-50">
                    <ChevronLeft size={20} className="text-slate-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-50">
                    <ChevronRight size={20} className="text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* Griglia Calendario */}
              <div className="grid grid-cols-7 gap-3">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {day}
                  </div>
                ))}
                
                {/* Filler per i giorni del mese precedente */}
                {[25, 26, 27, 28, 29, 30].map(day => (
                  <div key={day} className="aspect-square flex items-center justify-center rounded-2xl text-slate-300 font-medium text-sm">
                    {day}
                  </div>
                ))}

                {/* Giorni del mese corrente */}
                {Array.from({ length: 14 }).map((_, i) => {
                  const dayNum = i + 1;
                  const isToday = dayNum === 10;
                  const hasExceeded = [2, 5, 8, 12].includes(dayNum);
                  
                  return (
                    <div 
                      key={dayNum} 
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-2xl cursor-pointer relative transition-all group",
                        isToday ? "bg-nutrio-mint text-white shadow-xl shadow-nutrio-mint/30" : "hover:bg-slate-50"
                      )}
                    >
                      <span className={cn("text-sm font-bold", !isToday && "text-slate-700")}>{dayNum}</span>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5",
                        isToday ? "bg-white" : hasExceeded ? "bg-orange-400" : "bg-nutrio-mint"
                      )} />
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="mt-10 flex items-center space-x-8 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-nutrio-mint mr-2"></div>
                  Obiettivo Raggiunto
                </div>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400 mr-2"></div>
                  Superato
                </div>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mr-2"></div>
                  Nessun Dato
                </div>
              </div>
            </Card>

            {/* Macro Stats */}
            <div className="grid grid-cols-3 gap-6">
              <MacroCard label="Proteine" value="128g" progress={85} color="text-nutrio-mint" bgColor="bg-nutrio-mint/10" borderColor="border-nutrio-mint/20" />
              <MacroCard label="Carboidrati" value="210g" progress={95} color="text-blue-500" bgColor="bg-blue-50" borderColor="border-blue-100" />
              <MacroCard label="Grassi" value="58g" progress={82} color="text-purple-500" bgColor="bg-purple-50" borderColor="border-purple-100" />
            </div>
          </div>

          {/* Daily Insight Panel (Right) */}
          <div className="lg:col-span-5">
            <Card className="bg-white rounded-[2rem] border-none shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b border-slate-50">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Martedì, 10 Ott</h3>
                    <p className="text-slate-400 text-sm font-medium">Riepilogo Nutrizionale Oggi</p>
                  </div>
                  <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    ULTIMO LOG
                  </div>
                </div>

                {/* Cerchio Progressivo Calorie */}
                <div className="relative py-8 flex items-center justify-center">
                  <svg className="w-52 h-52 transform -rotate-90">
                    <circle className="text-slate-50" cx="104" cy="104" fill="transparent" r="94" stroke="currentColor" strokeWidth="8"></circle>
                    <circle 
                      className="text-nutrio-mint transition-all duration-1000" 
                      cx="104" 
                      cy="104" 
                      fill="transparent" 
                      r="94" 
                      stroke="currentColor" 
                      strokeDasharray="590.6" 
                      strokeDashoffset={590.6 * (1 - 1850/2100)} 
                      strokeLinecap="round" 
                      strokeWidth="12"
                    ></circle>
                  </svg>
                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-5xl font-black text-slate-900">1.850</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">/ 2.100 kcal</span>
                  </div>
                </div>
              </div>

              {/* Lista Pasti */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar max-h-[500px]">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Pasti Inseriti</h4>
                  <button className="text-nutrio-mint text-[11px] font-bold hover:underline transition-all">Modifica Tutto</button>
                </div>

                <div className="space-y-4">
                  {meals.map((meal) => (
                    <div key={meal.id} className="group flex items-center p-4 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100">
                      <div className="w-16 h-16 rounded-xl overflow-hidden mr-5 shadow-sm">
                        <img className="w-full h-full object-cover" src={meal.image} alt={meal.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-900 truncate">{meal.name}</h5>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{meal.type} • {meal.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-slate-900">{meal.calories}</p>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">kcal</p>
                      </div>
                      <div className="flex items-center ml-4 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEditMeal(meal)} className="p-2 text-slate-300 hover:text-nutrio-mint transition-all">
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDeleteMeal(meal.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

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
                  <Input 
                    id="edit-name" 
                    value={editingMeal.name} 
                    onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-cal">Calorie (kcal)</Label>
                    <Input 
                      id="edit-cal" 
                      type="number"
                      value={editingMeal.calories} 
                      onChange={(e) => setEditingMeal({ ...editingMeal, calories: Number(e.target.value) })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-prot">Proteine (g)</Label>
                    <Input 
                      id="edit-prot" 
                      type="number"
                      value={editingMeal.macros.protein} 
                      onChange={(e) => setEditingMeal({ ...editingMeal, macros: { ...editingMeal.macros, protein: Number(e.target.value) } })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-carb">Carboidrati (g)</Label>
                    <Input 
                      id="edit-carb" 
                      type="number"
                      value={editingMeal.macros.carbs} 
                      onChange={(e) => setEditingMeal({ ...editingMeal, macros: { ...editingMeal.macros, carbs: Number(e.target.value) } })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fat">Grassi (g)</Label>
                    <Input 
                      id="edit-fat" 
                      type="number"
                      value={editingMeal.macros.fat} 
                      onChange={(e) => setEditingMeal({ ...editingMeal, macros: { ...editingMeal.macros, fat: Number(e.target.value) } })}
                      className="rounded-xl"
                    />
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

      {/* Floating Button per Mobile */}
      <Button className="fixed bottom-8 right-8 w-16 h-16 bg-nutrio-mint text-white rounded-full flex items-center justify-center shadow-2xl shadow-nutrio-mint/40 hover:scale-110 transition-transform lg:hidden z-50">
        <Plus size={32} />
      </Button>
    </div>
  );
}

function MacroCard({ label, value, progress, color, bgColor, borderColor }: { label: string, value: string, progress: number, color: string, bgColor: string, borderColor: string }) {
  return (
    <Card className={cn("p-6 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition-transform hover:scale-[1.02]", borderColor)}>
      <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3", color)}>{label}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-black text-slate-900">{value}</span>
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", bgColor, color)}>{progress}% goal</span>
      </div>
    </Card>
  );
}
