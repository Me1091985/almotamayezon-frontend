import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { CourseViewComponent } from './components/course-view/course-view.component';
import { VerifyOtpComponent } from './components/verify-otp/verify-otp.component';
import { AuthGuard } from './guards/auth.guard';
import { AiAssistantComponent } from './components/ai-assistant/ai-assistant.component';
import { LiveMeetingComponent } from './components/live-meeting/live-meeting.component';

const routes: Routes = [
  // 0. الصفحة الرئيسية
  { path: '', component: HomeComponent, title: 'الرئيسية - أكاديمية المتميزون' },

  // 1. المسارات العامة (متاحة للجميع)
  { path: 'login', component: LoginComponent, title: 'تسجيل الدخول - أكاديمية المتميزون' },
  { path: 'register', component: RegisterComponent, title: 'إنشاء حساب جديد - أكاديمية المتميزون' },
  { path: 'verify-otp', component: VerifyOtpComponent, title: 'تفعيل الحساب - أكاديمية المتميزون' },
  { path: 'student-signup', component: RegisterComponent },

  // 2. مسارات المدير (Admin) - محمية بـ Guard ورتبة محددة
  { 
    path: 'admin-dashboard', 
    component: AdminDashboardComponent, 
    canActivate: [AuthGuard],
    data: { role: 'admin' },
    title: 'لوحة تحكم الإدارة - أكاديمية المتميزون'
  },

  // 3. مسارات الطالب (Student) - محمية بـ Guard ورتبة محددة
  { 
    path: 'student-dashboard', 
    component: StudentDashboardComponent, 
    canActivate: [AuthGuard],
    data: { role: 'student' },
    title: 'لوحة تحكم الطالب - أكاديمية المتميزون'
  },

  // 4. مسار تفاصيل الكورس (مشاع للأدمن والطالب المسجل)
  { 
    path: 'course/:id', 
    component: CourseViewComponent, 
    canActivate: [AuthGuard],
    title: 'عرض الدورة - أكاديمية المتميزون'
  },

  // 5. مساعد الذكاء الاصطناعي
  {
    path: 'ai-assistant',
    component: AiAssistantComponent,
    canActivate: [AuthGuard],
    title: 'المساعد الذكي - أكاديمية المتميزون'
  },

  // 6. الحصص المباشرة (Jitsi Meet)
  {
    path: 'live-meeting/:id',
    component: LiveMeetingComponent,
    canActivate: [AuthGuard],
    title: 'الحصة المباشرة - أكاديمية المتميزون'
  },

  // 7. إعادة التوجيه الافتراضي
  { path: '**', redirectTo: '' } 
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      scrollPositionRestoration: 'enabled', 
      anchorScrolling: 'enabled',
      preloadingStrategy: PreloadAllModules,
      useHash: false 
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
