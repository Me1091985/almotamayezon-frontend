import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  logSession(duration: number): Observable<any> {
    const userId = localStorage.getItem('userId');
    return this.http.post<any>(`${this.apiUrl}/sessions`, {
      userId,
      duration
    });
  }

  getSessionStats(): Observable<any> {
    const userId = localStorage.getItem('userId');
    return this.http.get<any[]>(`${this.apiUrl}/sessions/${userId}`).pipe(
      map(sessions => {
        const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
        return {
          totalSessions: sessions.length,
          totalMinutes: totalMinutes
        };
      })
    );
  }
}
