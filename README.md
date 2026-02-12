# 🍎 SmartNutrio AI

**SmartNutrio AI** è un assistente nutrizionale intelligente basato su Intelligenza Artificiale (Google Gemini) che semplifica il tracciamento dei pasti e il monitoraggio dei progressi fisici.

![SmartNutrio AI](https://picsum.photos/seed/smartnutrio/1200/600)

## 🚀 Funzionalità Principali

- **📸 Analisi Pasti tramite IA**: Scatta una foto al tuo piatto e l'IA calcolerà automaticamente calorie e macronutrienti (Proteine, Carboidrati, Grassi).
- **🧺 Dispensa Smart**: Gestisci i tuoi ingredienti abituali e aggiungi nuovi prodotti velocemente tramite lo **Scanner Barcode** integrato.
- **📅 Cronologia Interattiva**: Un calendario avanzato con indicatori di performance per monitorare la tua costanza e visualizzare i log passati.
- **💧 Registro Idratazione**: Monitora il consumo quotidiano di acqua con obiettivi personalizzati.
- **📈 Tracciamento Progressi**: Registra peso, circonferenza vita e percentuale di grasso corporeo con grafici di andamento temporale.
- **🧬 Calcolo TDEE Automatico**: Calcolo personalizzato del fabbisogno calorico basato su età, sesso, peso, altezza e livello di attività.

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS.
- **UI Components**: ShadCN UI, Lucide Icons.
- **Backend & Auth**: Firebase (Firestore & Authentication).
- **AI**: Google Genkit + Gemini 2.5 Flash.
- **Grafici**: Recharts.
- **Deployment**: Docker & Portainer (Standalone Mode).

## 📋 Prerequisiti

Prima di iniziare, assicurati di avere:
- [Node.js](https://nodejs.org/) (v18 o superiore)
- Un progetto [Firebase](https://console.firebase.google.com/) attivo.
- Una [Gemini API Key](https://aistudio.google.com/app/apikey).

## ⚙️ Configurazione

1. **Clona il repository**:
   ```bash
   git clone https://github.com/tuo-username/smartnutrio-ai.git
   cd smartnutrio-ai
   ```

2. **Installa le dipendenze**:
   ```bash
   npm install
   ```

3. **Variabili d'Ambiente**:
   Crea un file `.env` nella root del progetto:
   ```env
   GEMINI_API_KEY=la_tua_chiave_gemini
   ```

4. **Firebase**:
   Aggiorna la configurazione in `src/firebase/config.ts` con i dati del tuo progetto Firebase.

## 🚀 Sviluppo Locale

Avvia il server di sviluppo:
```bash
npm run dev
```
L'app sarà disponibile all'indirizzo `http://localhost:9002`.

## 🐳 Deploy con Docker / Portainer

Il progetto è già configurato per il deploy tramite container.

### Build Locale
```bash
docker build -t smartnutrio-app .
docker run -p 9002:3000 --env-file .env smartnutrio-app
```

### Deploy su Portainer (Stack)
1. Vai su **Stacks** -> **Add stack**.
2. Scegli **Repository** e incolla l'URL del tuo progetto GitHub.
3. Specifica le variabili d'ambiente (specialmente `GEMINI_API_KEY`) nella sezione **Environment variables**.
4. Clicca su **Deploy the stack**.

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per ulteriori informazioni.

---
Realizzato con ❤️ per uno stile di vita più sano.