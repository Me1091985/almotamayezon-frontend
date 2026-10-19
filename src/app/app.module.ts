import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // 👈 ضفنا CUSTOM_ELEMENTS_SCHEMA هنا
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { CourseViewComponent } from './components/course-view/course-view.component';
import { StudentSignupComponent } from './components/student-signup/student-signup.component';
import { RegisterComponent } from './components/register/register.component';
import { StudentDashboardComponent } from './components/student-dashboard/student-dashboard.component';
import { CourseDetailsComponent } from './components/course-details/course-details.component';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { CertificateComponent } from './components/certificate/certificate.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HomeComponent } from './components/home/home.component';
import { VerifyOtpComponent } from './components/verify-otp/verify-otp.component';
import { AiAssistantComponent } from './components/ai-assistant/ai-assistant.component';
import { CloudinaryOptimizePipe } from './pipes/cloudinary-optimize.pipe';
import { LiveMeetingComponent } from './components/live-meeting/live-meeting.component';

// 👈 استيراد وتشغيل الـ Swiper لتفعيل السلايدر تلقائياً
import { register } from 'swiper/element/bundle';
register();

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    AdminDashboardComponent,
    CourseViewComponent,
    StudentSignupComponent,
    RegisterComponent,
    StudentDashboardComponent,
    CourseDetailsComponent,
    CertificateComponent,
    HomeComponent,
    VerifyOtpComponent,
    AiAssistantComponent,
    CloudinaryOptimizePipe,
    LiveMeetingComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent],
  
  // 👈 ضفنا الـ schemas هنا عشان الـ HTML يفهم تاجات الـ Swiper الخارجية
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }