'use server';

/**
 * @fileOverview This file defines a Genkit flow for assisting users with manual food entry by providing suggestions and nutritional information.
 *
 * - manualEntryAiAssistance - A function that handles the food entry assistance process.
 * - ManualEntryAiAssistanceInput - The input type for the manualEntryAiAssistance function.
 * - ManualEntryAiAssistanceOutput - The return type for the manualEntryAiAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ManualEntryAiAssistanceInputSchema = z.object({
  foodEntry: z.string().describe('The user inputted food item, e.g., \'Apple 100g\'.'),
});

export type ManualEntryAiAssistanceInput = z.infer<typeof ManualEntryAiAssistanceInputSchema>;

const ManualEntryAiAssistanceOutputSchema = z.object({
  food_name: z.string().describe('Name of the food item.'),
  description: z.string().optional().describe('A brief description of the food item.'),
  calories: z.number().describe('Total calories in the specified quantity of the food item.'),
  macros: z.object({
    protein_g: z.number().describe('Grams of protein.'),
    carbs_g: z.number().describe('Grams of carbohydrates.'),
    fat_g: z.number().describe('Grams of fat.'),
  }).describe('Macro nutrient breakdown in grams.'),
});

export type ManualEntryAiAssistanceOutput = z.infer<typeof ManualEntryAiAssistanceOutputSchema>;

export async function manualEntryAiAssistance(input: ManualEntryAiAssistanceInput): Promise<ManualEntryAiAssistanceOutput> {
  return manualEntryAiAssistanceFlow(input);
}

const manualEntryAiAssistancePrompt = ai.definePrompt({
  name: 'manualEntryAiAssistancePrompt',
  input: {schema: ManualEntryAiAssistanceInputSchema},
  output: {schema: ManualEntryAiAssistanceOutputSchema},
  prompt: `You are an expert nutritionist. A user is manually entering a food item and its quantity.
  Based on their entry, provide the nutritional information in JSON format, including food name, description, calories, and macros (protein, carbs, fat).
  The user entry is: {{{foodEntry}}}

  Return ONLY a JSON response (without markdown) with this structure:
  {
  "food_name": "Name of the food item",
  "description": "Brief description of the food item (optional)",
  "calories": 0,
  "macros": {
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0
  }
  }

  Be realistic with the nutritional values. If the food item cannot be identified, return an error in the JSON.
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
