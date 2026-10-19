import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-signup',
  templateUrl: './student-signup.component.html',
  styleUrls: ['./student-signup.component.css']
})
export class StudentSignupComponent {
  // كائن البيانات المربوط بالـ HTML
  userData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '' // أضفنا تأكيد كلمة المرور لزيادة الاحترافية
  };

  loading: boolean = false; // لإظهار مؤشر تحميل على الزرار

  constructor(private http: HttpClient, private router: Router) {}

  onSignup() {
    // 1. التحقق من الخانات
    if (!this.userData.name || !this.userData.email || !this.userData.password) {
      alert('يا هندسة، لازم تملأ كل الخانات الأول! 📝');
      return;
    }

    // 2. التحقق من تطابق كلمة المرور
    if (this.userData.password !== this.userData.confirmPassword) {
      alert('كلمتا المرور غير متطابقتين! ❌');
      return;
    }

    this.loading = true;
    const data = { 
      name: this.userData.name,
      email: this.userData.email,
      password: this.userData.password,
      role: 'student' 
    };

    this.http.post('/api/auth/signup', data).subscribe({
      next: (res: any) => {
        this.loading = false;
        alert('🎉 تم إنشاء حسابك بنجاح يا بطل!');
        
        // حفظ الداتا المهمة عشان الـ Interceptor والداش بورد يشتغلوا فوراً
        if (res.token) {
           localStorage.setItem('token', res.token);
           localStorage.setItem('userId', res.userId);
           localStorage.setItem('userName', res.name);
           
           // توجه فوراً للداش بورد بدلاً من صفحة اللوجن (تجربة مستخدم أفضل)
           this.router.navigate(['/student-dashboard']);
        } else {
           this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        const errorMsg = err.error?.message || 'حدث خطأ، ربما البريد الإلكتروني مسجل مسبقاً';
        alert(errorMsg);
      }
    });
  }
}
