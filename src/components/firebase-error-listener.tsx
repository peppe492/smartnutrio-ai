'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      console.error('Firebase Permission Error:', error);
      toast({
        variant: 'destructive',
        title: 'Accesso Negato',
        description: `Non hai i permessi per eseguire: ${error.context.operation} su ${error.context.path}. Verifica le Security Rules o il dominio autorizzato.`,
      });
    });

    return () => unsubscribe();
  }, [toast]);

  return null;
}
