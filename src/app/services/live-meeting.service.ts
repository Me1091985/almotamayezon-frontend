import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LiveMeeting {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  roomName: string;
  courseId?: string | null;
  courseTitle?: string;
  grade?: string; // 'all', '1', '2', '3', 'prep1', 'prep2', 'prep3'
  instructorName?: string;
  instructorId?: string;
  scheduledAt: string | Date;
  duration?: number;
  status: 'scheduled' | 'live' | 'ended';
  password?: string;
  attendees?: {
    studentId: string;
    studentName: string;
    studentPhone?: string;
    joinedAt: string | Date;
  }[];
  createdAt?: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class LiveMeetingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/live-meetings`;

  private jitsiScriptLoaded = false;
  private jitsiLoadingPromise: Promise<void> | null = null;

  // ── API Operations ──
  getMeetings(): Observable<LiveMeeting[]> {
    return this.http.get<LiveMeeting[]>(this.apiUrl);
  }

  getMeetingById(id: string): Observable<LiveMeeting> {
    return this.http.get<LiveMeeting>(`${this.apiUrl}/${id}`);
  }

  createMeeting(data: Partial<LiveMeeting>): Observable<{ success: boolean; meeting: LiveMeeting }> {
    return this.http.post<{ success: boolean; meeting: LiveMeeting }>(this.apiUrl, data);
  }

  updateMeeting(id: string, data: Partial<LiveMeeting>): Observable<{ success: boolean; meeting: LiveMeeting }> {
    return this.http.put<{ success: boolean; meeting: LiveMeeting }>(`${this.apiUrl}/${id}`, data);
  }

  deleteMeeting(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  joinMeeting(id: string): Observable<{
    success: boolean;
    roomName: string;
    password?: string;
    title: string;
    status: string;
    instructorName: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${id}/join`, {});
  }

  // ── Helper to load Jitsi Meet External API ──
  loadJitsiScript(): Promise<void> {
    if (this.jitsiScriptLoaded || (window as any).JitsiMeetExternalAPI) {
      this.jitsiScriptLoaded = true;
      return Promise.resolve();
    }

    if (this.jitsiLoadingPromise) {
      return this.jitsiLoadingPromise;
    }

    this.jitsiLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        this.jitsiScriptLoaded = true;
        resolve();
      };
      script.onerror = (err) => {
        this.jitsiLoadingPromise = null;
        reject(err);
      };
      document.body.appendChild(script);
    });

    return this.jitsiLoadingPromise;
  }
}
