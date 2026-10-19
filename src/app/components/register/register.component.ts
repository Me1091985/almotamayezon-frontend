import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  successMessage = '';
  isDark = false;
  private themeSub?: Subscription;

  // Form Fields
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  selectedCountry = 'المملكة العربية السعودية';
  countryCode = '+966';
  whatsappPhone = '';

  telegramGroupUrl = 'https://t.me/Drmohamedelshereef';

  countries = [
    { name: 'المملكة العربية السعودية', code: '+966' },
    { name: 'جمهورية مصر العربية', code: '+20' },
    { name: 'الإمارات العربية المتحدة', code: '+971' },
    { name: 'الكويت', code: '+965' },
    { name: 'سلطنة عمان', code: '+968' },
    { name: 'قطر', code: '+974' },
    { name: 'البحرين', code: '+973' },
    { name: 'الأردن', code: '+962' },
    { name: 'العراق', code: '+964' },
    { name: 'دولة أخرى', code: '+' }
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.isDark$.subscribe(d => this.isDark = d);
  }

  onCountryChange(): void {
    const c = this.countries.find(item => item.name === this.selectedCountry);
    if (c) {
      this.countryCode = c.code;
    }
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  openTelegram(): void {
    window.open(this.telegramGroupUrl, '_blank');
  }

  onClose(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  onRegister(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.fullName.trim()) {
      this.errorMessage = 'يرجى إدخال الاسم الكامل.';
      return;
    }

    if (!this.email.trim()) {
      this.errorMessage = 'يرجى إدخال البريد الإلكتروني.';
      return;
    }

    if (!this.password) {
      this.errorMessage = 'يرجى إدخال كلمة المرور.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'كلمة المرور يجب أن لا تقل عن 6 رموز.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'تأكيد كلمة المرور غير متطابق!';
      return;
    }

    if (!this.whatsappPhone.trim()) {
      this.errorMessage = 'يرجى إدخال رقم الواتس الخاص بالطالب.';
      return;
    }

    this.loading = true;

    // Smart phone formatting
    let rawPhone = this.whatsappPhone.trim();
    // Check if entered Egyptian prefix while another country selected
    if (/^01[0125]/.test(rawPhone) && this.countryCode !== '+20') {
      this.countryCode = '+20';
      this.selectedCountry = 'جمهورية مصر العربية';
    }

    const cleanPhone = rawPhone.replace(/^0+/, '');
    const codeNum = this.countryCode.replace('+', '').trim();
    const formattedPhone = (codeNum && !rawPhone.startsWith(codeNum)) ? `${codeNum}${cleanPhone}` : rawPhone;

    const finalData = {
      name: this.fullName.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      phone: formattedPhone,
      governorate: this.selectedCountry,
      role: 'student'
    };

    this.auth.signup(finalData).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'تم إنشاء الحساب بنجاح! جاري تحويلك لتسجيل الدخول...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1200);
      },
      error: (err) => {
        this.loading = false;
        console.error('Signup error details:', err);
        const serverError = err.error?.error || err.error?.message || (typeof err.error === 'string' ? err.error : null);
        this.errorMessage = serverError || 'حدث خطأ أثناء التسجيل، تأكد من صحة البيانات أو أن البريد والرقم غير مسجلين مسبقاً.';
      }
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }
}

