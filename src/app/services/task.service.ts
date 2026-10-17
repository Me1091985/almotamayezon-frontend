import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  getTasks(): Observable<any[]> {
    const userId = localStorage.getItem('userId');
    return this.http.get<any[]>(`${this.apiUrl}/tasks/${userId}`);
  }

  addTask(title: string): Observable<any> {
    const userId = localStorage.getItem('userId');
    return this.http.post<any>(`${this.apiUrl}/tasks`, {
      userId,
      title,
      status: 'pending'
    });
  }

  updateTaskStatus(taskId: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tasks/${taskId}`, { status });
  }

  toggleTask(taskId: string, currentStatus: string): Observable<any> {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    return this.http.put<any>(`${this.apiUrl}/tasks/${taskId}`, { status: newStatus });
  }

  deleteTask(taskId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tasks/${taskId}`);
  }
}
