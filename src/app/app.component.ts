import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ThemeService } from './services/theme.service';
import { ToastService, Toast } from './services/toast.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'frontend';
  currentYear = new Date().getFullYear();
  showFooter = true;
  toasts: Toast[] = [];
  private toastSub?: Subscription;
  private routerSub?: Subscription;

  private readonly hideFooterRoutes = [
    '/student-dashboard',
    '/admin-dashboard',
    '/laboratory'
  ];

  constructor(
    public themeService: ThemeService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.themeService.init();
    this.updateFooter(this.router.url);
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => this.updateFooter(e.urlAfterRedirects));

    this.toastSub = this.toastService.toasts$.subscribe(t => this.toasts = t);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }

  removeToast(id: number) {
    this.toastService.remove(id);
  }

  private updateFooter(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.showFooter = !this.hideFooterRoutes.some(r => path.startsWith(r))
      && !path.startsWith('/course/');
  }
}
