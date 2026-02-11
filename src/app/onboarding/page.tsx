
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { calculateTDEE, ACTIVITY_LEVELS } from '@/lib/tdee';
import { ArrowRight, ChevronLeft, Plus, Trash2, Utensils, ScanBarcode, X, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { collection, doc, setDoc, addDoc, getDoc } from 'firebase/firestore';

interface Ingredient {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function Onboarding() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);
  const [formData, setFormData] = useState({
    gender: 'male' as 'male' | 'female',
    age: 25,
    weight: 70,
    height: 175,
    activityLevel: 1.55,
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: 'Riso Integrale', calories: 350, protein: 7, carbs: 75, fat: 2 },
    { name: 'Petto di Pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  ]);

  const [newIngredient, setNewIngredient] = useState<Ingredient>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Controllo se l'utente ha già un profilo e reindirizzamento
  useEffect(() => {
    async function checkProfile() {
      if (mounted && user && db) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          router.replace('/dashboard');
        }
      }
    }
    if (!authLoading && !user && mounted) {
      router.replace('/');
    }
    checkProfile();
  }, [user, authLoading, db, mounted, router]);

  useEffect(() => {
    let scannerInstance: any = null;
    
    if (isScanning && typeof window !== 'undefined') {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        const timeoutId = setTimeout(() => {
          const readerElement = document.getElementById("reader");
          if (readerElement) {
            try {
              scannerInstance = new Html5QrcodeScanner(
                "reader",
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

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);
  
  const addIngredient = () => {
    if (!newIngredient.name) return;
    setIngredients([...ingredients, { ...newIngredient }]);
    setNewIngredient({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const finish = async () => {
    if (!user || !db) {
      toast({ variant: "destructive", title: "Errore", description: "Devi essere loggato." });
      return;
    }

    setIsFinishing(true);
    const tdee = calculateTDEE({
      ...formData,
      activityLevel: formData.activityLevel as any
    });

    try {
      // Salvataggio dati profilo
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        tdeeGoal: tdee,
        onboardingCompleted: true,
        setupDate: new Date().toISOString(),
        displayName: user.displayName,
        email: user.email
      }, { merge: true });

      // Salvataggio ingredienti iniziali nella dispensa
      const ingredientsCol = collection(db, 'users', user.uid, 'ingredients');
      for (const ing of ingredients) {
        await addDoc(ingredientsCol, ing);
      }

      toast({ 
        title: "Configurazione completata!", 
        description: `Il tuo obiettivo calorico è ${tdee} kcal.`
      });
      
      // Reindirizzamento immediato alla dashboard (Home)
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore salvataggio" });
      setIsFinishing(false);
    }
  };

  if (!mounted || authLoading) return (
    <div className="min-h-screen bg-nutrio-bg flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="mt-4 text-slate-400 font-medium">Caricamento profilo...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-none shadow-2xl overflow-hidden bg-white rounded-[2.5rem]">
        <div className="h-2 bg-slate-100">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
        <CardHeader className="pt-10 pb-4 px-8">
          <div className="flex items-center gap-4 mb-4">
            {step > 1 && (
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-10 w-10 rounded-full hover:bg-slate-50">
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Step {step} di 4</span>
              <CardTitle className="text-3xl font-black text-slate-900 leading-tight">
                {step === 1 ? `Benvenuto, ${user?.displayName?.split(' ')[0] || 'Utente'}!` : 
                 step === 2 ? 'I tuoi parametri' : 
                 step === 3 ? 'Stile di vita' : 
                 'La tua Dispensa Smart'}
              </CardTitle>
            </div>
          </div>
          <CardDescription className="text-slate-500 font-medium text-base">
            {step === 1 ? 'Partiamo dalle basi. Queste informazioni ci aiuteranno a calcolare il tuo metabolismo.' : 
             step === 2 ? 'Il peso e l\'altezza sono fondamentali per definire i tuoi obiettivi giornalieri.' :
             step === 3 ? 'Quanto sei attivo durante la giornata? Questo influisce molto sul tuo fabbisogno.' :
             'Aggiungi gli alimenti che usi più spesso. Risparmierai tempo registrando i pasti.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10 px-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 ml-1">Sesso Biologico</Label>
                <RadioGroup defaultValue={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v as any })} className="flex gap-4">
                  <div className="flex-1">
                    <RadioGroupItem value="male" id="male" className="peer sr-only" />
                    <Label htmlFor="male" className="flex flex-col items-center justify-center h-20 rounded-2xl border-2 border-slate-100 bg-white p-4 cursor-pointer text-center peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all">Uomo</Label>
                  </div>
                  <div className="flex-1">
                    <RadioGroupItem value="female" id="female" className="peer sr-only" />
                    <Label htmlFor="female" className="flex flex-col items-center justify-center h-20 rounded-2xl border-2 border-slate-100 bg-white p-4 cursor-pointer text-center peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all">Donna</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label htmlFor="age" className="text-xs font-bold uppercase text-slate-400 ml-1">Quanti anni hai?</Label>
                <div className="relative">
                  <Input id="age" type="number" className="h-14 rounded-2xl pl-12 text-lg font-bold" value={formData.age} onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })} />
                  <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" size={20} />
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="weight" className="text-xs font-bold uppercase text-slate-400 ml-1">Peso attuale (kg)</Label>
                <Input id="weight" type="number" className="h-14 rounded-2xl text-lg font-bold" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })} />
              </div>
              <div className="space-y-3">
                <Label htmlFor="height" className="text-xs font-bold uppercase text-slate-400 ml-1">Altezza (cm)</Label>
                <Input id="height" type="number" className="h-14 rounded-2xl text-lg font-bold" value={formData.height} onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })} />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 ml-1">Livello di attività fisica</Label>
                <Select value={formData.activityLevel.toString()} onValueChange={(v) => setFormData({ ...formData, activityLevel: Number(v) })}>
                  <SelectTrigger className="h-14 rounded-2xl text-base font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {ACTIVITY_LEVELS.map(l => <SelectItem key={l.value} value={l.value.toString()} className="h-12">{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] space-y-5 border border-slate-100">
                <div className="flex justify-between items-center">
                  <Label className="font-bold text-slate-900">Nuovo ingrediente</Label>
                  <Dialog open={isScanning} onOpenChange={setIsScanning}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full h-10 px-5 border-primary/20 text-primary hover:bg-primary/5">
                        <ScanBarcode size={18} className="mr-2" /> Scanner Barcode
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="p-0 bg-black max-w-sm rounded-[2rem] overflow-hidden">
                      <div id="reader" className="w-full" />
                      <Button variant="ghost" className="absolute top-4 right-4 text-white hover:bg-white/10" onClick={() => setIsScanning(false)}><X /></Button>
                    </DialogContent>
                  </Dialog>
                </div>
                {isFetching && <div className="text-center text-primary font-bold animate-pulse flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16} /> Ricerca prodotto...</div>}
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Nome (es. Pasta)" className="col-span-2 h-12 rounded-xl" value={newIngredient.name} onChange={e => setNewIngredient({...newIngredient, name: e.target.value})} />
                  <Input placeholder="kcal" type="number" className="h-12 rounded-xl" value={newIngredient.calories} onChange={e => setNewIngredient({...newIngredient, calories: Number(e.target.value)})} />
                  <Input placeholder="Pro (g)" type="number" className="h-12 rounded-xl" value={newIngredient.protein} onChange={e => setNewIngredient({...newIngredient, protein: Number(e.target.value)})} />
                  <Input placeholder="Car (g)" type="number" className="h-12 rounded-xl" value={newIngredient.carbs} onChange={e => setNewIngredient({...newIngredient, carbs: Number(e.target.value)})} />
                  <Input placeholder="Gra (g)" type="number" className="h-12 rounded-xl" value={newIngredient.fat} onChange={e => setNewIngredient({...newIngredient, fat: Number(e.target.value)})} />
                </div>
                <Button onClick={addIngredient} className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                  Aggiungi alla lista
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl bg-white shadow-sm animate-in fade-in slide-in-from-bottom-1">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{ing.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{ing.calories} kcal/100g · P:{ing.protein}g C:{ing.carbs}g G:{ing.fat}g</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full" onClick={() => removeIngredient(i)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button 
            className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black text-lg rounded-[2rem] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-50" 
            onClick={step < 4 ? handleNext : finish}
            disabled={isFinishing}
          >
            {isFinishing ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <>
                {step < 4 ? 'CONTINUA' : 'CREA IL MIO PIANO'} 
                {step < 4 && <ArrowRight className="ml-2" />}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
