import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  createQuiz(quizData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/quizzes`, quizData);
  }

  getAllQuizzes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/quizzes`);
  }

  updateQuiz(id: string, quizData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/quizzes/${id}`, quizData);
  }

  deleteQuiz(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/quizzes/${id}`);
  }

  getQuizzesByCourse(courseId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/quizzes/course/${courseId}`);
  }

  submitQuiz(submissionData: any): Observable<any> {
    const userId = localStorage.getItem('userId');
    return this.http.post<any>(`${this.apiUrl}/submissions`, {
      ...submissionData,
      userId
    });
  }

  getAllSubmissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/submissions`);
  }

  issueCertificate(certData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/certificates`, certData);
  }

  getCertificates(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/certificates/${userId}`);
  }
}
