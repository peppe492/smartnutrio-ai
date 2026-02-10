'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing food images to extract nutritional information.
 *
 * analyzeFoodImage - Analyzes a food image and returns nutritional information.
 * AnalyzeFoodImageInput - The input type for the analyzeFoodImage function.
 * AnalyzeFoodImageOutput - The return type for the analyzeFoodImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeFoodImageInputSchema = z.object({
  foodPhotoDataUri: z
    .string()
    .describe(
      "A photo of the meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type AnalyzeFoodImageInput = z.infer<typeof AnalyzeFoodImageInputSchema>;

const AnalyzeFoodImageOutputSchema = z.object({
  food_name: z.string().describe('Name of the dish.'),
  description: z.string().describe('Brief description of the dish.'),
  calories: z.number().describe('Total calories in the dish.'),
  macros: z.object({
    protein_g: z.number().describe('Protein content in grams.'),
    carbs_g: z.number().describe('Carbohydrate content in grams.'),
    fat_g: z.number().describe('Fat content in grams.'),
  }).describe('Macro nutrients of the dish')
}).describe('Nutritional information about the food.');

export type AnalyzeFoodImageOutput = z.infer<typeof AnalyzeFoodImageOutputSchema>;

export async function analyzeFoodImage(input: AnalyzeFoodImageInput): Promise<AnalyzeFoodImageOutput> {
  return analyzeFoodImageFlow(input);
}

const analyzeFoodImagePrompt = ai.definePrompt({
  name: 'analyzeFoodImagePrompt',
  input: {schema: AnalyzeFoodImageInputSchema},
  output: {schema: AnalyzeFoodImageOutputSchema},
  prompt: `Sei un nutrizionista esperto. Analizza questa foto di cibo. Identifica gli ingredienti visibili.
Restituisci SOLO una risposta in formato JSON (senza markdown) con questa struttura:
{
"food_name": "Nome del piatto",
    "description": "Breve descrizione",
    "calories": 0,
    "macros": {
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0
    }
  }
Sii realistico con le porzioni. Se non c'è cibo, restituisci un errore nel JSON.

Photo: {{media url=foodPhotoDataUri}}`,
});

const analyzeFoodImageFlow = ai.defineFlow(
  {
    name: 'analyzeFoodImageFlow',
    inputSchema: AnalyzeFoodImageInputSchema,
    outputSchema: AnalyzeFoodImageOutputSchema,
  },
  async input => {
    const {output} = await analyzeFoodImagePrompt(input);
    return output!;
  }
);
