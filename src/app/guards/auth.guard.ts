import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.auth.getToken();
    const userRole = this.auth.getUserRole();
    const expectedRole = route.data['role'];

    // 2. التحقق من وجود جلسة دخول نشطة
    if (this.auth.isLoggedIn()) {
      
      // 3. التحقق من "الرتبة" (Role) هل مسموح لها بدخول هذا المسار؟
      if (expectedRole) {
        if (expectedRole.toLowerCase() !== userRole.toLowerCase()) {
          
          // توجيه ذكي للمستخدم لمكانه الصحيح بدل الطرد
          if (userRole === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else if (userRole === 'student') {
            this.router.navigate(['/student-dashboard']);
          } else {
            this.auth.logout(); 
          }
          return false;
        }
      }

      return true; // مسموح بالمرور
    }

    // إذا لم يسجل دخوله، يوجه لصفحة الـ Login مع حفظ الرابط الذي أراد فتحه
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
    return false;
  }
}
