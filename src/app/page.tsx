
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2, Apple, Zap, Sparkles } from 'lucide-react';
import { useAuth, useFirebase } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto su SmartNutrio AI!",
        });
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      toast({
        variant: "destructive",
        title: "Errore di accesso",
        description: "Impossibile completare il login. Riprova.",
      });
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] font-sans">
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
        <div className="mb-8 relative">
          <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-2xl rotate-6 hover:rotate-0 transition-transform duration-500">
            <Zap className="w-10 h-10 fill-current" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#FF7E67] rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
            <Sparkles size={16} />
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 text-slate-900 leading-tight">
          Mangia meglio, <br /><span className="text-primary">Vivi Smart.</span>
        </h1>
        
        <p className="text-slate-500 text-lg md:text-xl mb-12 max-w-lg font-medium leading-relaxed">
          Traccia la tua nutrizione in pochi secondi con l'intelligenza artificiale. Scatta una foto e noi facciamo il resto.
        </p>
        
        <div className="space-y-4 w-full max-w-sm">
          <Button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full h-16 text-lg rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
          >
            {isLoggingIn ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.8" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" opacity="0.6" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.9" />
              </svg>
            )}
            {isLoggingIn ? "Accesso in corso..." : "Inizia con Google"}
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-14 rounded-[2rem] border-slate-200 font-bold hover:bg-white"
              disabled
            >
              <Apple className="w-5 h-5 mr-2" /> Apple
            </Button>
            <Button 
              variant="outline" 
              className="h-14 rounded-[2rem] border-slate-200 font-bold hover:bg-white"
              disabled
            >
              <Smartphone className="w-5 h-5 mr-2" /> Phone
            </Button>
          </div>
          
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
            Proseguendo accetti i nostri Termini di Servizio
          </p>
        </div>
      </main>

      <footer className="p-8 text-center text-slate-300 text-sm font-medium">
        &copy; 2024 SmartNutrio AI. Tutti i diritti riservati.
      </footer>
    </div>
  );
}
