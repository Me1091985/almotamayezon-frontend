import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  getMessages(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/messages/${courseId}`);
  }

  sendMessage(courseId: string, text: string): Observable<any> {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    return this.http.post<any>(`${this.apiUrl}/messages`, {
      courseId,
      userId,
      userName,
      text
    });
  }
}
