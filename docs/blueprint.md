# **App Name**: SmartNutrio AI

## Core Features:

- Social Authentication: Enable users to sign up and log in using social accounts (Google/Apple) and email/password.
- Calorie Needs Calculation: Onboarding process to calculate Total Daily Energy Expenditure (TDEE) based on user input (weight, height, age).
- AI Food Analysis: Utilize Gemini via API to analyze images of meals, identify food items, and estimate quantities. Return data in JSON format, using a prompt system that requests `food_name`, `calories`, and `macros`. The user can edit and confirm the AI's estimation.
- Manual Food Entry with AI Assistance: Enable users to manually input food items. Use Gemini to fetch nutritional values for the food entered, instead of querying a massive local database.
- Nutrio-Style Dashboard: Display a donut chart summarizing calorie intake vs. daily goal, macro cards for proteins, carbs, and fats, and a vertical feed of added meals.
- Meal Data Persistence: Save meal data and daily logs to Firestore to allow displaying and recalling records, with a date as key.
- Calendar View: Implement a calendar view to display daily summaries, allowing users to view historical data by selecting a specific date.

## Style Guidelines:

- Background: White (#FFFFFF) to maintain a clean and modern aesthetic.
- Primary (Action): Mint Green (#4ADE80) for main actions, providing a vibrant and fresh feel.
- Macro Accents: Pastel Blue (#60A5FA) for proteins, Yellow/Ochre (#FACC15) for carbs, and Purple (#A78BFA) for fats, visually distinguishing each macro type.
- Font: 'Poppins' for a rounded and modern feel. Note: currently only Google Fonts are supported.
- Camera icon to indicate to scan food items with a camera. Pencil icon to indicate text item food entry
- Use Stack for positioning elements on the dashboard, CustomPaint or fl_chart for the calorie progress donut chart, and Container with rounded corners (borderRadius: BorderRadius.circular(20)) for meal cards.
- Subtle animations on FAB tap or when switching to the calendar view