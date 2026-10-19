import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CardPaymentPayload {
  courseId: string;
  studentId: string;
  studentName: string;
  amount: number;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardHolderName: string;
  discountCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl || 'http://localhost:5005/api';

  constructor(private http: HttpClient) {}

  getPaymentConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payment/config`);
  }

  payWithCard(payload: CardPaymentPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payment/card-charge`, payload);
  }

  createCheckoutSession(courseId: string, studentId: string, discountCode?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payment/create-checkout-session`, {
      courseId,
      studentId,
      discountCode
    });
  }
}
