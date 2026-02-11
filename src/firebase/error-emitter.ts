'use client';

type ErrorListener = (error: any) => void;

class ErrorEmitter {
  private listeners: { [event: string]: ErrorListener[] } = {};

  on(event: string, listener: ErrorListener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return () => {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    };
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(data));
    }
  }
}

export const errorEmitter = new ErrorEmitter();
