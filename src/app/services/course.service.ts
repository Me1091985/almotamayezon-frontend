import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ── In-memory cache for GlobalSettings (shared across all components) ──
  private settingsCache: any = null;
  private settingsCacheExpiry: number = 0;
  private readonly SETTINGS_TTL = 10 * 60 * 1000; // 10 minutes

  // ── In-memory cache for Courses ──────────────────────────────────────
  private coursesCache: { key: string; data: any[]; expiry: number } | null = null;
  private readonly COURSES_TTL = 10 * 60 * 1000; // 10 minutes

  // ── In-memory cache for Leaderboard ──────────────────────────────────
  private leaderboardCache: { key: string; data: any; expiry: number } | null = null;
  private readonly LEADERBOARD_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  getCourseCoverUrl(course: any, fallback = 'assets/images/course_placeholder.png', width = 400): string {
    const candidates = [course?.thumbnail, course?.imageUrl, course?.image];
    let url = candidates.find((u) => this.isValidCoverUrl(u)) || '';
    if (!url) return fallback;
    if (url.startsWith('data:image')) return url;
    
    // Auto-transform Cloudinary images to modern format & optimized width
    if (url.includes('cloudinary.com') && url.includes('/image/upload/')) {
      if (!url.includes('/image/upload/f_auto') && !url.includes('/image/upload/w_')) {
        url = url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
      }
    }

    const version = course?.updatedAt ? new Date(course.updatedAt).getTime() : '1';
    return url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`;
  }

  private isValidCoverUrl(url: unknown): url is string {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image')
    );
  }

  getAllCourses(grade?: string, userId?: string, forceRefresh: boolean = false): Observable<any[]> {
    const cacheKey = `${grade || ''}-${userId || ''}`;
    const now = Date.now();
    if (!forceRefresh && this.coursesCache && this.coursesCache.key === cacheKey && now < this.coursesCache.expiry) {
      return of(this.coursesCache.data);
    }
    const params = new URLSearchParams();
    if (grade) params.set('grade', grade);
    if (userId) params.set('userId', userId);
    const query = params.toString();
    const url = query ? `${this.apiUrl}/courses?${query}` : `${this.apiUrl}/courses`;
    return this.http.get<any[]>(url).pipe(
      tap(data => {
        this.coursesCache = { key: cacheKey, data, expiry: Date.now() + 30000 }; // 30 seconds TTL
      })
    );
  }

  /** Invalidate courses cache (e.g. after admin edits a course) */
  invalidateCoursesCache(): void {
    this.coursesCache = null;
  }

  /**
   * Unified course fetch — sends JWT (via interceptor).
   *  • If enrolled/admin  → backend returns full course WITH video URLs  (1 request total)
   *  • If not enrolled    → backend returns course WITHOUT video URLs + isEnrolled:false
   * This replaces the old two-step getCourseById + getCourseLessons pattern.
   */
  getCourseById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${id}`);
  }

  /** 🔒 Protected: fetch full course including lesson video URLs (kept for backwards compat/admin).
   *  Requires a valid JWT token (attached by the auth interceptor).
   *  Returns 403 if the user is not enrolled. */
  getCourseLessons(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${id}/lessons`);
  }

  addCourse(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/courses`, data).pipe(
      tap(() => this.invalidateCoursesCache())
    );
  }

  updateCourse(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/courses/${id}`, data).pipe(
      tap(() => this.invalidateCoursesCache())
    );
  }

  deleteCourse(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/courses/${id}`).pipe(
      tap(() => this.invalidateCoursesCache())
    );
  }

  enroll(courseId: string, courseTitle: string, transferNumber: string, message: string = '', paymentImageUrl: string = '', discountCode?: string, originalPrice?: number, finalPrice?: number): Observable<any> {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    if (!userId) throw new Error('User not logged in');
    
    return this.http.post<any>(`${this.apiUrl}/enrollments`, {
      courseId,
      courseTitle,
      studentId: userId,
      studentName: userName || 'طالب جديد',
      transferNumber,
      message,
      paymentImageUrl,
      status: 'pending',
      discountCode,
      originalPrice,
      finalPrice
    });
  }

  /** Cached leaderboard — re-fetched at most once every 5 minutes */
  getLeaderboard(userId?: string, grade?: string): Observable<any> {
    const cacheKey = `${userId || ''}-${grade || ''}`;
    const now = Date.now();
    if (this.leaderboardCache && this.leaderboardCache.key === cacheKey && now < this.leaderboardCache.expiry) {
      return of(this.leaderboardCache.data);
    }
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (grade) params.set('grade', grade);
    const query = params.toString();
    return this.http.get<any>(`${this.apiUrl}/leaderboard${query ? `?${query}` : ''}`).pipe(
      tap(data => {
        this.leaderboardCache = { key: cacheKey, data, expiry: Date.now() + this.LEADERBOARD_TTL };
      })
    );
  }

  getEnrollmentRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/enrollments`);
  }

  handleEnrollmentRequest(requestId: string, courseId: string, studentId: string, action: 'approve' | 'reject'): Observable<any> {
    if (action === 'reject') {
      return this.http.delete<any>(`${this.apiUrl}/enrollments/${requestId}`);
    }

    // Approve: Add student to course and delete request
    return this.http.put<any>(`${this.apiUrl}/courses/${courseId}/enroll`, { studentId, requestId });
  }

  unenrollStudent(courseId: string, studentId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/courses/${courseId}/unenroll`, { studentId });
  }

  checkRequestStatus(courseId: string, userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/enrollments/status/${courseId}/${userId}`);
  }

  submitReview(reviewData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reviews`, reviewData);
  }

  /** Cached global settings — re-fetched at most once every 5 minutes */
  getGlobalSettings(): Observable<any> {
    const now = Date.now();
    if (this.settingsCache && now < this.settingsCacheExpiry) {
      return of(this.settingsCache);
    }
    return this.http.get<any>(`${this.apiUrl}/settings/global`).pipe(
      tap(res => {
        this.settingsCache = res;
        this.settingsCacheExpiry = Date.now() + this.SETTINGS_TTL;
      })
    );
  }

  /** Invalidate settings cache (call after admin saves new settings) */
  invalidateSettingsCache(): void {
    this.settingsCache = null;
    this.settingsCacheExpiry = 0;
  }

  saveGlobalSettings(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/settings/global`, data).pipe(
      tap(() => this.invalidateSettingsCache())
    );
  }

  getStudentStats(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/stats/${userId}`);
  }

  getCourseProgress(courseId: string, userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${courseId}/progress/${userId}`);
  }

  // Admin: get a specific student's progress in a course
  getStudentProgress(courseId: string, userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${courseId}/progress/${userId}`);
  }

  // Admin: mark all lessons watched for a student
  markAllWatchedForStudent(courseId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/courses/${courseId}/students/${userId}/mark-all-watched`, {});
  }

  completeLesson(courseId: string, lessonIndex: number, completed: boolean = true): Observable<any> {
    const userId = localStorage.getItem('userId');
    return this.http.post<any>(`${this.apiUrl}/courses/${courseId}/lessons/${lessonIndex}/complete`, {
      userId,
      completed
    });
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  resolveUploadUrl(url: unknown): string {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('data:image')) return trimmed;

    const apiBase = this.apiUrl.replace(/\/api\/?$/i, '');

    if (trimmed.startsWith('/uploads/')) {
      return `${apiBase}${trimmed}`;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      if (trimmed.includes('/uploads/')) {
        const uploadPath = trimmed.substring(trimmed.indexOf('/uploads/'));
        return `${apiBase}${uploadPath}`;
      }
      if (trimmed.includes('cloudinary.com') && trimmed.includes('/image/upload/')) {
        if (!trimmed.includes('/image/upload/f_auto') && !trimmed.includes('/image/upload/w_')) {
          return trimmed.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_400,c_limit/');
        }
      }
      return trimmed;
    }

    return trimmed;
  }
}
