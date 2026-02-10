"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateTDEE, ACTIVITY_LEVELS } from '@/lib/tdee';
import { ArrowRight, ChevronLeft } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: 'male' as 'male' | 'female',
    age: 25,
    weight: 70,
    height: 175,
    activityLevel: 1.55,
  });

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);
  
  const finish = () => {
    const tdee = calculateTDEE({
      ...formData,
      activityLevel: formData.activityLevel as any
    });
    localStorage.setItem('nutrio_tdee_goal', tdee.toString());
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-nutrio-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none nutrio-shadow overflow-hidden bg-white">
        <div className="h-2 bg-slate-100">
          <div 
            className="h-full bg-nutrio-mint transition-all duration-300" 
            style={{ width: `${(step / 3) * 100}%` }}
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
              {step === 1 ? 'Informazioni Personali' : step === 2 ? 'Dati Corporei' : 'Livello di Attività'}
            </CardTitle>
          </div>
          <CardDescription>
            Aiutaci a calcolare il tuo fabbisogno calorico giornaliero.
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
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-nutrio-mint [&:has([data-state=checked])]:border-nutrio-mint cursor-pointer"
                    >
                      <span className="text-sm font-medium">Uomo</span>
                    </Label>
                  </div>
                  <div className="flex-1">
                    <RadioGroupItem value="female" id="female" className="peer sr-only" />
                    <Label
                      htmlFor="female"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-nutrio-mint [&:has([data-state=checked])]:border-nutrio-mint cursor-pointer"
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

          <Button 
            className="w-full h-14 rounded-xl text-lg bg-nutrio-mint hover:bg-nutrio-mint/90 text-white shadow-lg"
            onClick={step < 3 ? handleNext : finish}
          >
            {step < 3 ? 'Continua' : 'Completa Configurazione'}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
