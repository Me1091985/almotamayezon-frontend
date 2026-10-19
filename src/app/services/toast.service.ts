import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();
  private nextId = 0;

  constructor() {
    this.overrideAlert();
  }

  show(message: string) {
    let type: 'success' | 'error' | 'info' = 'info';

    // Detect type from emojis/content
    if (message.includes('✅') || message.includes('نجاح') || message.includes('🎉') || message.includes('أحسنت') || message.includes('مبروك') || message.includes('شكراً')) {
      type = 'success';
    } else if (message.includes('❌') || message.includes('خطأ') || message.includes('عذراً') || message.includes('فشل') || message.includes('⚠️') || message.includes('لازم')) {
      type = 'error';
    }

    const id = this.nextId++;
    const current = this.toastsSubject.value;
    
    this.toastsSubject.next([...current, { id, message, type }]);

    // Remove after 10 seconds
    setTimeout(() => {
      this.remove(id);
    }, 10000);
  }

  remove(id: number) {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }

  private overrideAlert() {
    // Override window.alert globally
    window.alert = (message: string) => {
      if (message) {
        this.show(message);
      }
    };
  }
}
