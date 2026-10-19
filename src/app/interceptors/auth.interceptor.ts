import { Injectable, inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private router = inject(Router);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // 1. جلب التوكن من التخزين المحلي
    const token = localStorage.getItem('token');

    // 2. إذا وجد التوكن، نقوم بحقنه في الهيدرز
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // 3. تمرير الطلب والتقاط التوكن المجدد تلقائياً والتعامل مع انتهاء الجلسة
    return next.handle(request).pipe(
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          // إذا أرسل السيرفر توكن مجدد في الهيدر، نقوم بتحديثه فورياً في المتصفح
          const refreshedToken = event.headers.get('x-refreshed-token');
          if (refreshedToken) {
            localStorage.setItem('token', refreshedToken);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        // إذا كان الخطأ 401 وتوكن المستخدم منتهي، نقوم بتنظيف الجلسة وتوجيهه لتسجيل الدخول
        if (error.status === 401) {
          const isAuthRoute = request.url.includes('/auth/login') || request.url.includes('/auth/signup');
          if (!isAuthRoute && token) {
            console.warn('⚠️ تم رصد انتهاء صلاحية التوكن (401)، جاري توجيه الطالب لتسجيل الدخول.');
            localStorage.removeItem('token');
            this.router.navigate(['/login'], { queryParams: { expired: '1' } });
          }
        }
        return throwError(() => error);
      })
    );
  }
}
