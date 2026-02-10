'use server';

/**
 * @fileOverview Questo file definisce un flusso Genkit per assistere gli utenti nell'inserimento manuale del cibo.
 *
 * - manualEntryAiAssistance - Una funzione che gestisce il processo di assistenza all'inserimento del cibo.
 * - ManualEntryAiAssistanceInput - Il tipo di input per la funzione manualEntryAiAssistance.
 * - ManualEntryAiAssistanceOutput - Il tipo di ritorno per la funzione manualEntryAiAssistance.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ManualEntryAiAssistanceInputSchema = z.object({
  foodEntry: z.string().describe('L\'elemento alimentare inserito dall\'utente, ad esempio "Mela 100g".'),
});

export type ManualEntryAiAssistanceInput = z.infer<typeof ManualEntryAiAssistanceInputSchema>;

const ManualEntryAiAssistanceOutputSchema = z.object({
  food_name: z.string().describe('Nome dell\'alimento.'),
  description: z.string().optional().describe('Una breve descrizione dell\'alimento.'),
  calories: z.number().describe('Calorie totali nella quantità specificata dell\'alimento.'),
  macros: z.object({
    protein_g: z.number().describe('Grammi di proteine.'),
    carbs_g: z.number().describe('Grammi di carboidrati.'),
    fat_g: z.number().describe('Grammi di grassi.'),
  }).describe('Ripartizione dei macronutrienti in grammi.'),
});

export type ManualEntryAiAssistanceOutput = z.infer<typeof ManualEntryAiAssistanceOutputSchema>;

export async function manualEntryAiAssistance(input: ManualEntryAiAssistanceInput): Promise<ManualEntryAiAssistanceOutput> {
  return manualEntryAiAssistanceFlow(input);
}

const manualEntryAiAssistancePrompt = ai.definePrompt({
  name: 'manualEntryAiAssistancePrompt',
  input: {schema: ManualEntryAiAssistanceInputSchema},
  output: {schema: ManualEntryAiAssistanceOutputSchema},
  prompt: `Sei un esperto nutrizionista. Un utente sta inserendo manualmente un alimento e la sua quantità.
  In base al suo inserimento, fornisci le informazioni nutrizionali in formato JSON, includendo nome dell'alimento, descrizione, calorie e macro (proteine, carboidrati, grassi).
  L'inserimento dell'utente è: {{{foodEntry}}}

  Restituisci SOLO una risposta JSON (senza markdown) con questa struttura:
  {
  "food_name": "Nome dell'alimento",
  "description": "Breve descrizione dell'alimento (opzionale)",
  "calories": 0,
  "macros": {
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0
  }
  }

  Sii realistico con i valori nutrizionali. Se l'alimento non può essere identificato, restituisci un errore nel JSON.
  `,
});

const manualEntryAiAssistanceFlow = ai.defineFlow(
  {
    name: 'manualEntryAiAssistanceFlow',
    inputSchema: ManualEntryAiAssistanceInputSchema,
    outputSchema: ManualEntryAiAssistanceOutputSchema,
  },
  async input => {
    const {output} = await manualEntryAiAssistancePrompt(input);
    return output!;
  }
);
