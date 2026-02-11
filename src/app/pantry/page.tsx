
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Zap, LayoutGrid, History, User, Utensils, TrendingUp, Droplets,
  Plus, Trash2, ScanBarcode, X, Loader2, Sparkles, Search, Menu, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface Ingredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function PantryPage() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const scannerRef = useRef<any>(null);

  const [newIngredient, setNewIngredient] = useState({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const ingredientsQuery = useMemo(() => {
    if (!user || !db) return null;
    return collection(db, 'users', user.uid, 'ingredients');
  }, [db, user]);

  const { data: allIngredients = [], loading: ingredientsLoading } = useCollection<Ingredient>(ingredientsQuery as any);

  const filteredIngredients = useMemo(() => {
    return allIngredients.filter(ing => 
      ing.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allIngredients, searchTerm]);

  useEffect(() => {
    if (isScanning && typeof window !== 'undefined') {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        const timeoutId = setTimeout(() => {
          const readerElement = document.getElementById("pantry-reader");
          if (readerElement) {
            try {
              const scannerInstance = new Html5QrcodeScanner(
                "pantry-reader",
                { fps: 10, qrbox: { width: 250, height: 150 } },
                false
              );
              scannerInstance.render(onScanSuccess, onScanFailure);
              scannerRef.current = scannerInstance;
            } catch (err) {
              console.error("Errore scanner:", err);
            }
          }
        }, 300);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  async function onScanSuccess(decodedText: string) {
    if (scannerRef.current) scannerRef.current.pause();
    setIsScanning(false);
    setIsFetching(true);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
      const data = await response.json();
      if (data.status === 1) {
        const product = data.product;
        setNewIngredient({
          name: product.product_name || 'Prodotto Scansionato',
          calories: Math.round(product.nutriments['energy-kcal_100g'] || 0),
          protein: product.nutriments.proteins_100g || 0,
          carbs: product.nutriments.carbohydrates_100g || 0,
          fat: product.nutriments.fat_100g || 0,
        });
        toast({ title: "Prodotto trovato!", description: product.product_name });
      } else {
        toast({ variant: "destructive", title: "Non trovato", description: "Inserisci manualmente." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: "Impossibile recuperare i dati." });
    } finally {
      setIsFetching(false);
    }
  }

  function onScanFailure() {}

  const handleAddIngredient = () => {
    if (!user || !db || !newIngredient.name) return;
    
    const ingredientsCol = collection(db, 'users', user.uid, 'ingredients');
    addDoc(ingredientsCol, newIngredient)
      .then(() => {
        setIsAddModalOpen(false);
        setNewIngredient({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
        toast({ title: "Aggiunto!", description: `${newIngredient.name} è ora nella tua dispensa.` });
      })
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: ingredientsCol.path,
          operation: 'create',
          requestResourceData: newIngredient,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleOpenEdit = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setIsEditModalOpen(true);
  };

  const handleUpdateIngredient = () => {
    if (!user || !db || !editingIngredient) return;
    const ingRef = doc(db, 'users', user.uid, 'ingredients', editingIngredient.id);
    const updateData = {
      name: editingIngredient.name,
      calories: editingIngredient.calories,
      protein: editingIngredient.protein,
      carbs: editingIngredient.carbs,
      fat: editingIngredient.fat,
    };

    updateDoc(ingRef, updateData)
      .then(() => {
        setIsEditModalOpen(false);
        setEditingIngredient(null);
        toast({ title: "Aggiornato!", description: `${editingIngredient.name} è stato modificato.` });
      })
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: ingRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDeleteIngredient = (id: string) => {
    if (!user || !db) return;
    const ingRef = doc(db, 'users', user.uid, 'ingredients', id);
    deleteDoc(ingRef)
      .then(() => {
        toast({ title: "Rimosso", description: "L'ingrediente è stato eliminato dalla dispensa." });
      })
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: ingRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]"><Loader2 className="animate-spin text-primary" /></div>;

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
              <h1 className="text-2xl font-bold text-slate-900">Dispensa Smart 🧺</h1>
              <p className="text-slate-400 font-medium text-sm">Gestisci i tuoi ingredienti base e scansione nuovi prodotti.</p>
            </div>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6 shadow-lg shadow-primary/20 gap-2 w-full sm:w-auto">
                  <Plus size={20} /> AGGIUNGI
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-[32px] p-8 border-none bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Nuovo Ingrediente</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div className="flex justify-center">
                    <Dialog open={isScanning} onOpenChange={setIsScanning}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full h-14 rounded-2xl border-dashed border-2 gap-2 text-primary font-bold hover:bg-primary/5 transition-all">
                          <ScanBarcode size={24} /> Scansiona Barcode
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="p-0 bg-black max-w-sm rounded-[2rem] overflow-hidden border-none">
                        <div id="pantry-reader" className="w-full" />
                        <Button variant="ghost" className="absolute top-4 right-4 text-white hover:bg-white/10" onClick={() => setIsScanning(false)}><X /></Button>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {isFetching && <div className="text-center text-primary font-bold animate-pulse flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> Ricerca prodotto...</div>}

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Nome Alimento</Label>
                      <Input placeholder="Es: Pasta Barilla" className="h-12 rounded-xl" value={newIngredient.name} onChange={e => setNewIngredient({...newIngredient, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">kcal / 100g</Label>
                        <Input type="number" className="h-12 rounded-xl" value={newIngredient.calories} onChange={e => setNewIngredient({...newIngredient, calories: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Proteine (g)</Label>
                        <Input type="number" className="h-12 rounded-xl" value={newIngredient.protein} onChange={e => setNewIngredient({...newIngredient, protein: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Carboidrati (g)</Label>
                        <Input type="number" className="h-12 rounded-xl" value={newIngredient.carbs} onChange={e => setNewIngredient({...newIngredient, carbs: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Grassi (g)</Label>
                        <Input type="number" className="h-12 rounded-xl" value={newIngredient.fat} onChange={e => setNewIngredient({...newIngredient, fat: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddIngredient} className="w-full h-14 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors">
                    Salva nella Dispensa
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </header>

          <div className="mb-8 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <Input 
              placeholder="Cerca ingredienti..." 
              className="pl-12 h-14 rounded-2xl border-none shadow-sm bg-white font-medium text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredIngredients.map((ing) => (
              <Card key={ing.id} className="border-none rounded-[28px] bg-white nutrio-shadow p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary">
                    <Utensils size={24} />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-primary hover:bg-primary/5 rounded-full transition-colors" onClick={() => handleOpenEdit(ing)}>
                      <Pencil size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" onClick={() => handleDeleteIngredient(ing.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{ing.name}</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ing.calories} kcal <span className="text-[10px]">/ 100g</span></span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Pro</p>
                    <p className="text-xs font-bold text-slate-900">{ing.protein}g</p>
                  </div>
                  <div className="text-center border-x border-slate-50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Car</p>
                    <p className="text-xs font-bold text-slate-900">{ing.carbs}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Fat</p>
                    <p className="text-xs font-bold text-slate-900">{ing.fat}g</p>
                  </div>
                </div>
              </Card>
            ))}

            {!ingredientsLoading && filteredIngredients.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white/50 border-2 border-dashed rounded-[32px]">
                <div className="mb-4 flex justify-center"><Sparkles size={48} className="text-slate-200" /></div>
                <p className="text-slate-400 font-bold text-lg">Nessun ingrediente trovato</p>
                <p className="text-slate-300 text-sm">Aggiungi nuovi alimenti per vederli qui.</p>
              </div>
            )}

            {ingredientsLoading && (
              <div className="col-span-full py-20 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                <p className="text-slate-300 font-medium">Caricamento dispensa...</p>
              </div>
            )}
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-md rounded-[32px] p-8 border-none bg-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Modifica Ingrediente</DialogTitle>
              </DialogHeader>
              {editingIngredient && (
                <div className="space-y-6 mt-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Nome Alimento</Label>
                      <Input placeholder="Es: Pasta Barilla" className="h-12 rounded-xl" value={editingIngredient.name} onChange={e => setEditingIngredient({...editingIngredient, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">kcal / 100g</Label>
                        <Input type="number" className="h-12 rounded-xl" value={editingIngredient.calories} onChange={e => setEditingIngredient({...editingIngredient, calories: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Proteine (g)</Label>
                        <Input type="number" className="h-12 rounded-xl" value={editingIngredient.protein} onChange={e => setEditingIngredient({...editingIngredient, protein: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Carboidrati (g)</Label>
                        <Input type="number" className="h-12 rounded-xl" value={editingIngredient.carbs} onChange={e => setEditingIngredient({...editingIngredient, carbs: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Grassi (g)</Label>
                        <Input type="number" className="h-12 rounded-xl" value={editingIngredient.fat} onChange={e => setEditingIngredient({...editingIngredient, fat: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleUpdateIngredient} className="w-full h-14 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors">
                    Salva Modifiche
                  </Button>
                </div>
              )}
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
