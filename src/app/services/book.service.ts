import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  getBooks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/books`);
  }

  addBook(bookData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/books`, bookData);
  }

  updateBook(id: string, bookData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/books/${id}`, bookData);
  }

  updateBookImportance(id: string, importance: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/books/${id}/importance`, { importance });
  }

  deleteBook(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/books/${id}`);
  }

  createOrder(orderData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/book-orders`, orderData);
  }

  getOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/book-orders`);
  }

  updateOrderStatus(id: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/book-orders/${id}/status`, { status });
  }
}
