import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  summarize(text: string): Observable<{ success: boolean; summary: string }> {
    return this.http.post<{ success: boolean; summary: string }>(
      `${this.apiUrl}/ai/summarize`,
      { text }
    );
  }

  chat(question: string, history: ChatMessage[] = []): Observable<{ success: boolean; answer: string }> {
    return this.http.post<{ success: boolean; answer: string }>(
      `${this.apiUrl}/ai/chat`,
      { question, history }
    );
  }

  generateQuiz(
    topic: string,
    numberOfQuestions: number = 5,
    difficulty: string = 'medium',
    grade: string = ''
  ): Observable<{ success: boolean; quiz: Quiz }> {
    return this.http.post<{ success: boolean; quiz: Quiz }>(
      `${this.apiUrl}/ai/generate-quiz`,
      { topic, numberOfQuestions, difficulty, grade }
    );
  }
}
