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
import { ArrowRight, ChevronLeft, Plus, Trash2, Utensils, ScanBarcode, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';

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
  const { user } = useAuth();
  const db = useFirestore();
  
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
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

    const tdee = calculateTDEE({
      ...formData,
      activityLevel: formData.activityLevel as any
    });

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { tdeeGoal: tdee }, { merge: true });

      const ingredientsCol = collection(db, 'users', user.uid, 'ingredients');
      for (const ing of ingredients) {
        await addDoc(ingredientsCol, ing);
      }

      toast({ title: "Configurazione completata!" });
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore salvataggio" });
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-nutrio-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-none nutrio-shadow overflow-hidden bg-white">
        <div className="h-2 bg-slate-100">
          <div className="h-full bg-nutrio-mint transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
        <CardHeader className="pt-8 pb-4">
          <div className="flex items-center gap-4 mb-2">
            {step > 1 && (
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <CardTitle className="text-2xl font-bold">
              {step === 1 ? 'Informazioni Personali' : step === 2 ? 'Dati Corporei' : step === 3 ? 'Livello di Attività' : 'Dispensa IA'}
            </CardTitle>
          </div>
          <CardDescription>
            {step === 4 ? 'Aggiungi i tuoi ingredienti preferiti. Li userai per comporre i tuoi pasti.' : 'Personalizziamo il tuo piano.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sesso</Label>
                <RadioGroup defaultValue={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v as any })} className="flex gap-4">
                  <div className="flex-1">
                    <RadioGroupItem value="male" id="male" className="peer sr-only" />
                    <Label htmlFor="male" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 cursor-pointer text-center peer-data-[state=checked]:border-nutrio-mint">Uomo</Label>
                  </div>
                  <div className="flex-1">
                    <RadioGroupItem value="female" id="female" className="peer sr-only" />
                    <Label htmlFor="female" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 cursor-pointer text-center peer-data-[state=checked]:border-nutrio-mint">Donna</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Età</Label>
                <Input id="age" type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" type="number" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altezza (cm)</Label>
                <Input id="height" type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })} />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Attività</Label>
                <Select value={formData.activityLevel.toString()} onValueChange={(v) => setFormData({ ...formData, activityLevel: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIVITY_LEVELS.map(l => <SelectItem key={l.value} value={l.value.toString()}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="font-bold">Aggiungi ingrediente</Label>
                  <Dialog open={isScanning} onOpenChange={setIsScanning}>
                    <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-full"><ScanBarcode size={16} className="mr-2" /> Scanner</Button></DialogTrigger>
                    <DialogContent className="p-0 bg-black max-w-sm"><div id="reader" className="w-full" /><Button variant="ghost" className="absolute top-4 right-4 text-white" onClick={() => setIsScanning(false)}><X /></Button></DialogContent>
                  </Dialog>
                </div>
                {isFetching && <div className="text-center text-nutrio-mint font-bold animate-pulse">Ricerca prodotto...</div>}
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Nome" className="col-span-2" value={newIngredient.name} onChange={e => setNewIngredient({...newIngredient, name: e.target.value})} />
                  <Input placeholder="kcal" type="number" value={newIngredient.calories} onChange={e => setNewIngredient({...newIngredient, calories: Number(e.target.value)})} />
                  <Input placeholder="Prot" type="number" value={newIngredient.protein} onChange={e => setNewIngredient({...newIngredient, protein: Number(e.target.value)})} />
                  <Input placeholder="Carb" type="number" value={newIngredient.carbs} onChange={e => setNewIngredient({...newIngredient, carbs: Number(e.target.value)})} />
                  <Input placeholder="Grass" type="number" value={newIngredient.fat} onChange={e => setNewIngredient({...newIngredient, fat: Number(e.target.value)})} />
                </div>
                <Button onClick={addIngredient} className="w-full bg-slate-900 text-white">Salva in Dispensa</Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border rounded-xl bg-white">
                    <div>
                      <p className="text-sm font-bold">{ing.name}</p>
                      <p className="text-[10px] text-slate-400">{ing.calories}kcal | P:{ing.protein}g C:{ing.carbs}g G:{ing.fat}g</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeIngredient(i)}><Trash2 size={16} /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button className="w-full h-14 bg-nutrio-mint text-white font-bold" onClick={step < 4 ? handleNext : finish}>
            {step < 4 ? 'Continua' : 'Completato'} <ArrowRight className="ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
