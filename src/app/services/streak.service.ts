import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StreakService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ── Streak & Badges ──────────────────────────────────────
  updateStreak(): Observable<any> {
    return this.http.post(`${this.api}/streak/update`, {});
  }

  getStreak(): Observable<any> {
    return this.http.get(`${this.api}/streak`);
  }

  // ── Bookmarks ────────────────────────────────────────────
  getBookmarks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/bookmarks`);
  }

  toggleBookmark(data: {
    courseId: string;
    courseTitle: string;
    lessonIndex: number;
    lessonTitle: string;
    unitTitle?: string;
  }): Observable<any> {
    return this.http.post(`${this.api}/bookmarks`, data);
  }

  // ── Notes ────────────────────────────────────────────────
  getNotes(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/notes/${courseId}`);
  }

  saveNote(data: {
    courseId: string;
    lessonIndex: number;
    lessonTitle: string;
    text: string;
  }): Observable<any> {
    return this.http.post(`${this.api}/notes`, data);
  }

  deleteNote(noteId: string): Observable<any> {
    return this.http.delete(`${this.api}/notes/${noteId}`);
  }

  // ── Discount Codes ───────────────────────────────────────
  validateDiscountCode(code: string, price: number): Observable<any> {
    return this.http.post(`${this.api}/discount-codes/validate`, { code, price });
  }

  // Admin only
  getDiscountCodes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/discount-codes`);
  }

  createDiscountCode(data: {
    code: string;
    discountPercent: number;
    maxUses?: number;
    expiresAt?: string;
    description?: string;
  }): Observable<any> {
    return this.http.post(`${this.api}/admin/discount-codes`, data);
  }

  deleteDiscountCode(id: string): Observable<any> {
    return this.http.delete(`${this.api}/admin/discount-codes/${id}`);
  }

  toggleDiscountCode(id: string): Observable<any> {
    return this.http.patch(`${this.api}/admin/discount-codes/${id}/toggle`, {});
  }
}
