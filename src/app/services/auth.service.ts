import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserRole = new BehaviorSubject<string>(this.getUserRole());

  constructor() {}

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/signup`, userData);
  }

  login(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, userData).pipe(
      tap((res: any) => {
        this.saveToken(res.token, res.role, res.uid, res.name, res.email, res.grade, res.phone, res.parentPhone);
      })
    );
  }

  deleteStudentData(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  saveToken(token: string, role: string, userId?: string, name?: string, email?: string, grade?: string, phone?: string, parentPhone?: string) {
    const formattedRole = role.toLowerCase().trim();
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', formattedRole); 
    if (userId) localStorage.setItem('userId', userId);
    if (name) localStorage.setItem('userName', name);
    if (email) localStorage.setItem('userEmail', email);
    if (grade) localStorage.setItem('userGrade', grade);
    if (phone) localStorage.setItem('userPhone', phone);
    if (parentPhone) localStorage.setItem('parentPhone', parentPhone);
    this.loggedIn.next(true);
    this.currentUserRole.next(formattedRole);

    if (formattedRole === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/student-dashboard']);
    }
  }

  getUserGrade(): string {
    return localStorage.getItem('userGrade') || '';
  }


  logout() {
    localStorage.clear();
    this.loggedIn.next(false);
    this.router.navigate(['/login']);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  confirmResetPassword(data: { email: string, otp: string, newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, data);
  }

  resetPassword(identifier: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/reset-password`, { identifier });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-otp`, { email, otp });
  }

  get isLoggedIn$() {
    return this.loggedIn.asObservable();
  }

  isLoggedIn(): boolean {
    return this.loggedIn.value;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserRole(): string {
    return localStorage.getItem('userRole') || '';
  }

  getUserName(): string {
    return localStorage.getItem('userName') || 'مستخدم';
  }

  getStudents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`).pipe(
      map(users => users.filter(u => u.role !== 'admin'))
    );
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/profile`);
  }

  resetStudentPassword(userId: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/reset-password`, { userId, newPassword });
  }

  updateToken(newToken: string): void {
    if (!newToken) return;
    localStorage.setItem('token', newToken);
    this.loggedIn.next(true);
  }

  refreshToken(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/refresh`).pipe(
      tap(res => {
        if (res?.token) {
          this.updateToken(res.token);
        }
      })
    );
  }

  isTokenExpired(token?: string | null): boolean {
    const t = token || this.getToken();
    if (!t) return true;
    try {
      const parts = t.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      // Allow 60-day grace period since backend supports auto-refresh for recent tokens
      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      return (payload.exp * 1000) + sixtyDaysMs < Date.now();
    } catch {
      return false;
    }
  }
}
