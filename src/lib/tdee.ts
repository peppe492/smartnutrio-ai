export interface TDEEInput {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
}

export function calculateTDEE(input: TDEEInput): number {
  const { weight, height, age, gender, activityLevel } = input;
  
  // Equazione di Mifflin-St Jeor
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  return Math.round(bmr * activityLevel);
}

export const ACTIVITY_LEVELS = [
  { label: 'Sedentario', value: 1.2 },
  { label: 'Leggermente attivo', value: 1.375 },
  { label: 'Moderatamente attivo', value: 1.55 },
  { label: 'Molto attivo', value: 1.725 },
  { label: 'Extra attivo', value: 1.9 },
];
