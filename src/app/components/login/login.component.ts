import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CourseService } from '../../services/course.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  // Mode: 'login' or 'forgot'
  viewMode: 'login' | 'forgot' = 'login';
  forgotStep: 1 | 2 = 1;

  // Login Data
  loginData = { identifier: '', password: '' };
  loading = false;
  isDark = false;
  showPassword = false;
  errorMessage = '';

  // Forgot Password Data
  resetEmail = '';
  resetOtp = '';
  newPassword = '';
  confirmNewPassword = '';
  showNewPassword = false;
  resetLoading = false;
  resetErrorMessage = '';
  resetSuccessMessage = '';

  supportWhatsapp = '201098744710';
  private loginSubscription?: Subscription;
  private themeSub?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    public themeService: ThemeService,
    private courseService: CourseService
  ) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.isDark$.subscribe(d => this.isDark = d);
    this.loadSupportWhatsapp();
  }

  loadSupportWhatsapp(): void {
    this.courseService.getGlobalSettings().subscribe({
      next: (res) => {
        if (res.supportWhatsapp) {
          this.supportWhatsapp = res.supportWhatsapp.trim();
        }
      },
      error: () => {}
    });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  onClose(): void {
    if (this.viewMode === 'forgot') {
      this.switchToLogin();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  switchToForgot(): void {
    this.viewMode = 'forgot';
    this.forgotStep = 1;
    this.resetErrorMessage = '';
    this.resetSuccessMessage = '';
    // Pre-fill email if user entered an email in the login box
    if (this.loginData.identifier && this.loginData.identifier.includes('@')) {
      this.resetEmail = this.loginData.identifier.trim();
    }
  }

  switchToLogin(): void {
    this.viewMode = 'login';
    this.forgotStep = 1;
    this.errorMessage = '';
    this.resetErrorMessage = '';
    this.resetSuccessMessage = '';
  }

  onLogin(): void {
    this.errorMessage = '';

    if (!this.loginData.identifier.trim()) {
      this.errorMessage = 'يرجى إدخال رقم الجوال أو البريد الإلكتروني!';
      return;
    }
    if (this.loginData.password.length < 6) {
      this.errorMessage = 'كلمة المرور يجب أن لا تقل عن 6 رموز!';
      return;
    }

    this.loading = true;

    this.loginSubscription = this.auth.login(this.loginData).subscribe({
      next: (userData: any) => {
        const role = userData?.role || 'student';
        const targetRoute = role.toLowerCase().includes('admin') ? '/admin-dashboard' : '/student-dashboard';

        this.router.navigateByUrl(targetRoute).then(success => {
          if (!success) {
            window.location.href = targetRoute;
          }
          this.loading = false;
        });
      },
      error: (err: any) => {
        this.loading = false;
        const serverError = err.error?.error;
        if (serverError === 'User not found' || serverError === 'Invalid credentials' || serverError?.includes('بيانات')) {
          this.errorMessage = 'بيانات الدخول غير صحيحة، يرجى التأكد من رقم الجوال أو كلمة المرور.';
        } else {
          this.errorMessage = serverError || 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى.';
        }
      }
    });
  }

  // 1. Send OTP to Gmail
  onSendResetEmail(): void {
    this.resetErrorMessage = '';
    this.resetSuccessMessage = '';

    if (!this.resetEmail.trim()) {
      this.resetErrorMessage = 'يرجى إدخال عنوان البريد الإلكتروني (Gmail).';
      return;
    }

    this.resetLoading = true;
    this.auth.forgotPassword(this.resetEmail.trim()).subscribe({
      next: (res: any) => {
        this.resetLoading = false;
        this.resetSuccessMessage = res.message || 'تم إرسال رمز إعادة التعيين بنجاح!';
        this.forgotStep = 2;
      },
      error: (err: any) => {
        this.resetLoading = false;
        console.error(err);
        this.resetErrorMessage = err.error?.error || 'حدث خطأ أثناء إرسال البريد الإلكتروني، تأكد من صحة البريد.';
      }
    });
  }

  // 2. Confirm OTP & New Password
  onConfirmResetPassword(): void {
    this.resetErrorMessage = '';
    this.resetSuccessMessage = '';

    if (!this.resetOtp.trim()) {
      this.resetErrorMessage = 'يرجى إدخال رمز التحقق (OTP) المكون من 6 أرقام.';
      return;
    }

    if (!this.newPassword) {
      this.resetErrorMessage = 'يرجى إدخال كلمة المرور الجديدة.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.resetErrorMessage = 'كلمة المرور يجب أن لا تقل عن 6 رموز.';
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.resetErrorMessage = 'تأكيد كلمة المرور غير متطابق!';
      return;
    }

    this.resetLoading = true;
    this.auth.confirmResetPassword({
      email: this.resetEmail.trim(),
      otp: this.resetOtp.trim(),
      newPassword: this.newPassword
    }).subscribe({
      next: (res: any) => {
        this.resetLoading = false;
        this.resetSuccessMessage = res.message || 'تم تغيير كلمة المرور بنجاح!';
        setTimeout(() => {
          this.switchToLogin();
          this.loginData.identifier = this.resetEmail.trim();
          this.loginData.password = '';
        }, 1800);
      },
      error: (err: any) => {
        this.resetLoading = false;
        console.error(err);
        this.resetErrorMessage = err.error?.error || 'حدث خطأ أثناء إعادة تعيين كلمة المرور.';
      }
    });
  }

  ngOnDestroy(): void {
    this.loginSubscription?.unsubscribe();
    this.themeSub?.unsubscribe();
  }
}


