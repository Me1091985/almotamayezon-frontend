import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-verify-otp',
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.css']
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  email = '';
  otp = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isDark = false;
  private themeSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.isDark$.subscribe(d => this.isDark = d);
    const state = window.history.state;
    if (state?.email) {
      this.email = state.email;
    } else {
      this.router.navigate(['/register']);
    }
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  verify(): void {
    if (!this.otp || this.otp.length < 6) {
      this.errorMessage = 'يرجى إدخال كود التحقق كاملاً (6 أرقام)';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: () => {
        this.successMessage = 'تم تفعيل الحساب بنجاح! جاري التوجيه لتسجيل الدخول...';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'كود التحقق غير صحيح، حاول مرة أخرى';
      }
    });
  }
}
