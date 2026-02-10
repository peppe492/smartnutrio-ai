
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
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';

interface Ingredient {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function Onboarding() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: 'male' as 'male' | 'female',
    age: 25,
    weight: 70,
    height: 175,
    activityLevel: 1.55,
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: '1', name: 'Riso Integrale', calories: 350, protein: 7, carbs: 75, fat: 2 },
    { id: '2', name: 'Petto di Pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  ]);

  const [newIngredient, setNewIngredient] = useState<Omit<Ingredient, 'id'>>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isScanning) {
      // Aggiungiamo un piccolo ritardo per assicurarci che il Dialog e il div #reader siano montati
      timeoutId = setTimeout(() => {
        const readerElement = document.getElementById("reader");
        if (readerElement) {
          try {
            const scanner = new Html5QrcodeScanner(
              "reader",
              { fps: 10, qrbox: { width: 250, height: 150 } },
              /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;
          } catch (err) {
            console.error("Errore durante l'inizializzazione dello scanner:", err);
          }
        }
      }, 300);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (scannerRef.current) {
        scannerRef.current.clear().catch((error) => {
          // Ignoriamo l'errore se lo scanner è già stato rimosso o non trovato
          if (!error?.message?.includes("id=reader")) {
            console.error("Errore durante la pulizia dello scanner:", error);
          }
        });
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  async function onScanSuccess(decodedText: string) {
    if (scannerRef.current) {
      scannerRef.current.pause();
    }
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
        toast({
          title: "Prodotto trovato!",
          description: `Rilevato: ${product.product_name}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Prodotto non trovato",
          description: "Inserisci i dati manualmente o prova con un altro codice.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Errore di connessione",
        description: "Impossibile recuperare i dati del prodotto.",
      });
    } finally {
      setIsFetching(false);
    }
  }

  function onScanFailure(error: any) {
    // Silenzioso per evitare log eccessivi durante la ricerca del codice
  }

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);
  
  const addIngredient = () => {
    if (!newIngredient.name) return;
    setIngredients([...ingredients, { ...newIngredient, id: Date.now().toString() }]);
    setNewIngredient({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  const finish = () => {
    const tdee = calculateTDEE({
      ...formData,
      activityLevel: formData.activityLevel as any
    });
    localStorage.setItem('nutrio_tdee_goal', tdee.toString());
    localStorage.setItem('nutrio_allowed_ingredients', JSON.stringify(ingredients));
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-nutrio-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-none nutrio-shadow overflow-hidden bg-white">
        <div className="h-2 bg-slate-100">
          <div 
            className="h-full bg-nutrio-mint transition-all duration-300" 
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        
        <CardHeader className="pt-8 pb-4">
          <div className="flex items-center gap-4 mb-2">
            {step > 1 && (
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <CardTitle className="text-2xl font-bold">
              {step === 1 ? 'Informazioni Personali' : step === 2 ? 'Dati Corporei' : step === 3 ? 'Livello di Attività' : 'Lista Ingredienti Consentiti'}
            </CardTitle>
          </div>
          <CardDescription>
            {step === 4 ? 'Aggiungi gli ingredienti che utilizzi abitualmente. Puoi scansionare il codice a barre per velocizzare.' : 'Aiutaci a calcolare il tuo fabbisogno calorico giornaliero.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sesso</Label>
                <RadioGroup 
                  defaultValue={formData.gender} 
                  onValueChange={(v) => setFormData({ ...formData, gender: v as any })}
                  className="flex gap-4"
                >
                  <div className="flex-1">
                    <RadioGroupItem value="male" id="male" className="peer sr-only" />
                    <Label
                      htmlFor="male"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-nutrio-mint [&:has([data-state=checked])]:border-nutrio-mint cursor-pointer text-center"
                    >
                      <span className="text-sm font-medium">Uomo</span>
                    </Label>
                  </div>
                  <div className="flex-1">
                    <RadioGroupItem value="female" id="female" className="peer sr-only" />
                    <Label
                      htmlFor="female"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-nutrio-mint [&:has([data-state=checked])]:border-nutrio-mint cursor-pointer text-center"
                    >
                      <span className="text-sm font-medium">Donna</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Età</Label>
                <Input 
                  id="age" 
                  type="number" 
                  value={formData.age} 
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input 
                  id="weight" 
                  type="number" 
                  value={formData.weight} 
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altezza (cm)</Label>
                <Input 
                  id="height" 
                  type="number" 
                  value={formData.height} 
                  onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quanto sei attivo?</Label>
                <Select 
                  value={formData.activityLevel.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, activityLevel: Number(v) })}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Seleziona il livello di attività" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value.toString()}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-nutrio-mint/10 p-4 rounded-xl text-nutrio-mint font-medium text-sm">
                Il tuo TDEE determina quante calorie bruci mediamente ogni giorno.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-bold">Nuovo Ingrediente</Label>
                  <Dialog open={isScanning} onOpenChange={setIsScanning}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full border-nutrio-mint text-nutrio-mint hover:bg-nutrio-mint/10 gap-2 h-9">
                        <ScanBarcode size={16} />
                        Scansiona Barcode
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none bg-black">
                      <div className="relative min-h-[300px] flex items-center justify-center">
                        <div id="reader" className="w-full"></div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full z-50"
                          onClick={() => setIsScanning(false)}
                        >
                          <X size={24} />
                        </Button>
                        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                          <p className="text-white text-sm font-bold bg-black/50 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                            Inquadra il codice a barre del prodotto
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {isFetching && (
                  <div className="flex items-center justify-center gap-2 text-nutrio-mint font-bold py-2">
                    <Loader2 className="animate-spin" size={18} />
                    Recupero dati prodotto...
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Nome Ingrediente</Label>
                    <Input 
                      placeholder="Esempio: Pasta Integrale" 
                      value={newIngredient.name}
                      onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Calorie (100g)</Label>
                    <Input 
                      type="number" 
                      value={newIngredient.calories}
                      onChange={(e) => setNewIngredient({...newIngredient, calories: Number(e.target.value)})}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Proteine (100g)</Label>
                    <Input 
                      type="number" 
                      value={newIngredient.protein}
                      onChange={(e) => setNewIngredient({...newIngredient, protein: Number(e.target.value)})}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Carboidrati (100g)</Label>
                    <Input 
                      type="number" 
                      value={newIngredient.carbs}
                      onChange={(e) => setNewIngredient({...newIngredient, carbs: Number(e.target.value)})}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Grassi (100g)</Label>
                    <Input 
                      type="number" 
                      value={newIngredient.fat}
                      onChange={(e) => setNewIngredient({...newIngredient, fat: Number(e.target.value)})}
                      className="rounded-xl h-11"
                    />
                  </div>
                </div>
                <Button onClick={addIngredient} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 shadow-md">
                  <Plus size={16} className="mr-2" /> Aggiungi alla lista
                </Button>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 no-scrollbar">
                {ingredients.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm hover:border-nutrio-mint/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-nutrio-mint/10 rounded-lg flex items-center justify-center text-nutrio-mint">
                        <Utensils size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{ing.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{ing.calories} kcal | P: {ing.protein}g C: {ing.carbs}g G: {ing.fat}g</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => removeIngredient(ing.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            className="w-full h-14 rounded-xl text-lg bg-nutrio-mint hover:bg-nutrio-mint/90 text-white shadow-lg font-bold"
            onClick={step < 4 ? handleNext : finish}
          >
            {step < 4 ? 'Continua' : 'Completa Configurazione'}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
