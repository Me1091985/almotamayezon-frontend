import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _isDark = new BehaviorSubject<boolean>(this.getSavedTheme());
  isDark$ = this._isDark.asObservable();

  get isDark(): boolean {
    return this._isDark.value;
  }

  private getSavedTheme(): boolean {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  toggle(): void {
    const next = !this._isDark.value;
    this._isDark.next(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    this.applyToDocument(next);
  }

  applyToDocument(dark: boolean): void {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  }

  init(): void {
    this.applyToDocument(this._isDark.value);
  }
}
