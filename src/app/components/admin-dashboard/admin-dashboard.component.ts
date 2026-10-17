import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService } from '../../services/course.service';
import { QuizService } from '../../services/quiz.service';
import { ThemeService } from '../../services/theme.service';
import { StreakService } from '../../services/streak.service';
import { BookService } from '../../services/book.service';
import { LiveMeetingService, LiveMeeting } from '../../services/live-meeting.service';
import { Subscription } from 'rxjs';

// نموذج بيانات الكورس
interface Course {
  id:          string;
  title:       string;
  description: string;
  category:    string;
  grade?:      string;
  youtubeUrl?: string;
  lessons:     { title: string, url: string, scheduledAt?: string | null }[];
  units?:      { title: string, lessons: { title: string, url: string, scheduledAt?: string | null }[] }[];
  price:       number;
  centerPrice?: number;
  thumbnail:   string;
  imageUrl?:   string;
  instructor:  string;
  instructorId?:   string;
  instructorName?: string;
  resources?:  { title: string, type: string, url: string, importance?: string }[];
  students?:   string[];
  createdAt:   any;
}

interface CourseForm {
  title:       string;
  description: string;
  category:    string;
  grade:       string;
  lessons:     { title: string, url: string, scheduledAt?: string | null }[];
  price:       number;
  centerPrice: number;
  thumbnail?:  string;
  resources:   { title: string, type: string, url: string, importance?: string }[];
  instructorName?: string;
  instructorId?:   string;
  units:       { title: string, lessons: { title: string, url: string, scheduledAt?: string | null }[] }[];
  lessonsCount?: number | null;
  unitsCount?:   number | null;
  certificatesEnabled?: boolean;
}

@Component({
  selector:    'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls:   ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // ── بيانات المشرف ──────────────────────────────────
  adminName: string = '';

  // ── قوائم البيانات ─────────────────────────────────
  courses:  Course[] = [];
  students: any[]    = [];
  requests: any[]    = [];
  submissions: any[] = []; // لنتائج الكويزات
  leaderboard: any[] = [];
  leaderboardGrade: string = '1';
  isLeaderboardLoading = false;

  // ── حالات واجهة المستخدم ───────────────────────────────────
  activeTab:     'courses' | 'requests' | 'students' | 'quizzes' | 'results' | 'leaderboard' | 'settings' | 'followup' | 'subscribers' | 'discounts' | 'books' | 'bookOrders' | 'groups' | 'live' = 'courses';
  selectedSubscribersTeacher: string = 'all';
  selectedSubscribersCourse: string = '';
  selectedSubscribersStatusFilter: 'all' | 'subscribed' | 'unsubscribed' = 'all';
  selectedSubscribersGrade: string = '';
  subscribersSearchQuery: string = '';
  expandedCourseId: string | null = null;

  // ── الحصص المباشرة (Jitsi Meet) ─────────────────────
  liveMeetings: any[] = [];
  isLiveMeetingsLoading: boolean = false;
  liveMeetingFilter: 'all' | 'live' | 'scheduled' | 'ended' = 'all';
  showCreateMeetingModal: boolean = false;
  showAttendeesModal: boolean = false;
  selectedMeetingAttendees: any[] = [];
  selectedMeetingTitle: string = '';
  isCreatingMeeting: boolean = false;
  meetingFormError: string = '';
  newMeetingForm = {
    title: '',
    description: '',
    courseId: '',
    grade: '',
    instructorName: 'د. محمد الشريف',
    scheduledAt: '',
    duration: 60,
    password: ''
  };

  // ── فلترة سجل الطلاب ──────────────────────────────────
  studentsSearchQuery: string = '';
  selectedStudentsGrade: string = '';
  selectedStudentsVerification: string = 'all';
  selectedStudentsSubscription: 'all' | 'subscribed' | 'unsubscribed' = 'all';

  get filteredStudents(): any[] {
    let list = this.students || [];

    if (this.selectedStudentsGrade) {
      list = list.filter(s => s.grade === this.selectedStudentsGrade);
    }

    if (this.selectedStudentsVerification === 'verified') {
      list = list.filter(s => s.isVerified);
    } else if (this.selectedStudentsVerification === 'unverified') {
      list = list.filter(s => !s.isVerified);
    }

    if (this.selectedStudentsSubscription === 'subscribed') {
      list = list.filter(s => this.getEnrolledCoursesCount(s.id || s._id) > 0);
    } else if (this.selectedStudentsSubscription === 'unsubscribed') {
      list = list.filter(s => this.getEnrolledCoursesCount(s.id || s._id) === 0);
    }

    if (this.studentsSearchQuery && this.studentsSearchQuery.trim()) {
      const q = this.studentsSearchQuery.trim().toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q) ||
        (s.parentPhone || '').includes(q) ||
        (s.governorate || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  // ── إدارة الكتب ──────────────────────────────────

  books: any[] = [];
  bookOrders: any[] = [];
  isBooksLoading: boolean = false;
  isBookOrdersLoading: boolean = false;
  selectedBookOrderFilter: string = 'all';
  isBookCoverUploading: boolean = false;
  isAddingBook: boolean = false;
  bookForm = {
    title: '',
    description: '',
    price: 0,
    imageUrl: '',
    instructorName: 'د. محمد الشريف', // default
    subject: 'القدرات والتحصيلي', // default
    importance: 'normal' // 'essential' (ضروري) or 'normal' (عادي)
  };

  // ── متابعة الطلاب والإعدادات ────────────────────────
  selectedFollowupStudent: any = null;
  followupProgress: any[] = [];
  isFollowupLoading: boolean = false;
  followupSearchQuery: string = '';
  selectedFollowupGrade: string = '';
  globalMessage: string = '';
  subscriptionInstructions: string = '';
  globalNotification: string = '';
  supportWhatsapp: string = '';
  homeVideoUrl: string = '';
  gradeGroups: { [key: string]: string } = {
    'prep1': '',
    'prep2': '',
    'prep3': '',
    '1': '',
    '2': '',
    '3': '',
    'univ': ''
  };
  teacherPayments: { [key: string]: { name: string; number: string; message: string } } = {
    'mohamed_elsharif': {
      name: 'د. محمد الشريف (خبير القدرات والتحصيلي)',
      number: '0500000000',
      message: 'الدفع لدورات د. محمد الشريف يتم عبر التحويل البنكي أو STC Pay. يرجى إرفاق إشعار التحويل لتأكيد الاشتراك.'
    }
  };
  bankSettings = {
    bankName: 'مصرف الراجحي',
    accountHolder: 'منصة المتميزون التعليمية',
    accountNumber: '',
    iban: 'SA0000000000000000000000',
    walletNumber: '',
    walletType: 'STC Pay / InstaPay',
    transferNotes: 'يرجى كتابة اسم الطالب ورقم الجوال في خانة سبب التحويل لسرعة التفعيل الفوري.'
  };
  gatewaySettings = {
    provider: 'moyasar',
    isLive: false,
    publishableKey: '',
    secretKey: '',
    currency: 'SAR'
  };
  isSidebarOpen: boolean = false;
  isLoading:     boolean = true;
  showModal:     boolean = false;
  showCourseFormPage: boolean = false;
  selectedCourseUnits: any[] = [];
  isEditMode:    boolean = false;
  isSaving:      boolean = false;
  errorMessage:  string  = '';
  successMessage:string  = '';
  isDark:        boolean = false;
  private themeSub?: Subscription;

  // ── Discount Codes ───────────────────────────────────────────────
  discountCodes: any[] = [];
  isDiscountsLoading = false;
  discountForm = {
    code: '',
    discountPercent: 10,
    maxUses: 0,
    expiresAt: '',
    description: '',
  };
  discountFormError = '';
  discountFormSuccess = '';
  isCreatingDiscount = false;

  // ── كورس قيد التعديل ───────────────────────────────
  editingCourseId: string = '';

  // ── بيانات الفورم (إضافة / تعديل) ─────────────────
  courseForm: CourseForm = {
    title:       '',
    description: '',
    category:    '',
    grade:       '',
    lessons:     [],
    price:       0,
    centerPrice: 0,
    thumbnail:   '',
    resources:   [],
    instructorName: 'د. محمد الشريف',
    instructorId: 'mohamed_elsharif',
    units:       [{ title: 'الوحدة الأولى', lessons: [{ title: 'المقدمة', url: '' }] }],
    lessonsCount: null,
    unitsCount:   null,
    certificatesEnabled: false
  };

  grades: { value: string; label: string }[] = [
    { value: '', label: 'جميع الصفوف' },
    { value: 'prep1', label: 'الصف الأول الإعدادي' },
    { value: 'prep2', label: 'الصف الثاني الإعدادي' },
    { value: 'prep3', label: 'الصف الثالث الإعدادي' },
    { value: '1', label: 'الصف الأول الثانوي' },
    { value: '2', label: 'الصف الثاني الثانوي' },
    { value: '3', label: 'الصف الثالث الثانوي' },
    { value: 'univ', label: 'المرحلة الجامعية' }
  ];

  leaderboardGrades: { value: string; label: string }[] = [
    { value: 'prep1', label: 'الصف الأول الإعدادي' },
    { value: 'prep2', label: 'الصف الثاني الإعدادي' },
    { value: 'prep3', label: 'الصف الثالث الإعدادي' },
    { value: '1', label: 'الصف الأول الثانوي' },
    { value: '2', label: 'الصف الثاني الثانوي' },
    { value: '3', label: 'الصف الثالث الثانوي' },
    { value: 'univ', label: 'المرحلة الجامعية' }
  ];

  // الفئات المتاحة للإختيار
  categories: string[] = [
    'برمجة', 'تصميم', 'أعمال', 'لغات', 'علوم', 'رياضيات', 'موسيقى', 'عام'
  ];

  constructor(
    private router: Router,
    private auth:   AuthService,
    private courseService: CourseService,
    private quizService: QuizService,
    public  themeService: ThemeService,
    private streakService: StreakService,
    private bookService: BookService,
    private liveMeetingService: LiveMeetingService
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // تهيئة الصفحة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ngOnInit(): void {
    const role = this.auth.getUserRole();
    if (role !== 'admin') {
      this.auth.logout();
      return;
    }
    this.adminName = this.auth.getUserName();
    this.loadCourses();
    this.loadStudents();
    this.loadRequests();
    this.loadGlobalSettings();
    this.loadLiveMeetings();
    this.themeSub = this.themeService.isDark$.subscribe(d => this.isDark = d);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Discount Codes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  loadDiscountCodes(): void {
    this.isDiscountsLoading = true;
    this.streakService.getDiscountCodes().subscribe({
      next: (codes) => { this.discountCodes = codes; this.isDiscountsLoading = false; },
      error: () => { this.isDiscountsLoading = false; }
    });
  }

  createDiscountCode(): void {
    this.discountFormError = '';
    this.discountFormSuccess = '';
    if (!this.discountForm.code.trim()) { this.discountFormError = 'أدخل الكود'; return; }
    if (!this.discountForm.discountPercent || this.discountForm.discountPercent < 1) { this.discountFormError = 'نسبة الخصم يجب أن تكون 1% على الأقل'; return; }
    this.isCreatingDiscount = true;
    this.streakService.createDiscountCode(this.discountForm).subscribe({
      next: (code) => {
        this.discountCodes.unshift(code);
        this.discountFormSuccess = `تم إنشاء الكود "${code.code}" بنجاح ✅`;
        this.discountForm = { code: '', discountPercent: 10, maxUses: 0, expiresAt: '', description: '' };
        this.isCreatingDiscount = false;
      },
      error: (err) => {
        this.discountFormError = err.error?.error || 'حدث خطأ';
        this.isCreatingDiscount = false;
      }
    });
  }

  deleteDiscountCode(id: string): void {
    if (!confirm('هل تريد حذف هذا الكود؟')) return;
    this.streakService.deleteDiscountCode(id).subscribe({
      next: () => { this.discountCodes = this.discountCodes.filter(c => c._id !== id); },
      error: () => {}
    });
  }

  toggleDiscountCode(id: string): void {
    this.streakService.toggleDiscountCode(id).subscribe({
      next: (updated) => {
        const idx = this.discountCodes.findIndex(c => c._id === id);
        if (idx > -1) this.discountCodes[idx] = updated;
      },
      error: () => {}
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // متابعة الطلاب
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  get filteredFollowupStudents(): any[] {
    let list = this.students || [];
    
    // 1. Filter by grade if selected
    if (this.selectedFollowupGrade) {
      list = list.filter(s => s.grade === this.selectedFollowupGrade);
    }
    
    // 2. Filter by search query if typed
    if (this.followupSearchQuery.trim()) {
      const q = this.followupSearchQuery.toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    }
    
    return list;
  }

  openStudentFollowup(student: any): void {
    this.selectedFollowupStudent = student;
    this.followupProgress = [];
    this.isFollowupLoading = true;

    // Get courses this student is enrolled in
    const enrolledCourses = this.courses.filter(c =>
      c['students'] && c['students'].includes(student.id)
    );

    if (enrolledCourses.length === 0) {
      this.isFollowupLoading = false;
      return;
    }

    let completed = 0;
    enrolledCourses.forEach(course => {
      this.courseService.getStudentProgress(course.id, student.id).subscribe({
        next: (progress: any) => {
          this.followupProgress.push({
            courseTitle: course.title,
            courseId: course.id,
            totalLessons: progress.totalLessons,
            completedLessons: progress.completedLessons?.length || 0,
            allVideosWatched: progress.allVideosWatched,
            quizzes: progress.quizzes || [],
            allQuizzesPassed: progress.allQuizzesPassed,
            isEligible: progress.isEligible
          });
          completed++;
          if (completed === enrolledCourses.length) {
            this.isFollowupLoading = false;
          }
        },
        error: () => {
          completed++;
          if (completed === enrolledCourses.length) {
            this.isFollowupLoading = false;
          }
        }
      });
    });
  }

  markCourseAllWatched(item: any): void {
    if (!this.selectedFollowupStudent || !item.courseId) return;
    const student = this.selectedFollowupStudent;
    if (confirm(`هل أنت تأكد من تعليم جميع فيديوهات كورس "${item.courseTitle}" كمشاهدة للطالب ${student.name}؟`)) {
      this.courseService.markAllWatchedForStudent(item.courseId, student.id).subscribe({
        next: () => {
          this.showSuccess('تم تحديث مشاهدات الطالب بنجاح!');
          this.openStudentFollowup(student);
        },
        error: () => this.showError('حدث خطأ أثناء تحديث المشاهدات')
      });
    }
  }

  closeStudentFollowup(): void {
    this.selectedFollowupStudent = null;
    this.followupProgress = [];
  }

  getEnrolledCoursesCount(studentId: string): number {
    return this.courses.filter(c => c.students && c.students.includes(studentId)).length;
  }

  printStudentReport(): void {
    const s = this.selectedFollowupStudent;
    if (!s || this.followupProgress.length === 0) return;

    const gradeMap: any = { 
      'prep1': 'الصف الأول الإعدادي', 
      'prep2': 'الصف الثاني الإعدادي', 
      'prep3': 'الصف الثالث الإعدادي', 
      '1': 'الصف الأول الثانوي', 
      '2': 'الصف الثاني الثانوي', 
      '3': 'الصف الثالث الثانوي', 
      'univ': 'المرحلة الجامعية' 
    };
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    let coursesHTML = '';
    this.followupProgress.forEach(item => {
      const videoPercent = item.totalLessons > 0
        ? Math.round((item.completedLessons / item.totalLessons) * 100) : 0;

      let quizzesHTML = '';
      if (item.quizzes && item.quizzes.length > 0) {
        quizzesHTML = `
          <table class="quiz-table">
            <thead><tr><th>الاختبار</th><th>الدرجة</th><th>الحالة</th></tr></thead>
            <tbody>
              ${item.quizzes.map((q: any) => `
                <tr>
                  <td>${q.title}</td>
                  <td>${q.maxScore}%</td>
                  <td class="${q.passed ? 'pass' : q.solved ? 'fail' : 'pending'}">${q.passed ? 'ناجح ✅' : q.solved ? 'راسب ❌' : 'لم يحل'}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      } else {
        quizzesHTML = '<p class="no-quiz">لا توجد اختبارات لهذا الكورس</p>';
      }

      coursesHTML += `
        <div class="course-card">
          <div class="course-header">
            <span class="course-title">${item.courseTitle}</span>
            <span class="badge ${item.isEligible ? 'eligible' : 'pending'}">${item.isEligible ? 'مؤهل للشهادة 🏆' : 'قيد الإنجاز ⏳'}</span>
          </div>
          <div class="progress-section">
            <div class="progress-label">
              <span>🎬 الفيديوهات</span>
              <span>${item.completedLessons} / ${item.totalLessons} (${videoPercent}%)</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${item.allVideosWatched ? 'green' : 'blue'}" style="width:${videoPercent}%"></div>
            </div>
            <p class="progress-note">${item.allVideosWatched ? '✅ أتم جميع الفيديوهات' : 'لم يتم مشاهدة الفيديوهات بالكامل'}</p>
          </div>
          <div class="quizzes-section">
            <h4>📝 الاختبارات</h4>
            ${quizzesHTML}
          </div>
        </div>`;
    });

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الطالب - ${s.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1e293b; background: #fff; padding: 30px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
          .logo { font-size: 22px; font-weight: 900; color: #6366f1; }
          .logo span { display: block; font-size: 11px; color: #94a3b8; font-weight: 400; margin-top: 2px; }
          .report-date { font-size: 12px; color: #64748b; text-align: left; }
          .student-card { background: #f8faff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .student-card h2 { grid-column: 1/-1; font-size: 20px; color: #1e293b; margin-bottom: 8px; }
          .info-row { font-size: 13px; color: #475569; }
          .info-row strong { color: #1e293b; }
          .section-title { font-size: 16px; font-weight: 700; color: #6366f1; margin-bottom: 14px; border-right: 4px solid #6366f1; padding-right: 10px; }
          .course-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
          .course-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
          .course-title { font-size: 15px; font-weight: 700; color: #1e293b; }
          .badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
          .badge.eligible { background: #dcfce7; color: #16a34a; }
          .badge.pending { background: #fef3c7; color: #d97706; }
          .progress-section { margin-bottom: 14px; }
          .progress-label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #374151; }
          .progress-bar-bg { background: #e5e7eb; border-radius: 999px; height: 10px; overflow: hidden; margin-bottom: 4px; }
          .progress-bar-fill { height: 100%; border-radius: 999px; }
          .progress-bar-fill.green { background: #22c55e; }
          .progress-bar-fill.blue { background: #6366f1; }
          .progress-note { font-size: 11px; color: #6b7280; margin-top: 2px; }
          .quizzes-section h4 { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; }
          .quiz-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .quiz-table th { background: #f1f5f9; padding: 6px 10px; text-align: right; font-weight: 600; color: #475569; }
          .quiz-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
          .pass { color: #16a34a; font-weight: 700; }
          .fail { color: #dc2626; font-weight: 700; }
          .pending { color: #9ca3af; }
          .no-quiz { font-size: 12px; color: #9ca3af; font-style: italic; }
          .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 15px; } .course-card { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🎓 المتميزون<span>أكاديمية المتميزون التعليمية</span></div>
          <div class="report-date">تاريخ التقرير: ${today}</div>
        </div>

        <div class="student-card">
          <h2>${s.name}</h2>
          <div class="info-row"><strong>رقم الهاتف:</strong> ${s.phone || '—'}</div>
          <div class="info-row"><strong>البريد الإلكتروني:</strong> ${s.email || '—'}</div>
          <div class="info-row"><strong>الصف الدراسي:</strong> ${gradeMap[s.grade] || '—'}</div>
          <div class="info-row"><strong>الجنس:</strong> ${s.gender === 'male' ? 'ذكر' : s.gender === 'female' ? 'أنثى' : '—'}</div>
          <div class="info-row"><strong>المحافظة:</strong> ${s.governorate || '—'}</div>
          <div class="info-row"><strong>إجمالي الكورسات:</strong> ${this.followupProgress.length} كورس</div>
        </div>

        <div class="section-title">تفاصيل تقدم الطالب</div>
        ${coursesHTML}

        <div class="footer">تم إنشاء هذا التقرير تلقائياً بواسطة منصة د. محمد الشريف &mdash; جميع الحقوق محفوظة</div>
      </body>
      </html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }

  printSingleStudentCard(student: any): void {
    if (!student) return;
    const gradeMap: any = { 
      'prep1': 'الصف الأول الإعدادي',
      'prep2': 'الصف الثاني الإعدادي',
      'prep3': 'الصف الثالث الإعدادي',
      '1': 'الصف الأول الثانوي', 
      '2': 'الصف الثاني الثانوي والبكالوريا', 
      '3': 'الصف الثالث الثانوي', 
      'univ': 'المرحلة الجامعية' 
    };
    
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const gradeName = gradeMap[student.grade] || 'غير محدد';
    const studentPhone = student.phone || '—';
    const studentEmail = student.email || '—';
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>بطاقة طالب - ${student.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1e293b; background: #fff; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .card { 
            width: 400px; 
            border: 2px solid #6366f1; 
            border-radius: 16px; 
            padding: 24px; 
            background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15);
            position: relative;
            overflow: hidden;
          }
          .card::before {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 8px;
            background: linear-gradient(90deg, #6366f1, #a855f7);
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 1px solid #e2e8f0; 
            padding-bottom: 12px; 
            margin-bottom: 20px; 
          }
          .logo { font-size: 18px; font-weight: 800; color: #6366f1; }
          .logo span { font-size: 10px; color: #94a3b8; display: block; font-weight: 400; }
          .title { font-size: 14px; color: #6366f1; font-weight: 700; background: #eeefff; padding: 4px 12px; border-radius: 999px; }
          .avatar-placeholder {
            width: 70px;
            height: 70px;
            background: #e0e7ff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: #6366f1;
            margin: 0 auto 16px auto;
            border: 3px solid #fff;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          .student-name { text-align: center; font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 16px; }
          .info-list { display: flex; flex-direction: column; gap: 10px; }
          .info-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 8px 12px; 
            background: #fff; 
            border: 1px solid #e2e8f0; 
            border-radius: 10px;
            font-size: 13px;
          }
          .info-label { color: #64748b; font-weight: 600; }
          .info-value { color: #1e293b; font-weight: 700; }
          .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; }
          @media print {
            body { background: none; padding: 0; display: block; }
            .card { box-shadow: none; margin: 20px auto; page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="logo">🎓 المتميزون<span>أكاديمية المتميزون التعليمية</span></div>
            <div class="title">بطاقة طالب</div>
          </div>
          <div class="avatar-placeholder">👨‍🎓</div>
          <div class="student-name">${student.name}</div>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">السنة الدراسية:</span>
              <span class="info-value">${gradeName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">رقم الهاتف:</span>
              <span class="info-value" dir="ltr">${studentPhone}</span>
            </div>
            <div class="info-item">
              <span class="info-label">البريد الإلكتروني:</span>
              <span class="info-value">${studentEmail}</span>
            </div>
            <div class="info-item">
              <span class="info-label">كود الطالب ID:</span>
              <span class="info-value">${student.id || student._id || '—'}</span>
            </div>
          </div>
          <div class="footer">تاريخ الطباعة: ${today}</div>
        </div>
      </body>
      </html>`;
      
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }

  printStudentsList(): void {
    const list = this.filteredFollowupStudents;
    if (list.length === 0) return;
    
    const gradeMap: any = { 
      'prep1': 'الصف الأول الإعدادي',
      'prep2': 'الصف الثاني الإعدادي',
      'prep3': 'الصف الثالث الإعدادي',
      '1': 'الصف الأول الثانوي', 
      '2': 'الصف الثاني الثانوي والبكالوريا', 
      '3': 'الصف الثالث الثانوي', 
      'univ': 'المرحلة الجامعية' 
    };
    
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    let selectedGradeName = 'جميع السنوات الدراسية';
    if (this.selectedFollowupGrade) {
      selectedGradeName = gradeMap[this.selectedFollowupGrade] || 'السنة المحددة';
    }
    
    let tableRows = '';
    list.forEach((s, index) => {
      const gName = gradeMap[s.grade] || 'غير محدد';
      tableRows += `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${s.name}</strong></td>
          <td dir="ltr">${s.phone || '—'}</td>
          <td>${gName}</td>
          <td>${s.email || '—'}</td>
          <td>${this.getEnrolledCoursesCount(s.id || s._id)} كورس</td>
        </tr>
      `;
    });
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الطلاب - ${selectedGradeName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; color: #1e293b; background: #fff; padding: 30px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 20px; font-weight: 800; color: #6366f1; }
          .logo span { font-size: 11px; color: #94a3b8; display: block; font-weight: 400; margin-top: 2px; }
          .title { font-size: 18px; font-weight: 700; color: #1e293b; }
          .report-info { margin-bottom: 20px; font-size: 13px; color: #475569; display: flex; justify-content: space-between; background: #f8faff; padding: 12px 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background: #6366f1; color: #fff; font-weight: 700; padding: 10px; text-align: right; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print {
            body { padding: 15px; }
            th { background-color: #6366f1 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🎓 المتميزون<span>أكاديمية المتميزون التعليمية</span></div>
          <div class="title">تقرير سجل الطلاب</div>
        </div>
        
        <div class="report-info">
          <div><strong>الفلترة الحالية:</strong> ${selectedGradeName}</div>
          <div><strong>إجمالي عدد الطلاب:</strong> ${list.length} طالب</div>
          <div><strong>تاريخ التقرير:</strong> ${today}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>اسم الطالب</th>
              <th>رقم الهاتف</th>
              <th>الصف الدراسي</th>
              <th>البريد الإلكتروني</th>
              <th>الكورسات المسجلة</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="footer">تم إنشاء هذا التقرير تلقائياً بواسطة منصة د. محمد الشريف &mdash; جميع الحقوق محفوظة</div>
      </body>
      </html>
    `;
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }

  loadGlobalSettings() {
    this.courseService.getGlobalSettings().subscribe({
      next: (res) => {
        this.globalMessage = res.welcomeMessage || '';
        this.subscriptionInstructions = res.subscriptionInstructions || '';
        this.globalNotification = res.globalNotification || '';
        this.supportWhatsapp = res.supportWhatsapp || '201098744710';
        this.homeVideoUrl = res.homeVideoUrl || '';
        this.gradeGroups = {
          'prep1': res.gradeGroups?.['prep1'] || '',
          'prep2': res.gradeGroups?.['prep2'] || '',
          'prep3': res.gradeGroups?.['prep3'] || '',
          '1': res.gradeGroups?.['1'] || '',
          '2': res.gradeGroups?.['2'] || '',
          '3': res.gradeGroups?.['3'] || '',
          'univ': res.gradeGroups?.['univ'] || ''
        };
        if (res.teacherPayments) {
          this.teacherPayments = {
            ...this.teacherPayments,
            ...res.teacherPayments
          };
        }
        if (res.bankSettings) {
          this.bankSettings = { ...this.bankSettings, ...res.bankSettings };
        }
        if (res.gatewaySettings) {
          this.gatewaySettings = { ...this.gatewaySettings, ...res.gatewaySettings };
        }
      },
      error: (e) => console.error('Err loading settings:', e)
    });
  }

  saveGlobalMessage() {
    this.isSaving = true;
    this.courseService.saveGlobalSettings({
      welcomeMessage: this.globalMessage,
      subscriptionInstructions: this.subscriptionInstructions,
      globalNotification: this.globalNotification,
      supportWhatsapp: this.supportWhatsapp,
      homeVideoUrl: this.homeVideoUrl,
      gradeGroups: this.gradeGroups,
      teacherPayments: this.teacherPayments,
      bankSettings: this.bankSettings,
      gatewaySettings: this.gatewaySettings
    }).subscribe({
      next: () => {
        this.successMessage = 'تم تحديث الإعدادات بنجاح!';
        alert('✅ تم حفظ كافة الإعدادات والجروبات بنجاح!');
        setTimeout(() => this.successMessage = '', 3000);
        this.isSaving = false;
      },
      error: (e) => {
        console.error('Err saving settings:', e);
        this.errorMessage = 'فشل في حفظ الإعدادات.';
        alert('❌ فشل حفظ الإعدادات.');
        this.isSaving = false;
      }
    });
  }
  // ──────────────────────────────────────────────────
  // التبديل بين التبويبات
  // ──────────────────────────────────────────────────
  switchTab(tab: 'courses' | 'requests' | 'students' | 'quizzes' | 'results' | 'leaderboard' | 'settings' | 'followup' | 'subscribers' | 'discounts' | 'books' | 'bookOrders' | 'groups' | 'live'): void {
    this.activeTab = tab;
    this.isSidebarOpen = false;
    if (tab === 'courses') {
      this.loadCourses();
    } else if (tab === 'students') {
      this.loadStudents();
    } else if (tab === 'requests') {
      this.loadRequests();
    } else if (tab === 'results') {
      this.loadSubmissions();
    } else if (tab === 'leaderboard') {
      this.loadLeaderboard();
    } else if (tab === 'settings' || tab === 'groups') {
      this.loadGlobalSettings();
    } else if (tab === 'subscribers') {
      this.selectedSubscribersTeacher = '';
      this.selectedSubscribersCourse = '';
      this.loadCourses();
      this.loadStudents();
    } else if (tab === 'discounts') {
      this.loadDiscountCodes();
    } else if (tab === 'books') {
      this.loadAdminBooks();
    } else if (tab === 'bookOrders') {
      this.loadAdminBookOrders();
    } else if (tab === 'quizzes') {
      this.loadCourses();
      this.loadAllQuizzes();
    } else if (tab === 'live') {
      this.loadLiveMeetings();
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // ──────────────────────────────────────────────────
  // 1️⃣ جلب كل الكورسات
  // ──────────────────────────────────────────────────
  loadCourses(): void {
    this.isLoading = true;
    this.courseService.getAllCourses().subscribe({
      next: (res: any[]) => {
        this.courses   = res;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
        this.showError('فشل في جلب الكورسات');
      }
    });
  }

  // ──────────────────────────────────────────────────
  // 2️⃣ جلب وحذف الطلاب
  // ──────────────────────────────────────────────────
  loadStudents(): void {
    this.auth.getStudents().subscribe({
      next:  (res: any[]) => { this.students = res; },
      error: (err: any) => { console.error('خطأ في جلب الطلاب:', err); }
    });
  }

  // ── دوال مساعدة لقسم المشتركين بالكورسات ──
  getUniqueInstructors(): { id: string; name: string }[] {
    const instructorsMap = new Map<string, string>();
    this.courses.forEach(c => {
      const id = c.instructorId || c.instructorName || 'mohamed_elsharif';
      const name = c.instructorName || c.instructor || 'د. محمد الشريف';
      instructorsMap.set(id, name);
    });
    
    // تأكيد المدرس الافتراضي
    if (!instructorsMap.has('mohamed_elsharif')) {
      instructorsMap.set('mohamed_elsharif', 'د. محمد الشريف');
    }

    return Array.from(instructorsMap.entries()).map(([id, name]) => ({
      id,
      name: name.startsWith('أ. ') ? name : `أ. ${name}`
    }));
  }

  getCoursesForSelectedTeacher(): any[] {
    if (!this.selectedSubscribersTeacher || this.selectedSubscribersTeacher === 'all') {
      return this.courses;
    }
    return this.courses.filter(c => 
      c.instructorId === this.selectedSubscribersTeacher || c.instructorName === this.selectedSubscribersTeacher
    );
  }

  getStudentsForSelectedTeacher(): any[] {
    let targetStudents = this.students || [];

    // فلترة حسب المرحلة/الصف الدراسي إذا كانت محدّدة
    if (this.selectedSubscribersGrade) {
      targetStudents = targetStudents.filter(s => s.grade === this.selectedSubscribersGrade);
    }

    const selectedTeacherId = this.selectedSubscribersTeacher;
    const selectedCourseId = this.selectedSubscribersCourse;

    let resultList: any[] = [];

    if (!selectedTeacherId || selectedTeacherId === '' || selectedTeacherId === 'all') {
      // لعرض كل المدرسين والمنصة بالكامل
      resultList = targetStudents.map(student => {
        const studentId = (student.id || student._id || '').toString();
        const enrolledCourses = this.courses.filter(c => 
          c.students && c.students.some((s: any) => s.toString() === studentId)
        );

        return {
          ...student,
          teacherCoursesCount: enrolledCourses.length,
          teacherCoursesTitles: enrolledCourses.map(c => c.title),
          teacherCoursesObjects: enrolledCourses.map(c => ({ id: c.id || (c as any)._id, title: c.title })),
          totalCoursesCount: enrolledCourses.length
        };
      });
    } else {
      // مدرس معين
      const teacherCourses = this.courses.filter(c => 
        c.instructorId === selectedTeacherId || c.instructorName === selectedTeacherId
      );
      let filteredCourses = teacherCourses;
      if (selectedCourseId) {
        filteredCourses = teacherCourses.filter(c => c.id === selectedCourseId || (c as any)._id === selectedCourseId);
      }

      resultList = targetStudents.map(student => {
        const studentId = (student.id || student._id || '').toString();
        const studentTeacherCourses = filteredCourses.filter(c => 
          c.students && c.students.some((s: any) => s.toString() === studentId)
        );
        const allStudentTeacherCourses = teacherCourses.filter(c => 
          c.students && c.students.some((s: any) => s.toString() === studentId)
        );

        return {
          ...student,
          teacherCoursesCount: studentTeacherCourses.length,
          teacherCoursesTitles: allStudentTeacherCourses.map(c => c.title),
          teacherCoursesObjects: allStudentTeacherCourses.map(c => ({ id: c.id || (c as any)._id, title: c.title })),
          totalCoursesCount: this.getEnrolledCoursesCount(studentId)
        };
      });
    }

    // فلترة حسب حالة الاشتراك (الكل / المشتركين فقط / غير المشتركين فقط)
    if (this.selectedSubscribersStatusFilter === 'subscribed') {
      resultList = resultList.filter(s => (s.teacherCoursesCount || 0) > 0);
    } else if (this.selectedSubscribersStatusFilter === 'unsubscribed') {
      resultList = resultList.filter(s => (s.teacherCoursesCount || 0) === 0);
    }

    // فلترة محرك البحث (بالاسم، الهاتف، رقم ولي الأمر، أو المحافظة)
    if (this.subscribersSearchQuery && this.subscribersSearchQuery.trim()) {
      const q = this.subscribersSearchQuery.trim().toLowerCase();
      resultList = resultList.filter(s => 
        (s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q) ||
        (s.parentPhone || '').includes(q) ||
        (s.governorate || '').toLowerCase().includes(q)
      );
    }

    return resultList;
  }

  // ── 📊 دوال تصدير البيانات إلى Excel ──
  formatGrade(grade: string): string {
    switch (grade) {
      case 'prep1': return 'الصف الأول الإعدادي';
      case 'prep2': return 'الصف الثاني الإعدادي';
      case 'prep3': return 'الصف الثالث الإعدادي';
      case '1': return 'الصف الأول الثانوي';
      case '2': return 'الصف الثاني الثانوي والباكالوريا';
      case '3': return 'الصف الثالث الثانوي';
      case 'univ': return 'جامعي';
      default: return grade || 'غير محدد';
    }
  }

  exportToExcel(studentsList?: any[], customFilename?: string): void {
    const dataToExport = studentsList || this.getStudentsForSelectedTeacher();
    if (!dataToExport || dataToExport.length === 0) {
      alert('⚠️ لا توجد بيانات للطباعة أو التصدير حسب الفلاتر الحالية!');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = customFilename || `تقرير_الطلاب_${dateStr}.xls`;

    let tableRows = '';
    dataToExport.forEach((s, index) => {
      const studentId = (s.id || s._id || '').toString();
      const totalCourses = s.totalCoursesCount ?? this.getEnrolledCoursesCount(studentId);
      const isSubscribed = (s.teacherCoursesCount ?? totalCourses) > 0;
      const gradeFormatted = this.formatGrade(s.grade);

      tableRows += `
        <tr>
          <td style="text-align:center;">${index + 1}</td>
          <td style="font-weight:bold;">${s.name || 'بدون اسم'}</td>
          <td style="mso-number-format:'\\@'; font-family: monospace;">${s.phone || '—'}</td>
          <td style="mso-number-format:'\\@'; font-family: monospace;">${s.parentPhone || '—'}</td>
          <td>${s.governorate || 'غير محدد'}</td>
          <td>${gradeFormatted}</td>
          <td style="text-align:center;">${s.isAzhar ? 'أزهري' : 'عام'}</td>
          <td style="text-align:center; font-weight:bold; color: ${isSubscribed ? '#15803d' : '#b91c1c'};">
            ${isSubscribed ? 'مشترك (' + totalCourses + ' كورس)' : 'غير مشترك'}
          </td>
        </tr>
      `;
    });

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>بيانات الطلاب</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Tahoma, Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; direction: rtl; }
          th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px 14px; text-align: right; font-size: 14px; }
          td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; font-size: 13px; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h2 style="text-align: center; color: #312e81; font-family: Tahoma, sans-serif; margin-bottom: 20px;">
          📊 كشف بيانات الطلاب - البصمات
        </h2>
        <table>
          <thead>
            <tr>
              <th style="text-align:center;">#</th>
              <th>اسم الطالب</th>
              <th>رقم الهاتف</th>
              <th>رقم ولي الأمر</th>
              <th>المحافظة</th>
              <th>الصف الدراسي (السنة)</th>
              <th style="text-align:center;">نوع التعليم</th>
              <th style="text-align:center;">حالة الاشتراك</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportUnsubscribedStudentsExcel(): void {
    const unsubscribed = (this.students || []).filter(s => {
      const studentId = (s.id || s._id || '').toString();
      return this.getEnrolledCoursesCount(studentId) === 0;
    });

    if (unsubscribed.length === 0) {
      alert('ℹ️ لا يوجد طلاب غير مشتركين! جميع الطلاب مقيدين بكورسات.');
      return;
    }

    const formattedList = unsubscribed.map(s => ({
      ...s,
      teacherCoursesCount: 0,
      totalCoursesCount: 0
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    this.exportToExcel(formattedList, `الطلاب_غير_المشتركين_جميع_السنين_${dateStr}.xls`);
  }

  unenrollStudentFromCourse(courseId: string, studentId: string, studentName: string, courseTitle: string): void {
    if (!confirm(`هل أنت متأكد من إلغاء/حذف اشتراك الطالب "${studentName}" من كورس "${courseTitle}"؟`)) {
      return;
    }
    this.courseService.unenrollStudent(courseId, studentId).subscribe({
      next: () => {
        alert(`✅ تم إلغاء اشتراك الطالب "${studentName}" من كورس "${courseTitle}" بنجاح!`);
        this.loadCourses();
      },
      error: (err) => {
        console.error('Unenroll error:', err);
        alert('❌ فشل إلغاء اشتراك الطالب.');
      }
    });
  }

  getEnrolledStudentsForCourse(course: any): any[] {
    const studentIds = course.students || [];
    return this.students.filter(s => studentIds.includes(s.id || s._id));
  }

  toggleCourseSubscribers(courseId: string): void {
    if (this.expandedCourseId === courseId) {
      this.expandedCourseId = null;
    } else {
      this.expandedCourseId = courseId;
    }
  }

  deleteStudent(id: string): void {
    if (!id) {
      console.warn('ID الطالب مفقود!');
      return;
    }
    
    if (!confirm('هل أنت متأكد من حذف هذا الطالب نهائياً من قاعدة البيانات؟ ⚠️')) return;
    
    this.auth.deleteStudentData(id).subscribe({
      next: () => {
        this.successMessage = 'تم حذف بيانات الطالب بنجاح ✅';
        this.loadStudents(); // تحديث القائمة فوراً
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err: any) => {
        console.error(err);
        this.showError('فشل الحذف — قد تحتاج لمراجعة صلاحيات Firestore');
      }
    });
  }

  resetStudentPassword(student: any): void {
    if (!student || !student.id) return;
    const newPassword = prompt(`أدخل كلمة المرور الجديدة للطالب "${student.name}":`, '123456');
    if (!newPassword || !newPassword.trim()) return;
    
    this.auth.resetStudentPassword(student.id, newPassword.trim()).subscribe({
      next: () => {
        alert(`تم إعادة تعيين كلمة مرور الطالب "${student.name}" بنجاح إلى: ${newPassword} ✅\nيمكنك الآن نسخها وإرسالها له.`);
      },
      error: (err: any) => {
        alert(err.error?.error || 'فشل إعادة تعيين كلمة المرور ❌');
      }
    });
  }

  // ── جلب ومعالجة طلبات الانضمام ──
  loadRequests(): void {
    this.courseService.getEnrollmentRequests().subscribe({
      next: (res: any[]) => {
        this.requests = (res || []).map((r) => ({
          ...r,
          id: String(r.id || r._id || ''),
          studentMessage: String(r.message ?? r.text ?? '').trim(),
          paymentImageUrl: this.courseService.resolveUploadUrl(r.paymentImageUrl || ''),
          createdAt: this.parseRequestDate(r.createdAt)
        }));
      },
      error: (err: any) => console.error('خطأ في جلب الطلبات:', err)
    });
  }

  getRequestMessage(req: any): string {
    return String(req?.studentMessage ?? req?.message ?? '').trim();
  }

  getTransferNumber(req: any): string {
    return String(req?.transferNumber || '').trim();
  }

  getPaymentImageUrl(req: any): string {
    return this.courseService.resolveUploadUrl(req?.paymentImageUrl || '');
  }

  parseRequestDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
    return null;
  }

  handleRequest(action: 'approve' | 'reject', requestId: string, courseId: string, studentId: string): void {
    this.courseService.handleEnrollmentRequest(requestId, courseId, studentId, action).subscribe({
      next: () => {
        this.showSuccess(action === 'approve' ? 'تم قبول الطالب في الكورس' : 'تم رفض الطلب');
        this.loadRequests();
      },
      error: (err: any) => this.showError('فشل معالجة الطلب')
    });
  }

  // ──────────────────────────────────────────────────
  // 3️⃣ فتح المودال والخ...
  // ──────────────────────────────────────────────────
  selectedImageFile: File | null = null;
  isImageUploading: boolean = false;
  isResourceUploading: { [key: number]: boolean } = {};

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isImageUploading = true;
      this.errorMessage = '';
      this.courseService.uploadFile(file).subscribe({
        next: (res: any) => {
          const url = res.secure_url || res.url;
          if (!url) {
            this.isImageUploading = false;
            this.errorMessage = 'لم يُرجع السيرفر رابط الصورة';
            return;
          }
          this.courseForm.thumbnail = url;
          this.isImageUploading = false;
          this.showSuccess(url.includes('cloudinary') ? 'تم رفع الصورة إلى Cloudinary ✅' : 'تم حفظ الصورة على السيرفر ✅');
        },
        error: (err: any) => {
          console.error(err);
          this.isImageUploading = false;
          this.errorMessage = 'فشل رفع الصورة إلى Cloudinary';
        }
      });
    }
  }

  onResourceFileSelected(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      this.isResourceUploading[index] = true;
      this.errorMessage = '';
      this.courseService.uploadFile(file).subscribe({
        next: (res: any) => {
          this.courseForm.resources[index].url = res.secure_url;
          this.isResourceUploading[index] = false;
          this.showSuccess('تم رفع الملف بنجاح إلى Cloudinary ✅');
        },
        error: (err: any) => {
          console.error(err);
          this.isResourceUploading[index] = false;
          this.errorMessage = 'فشل رفع الملف إلى Cloudinary';
        }
      });
    }
  }

  openAddModal(): void {
    this.isEditMode  = false;
    this.selectedImageFile = null;
    this.courseForm  = { 
      title: '', 
      description: '', 
      category: '', 
      grade: '',
      lessons: [], 
      price: 0, 
      centerPrice: 0,
      thumbnail: '',
      resources: [],
      instructorName: 'د. محمد الشريف',
      instructorId: 'mohamed_elsharif',
      units: [{ title: 'الوحدة الأولى', lessons: [{ title: 'المقدمة', url: '' }] }],
      lessonsCount: null,
      unitsCount: null,
      certificatesEnabled: false
    };
    this.errorMessage = '';
    this.showCourseFormPage = true;
  }

  // ──────────────────────────────────────────────────
  // 4️⃣ فتح مودال التعديل
  // ──────────────────────────────────────────────────
  openEditModal(course: any): void {
    this.isEditMode      = true;
    this.editingCourseId = course.id || course._id;
    this.selectedImageFile = null;
    this.errorMessage = '';
    this.showCourseFormPage = true;

    // 1. تعبئة أولية سريعة من الكارد
    this.populateCourseForm(course);

    // 2. جلب كافة بيانات الكورس الكاملة بالروابط السريّة للفيديوهات للأدمن
    if (this.editingCourseId) {
      this.courseService.getCourseById(this.editingCourseId).subscribe({
        next: (fullCourse: any) => {
          if (fullCourse) {
            this.populateCourseForm(fullCourse);
          }
        },
        error: (err: any) => {
          console.error('Error fetching full course details for editing:', err);
        }
      });
    }
  }

  private toDatetimeLocal(d: any): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private formatScheduledAtForApi(val: any): string | null {
    if (!val || typeof val !== 'string' || !val.trim()) return null;
    const date = new Date(val);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private populateCourseForm(course: any): void {
    const rawUnits = course.units && course.units.length > 0 
      ? course.units 
      : [{ title: 'الوحدة الأولى', lessons: course.lessons && course.lessons.length > 0 ? course.lessons : [{ title: 'المقدمة', url: course.youtubeUrl || '', scheduledAt: '' }] }];

    const units = JSON.parse(JSON.stringify(rawUnits)).map((u: any) => ({
      ...u,
      lessons: (u.lessons || []).map((l: any) => ({
        ...l,
        scheduledAt: this.toDatetimeLocal(l.scheduledAt)
      }))
    }));

    this.courseForm = {
      title:       course.title || '',
      description: course.description || '',
      category:    course.category || '',
      grade:       course.grade || '',
      lessons:     (course.lessons || []).map((l: any) => ({
        ...l,
        scheduledAt: this.toDatetimeLocal(l.scheduledAt)
      })),
      price:       course.price || 0,
      centerPrice: course.centerPrice || 0,
      thumbnail:   course.thumbnail || course.imageUrl || '',
      resources:   course.resources ? JSON.parse(JSON.stringify(course.resources)) : [],
      instructorName: course.instructorName || 'د. محمد الشريف',
      instructorId:   course.instructorId || 'mohamed_elsharif',
      units:       units,
      lessonsCount: course.lessonsCount ?? null,
      unitsCount:   course.unitsCount ?? null,
      certificatesEnabled: course.certificatesEnabled || false
    };
  }

  // ── إدارة الدروس والوحدات في الفورم ──
  addUnit(): void {
    const nextNum = this.courseForm.units.length + 1;
    this.courseForm.units.push({ title: `الوحدة رقم ${nextNum}`, lessons: [{ title: '', url: '', scheduledAt: '' }] });
  }

  removeUnit(index: number): void {
    if (this.courseForm.units.length > 1) {
      this.courseForm.units.splice(index, 1);
    }
  }

  addLessonToUnit(unitIdx: number): void {
    this.courseForm.units[unitIdx].lessons.push({ title: '', url: '', scheduledAt: '' });
  }

  removeLessonFromUnit(unitIdx: number, lessonIdx: number): void {
    if (this.courseForm.units[unitIdx].lessons.length > 1) {
      this.courseForm.units[unitIdx].lessons.splice(lessonIdx, 1);
    }
  }

  // ── إدارة المصادر في الفورم ──
  addResource(): void {
    this.courseForm.resources.push({ title: '', type: 'pdf', url: '', importance: 'normal' });
  }

  removeResource(index: number): void {
    this.courseForm.resources.splice(index, 1);
  }

  // ──────────────────────────────────────────────────
  // 5️⃣ إغلاق المودال
  // ──────────────────────────────────────────────────
  closeModal(): void {
    this.showModal    = false;
    this.showCourseFormPage = false;
    this.isEditMode   = false;
    this.isSaving     = false;
    this.errorMessage = '';
  }

  // ──────────────────────────────────────────────────
  // 6️⃣ حفظ الكورس (إضافة أو تعديل)
  // ──────────────────────────────────────────────────
  private buildCoursePayload() {
    const cover = (this.courseForm.thumbnail || '').trim();
    const flatLessons: any[] = [];
    if (this.courseForm.units) {
      for (const unit of this.courseForm.units) {
        if (unit.lessons) {
          for (const les of unit.lessons) {
            flatLessons.push({
              title: les.title,
              url: les.url,
              scheduledAt: this.formatScheduledAtForApi(les.scheduledAt)
            });
          }
        }
      }
    }

    const processedUnits = (this.courseForm.units || []).map((unit: any) => ({
      ...unit,
      lessons: (unit.lessons || []).map((les: any) => ({
        title: les.title,
        url: les.url,
        scheduledAt: this.formatScheduledAtForApi(les.scheduledAt)
      }))
    }));

    return {
      ...this.courseForm,
      units: processedUnits,
      lessons: flatLessons,
      instructorId: this.courseForm.instructorId || 'mohamed_elsharif',
      instructorName: this.courseForm.instructorName || 'د. محمد الشريف',
      thumbnail: cover,
      imageUrl: cover
    };
  }

  saveCourse(): void {
    if (!this.courseForm.title.trim() || !this.courseForm.description.trim()) {
      this.errorMessage = 'العنوان والوصف مطلوبان';
      return;
    }

    if (this.isImageUploading) {
      this.errorMessage = 'انتظر حتى يكتمل رفع صورة الغلاف';
      return;
    }

    const payload = this.buildCoursePayload();
    const cover = payload.thumbnail;
    if (!cover) {
      this.errorMessage = 'يجب رفع صورة غلاف للكورس قبل الحفظ';
      return;
    }
    if (!cover.startsWith('http://') && !cover.startsWith('https://') && !cover.startsWith('data:image')) {
      this.errorMessage = 'رابط صورة الغلاف غير صالح. ارفع الصورة من الجهاز.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const request$ = this.isEditMode
      ? this.courseService.updateCourse(this.editingCourseId, payload)
      : this.courseService.addCourse(payload);

    request$.subscribe({
      next: () => {
        const wasEdit = this.isEditMode;
        this.isSaving = false;
        this.closeModal();
        this.loadCourses();
        this.showSuccess(wasEdit ? 'تم تعديل الكورس بنجاح ✅' : 'تم إضافة الكورس بنجاح ✅');
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = this.isEditMode ? 'خطأ في التعديل' : 'خطأ في الإضافة';
      }
    });
  }

  // ──────────────────────────────────────────────────
  // 7️⃣ حذف كورس مع تأكيد
  // ──────────────────────────────────────────────────
  deleteCourse(course: Course): void {
    const confirmed = confirm(
      `هل أنت متأكد من حذف الكورس؟\n"${course.title}"\n\nهذا الإجراء لا يمكن التراجع عنه ⚠️`
    );
    if (!confirmed) return;

    this.courseService.deleteCourse(course.id).subscribe({
      next: () => {
        this.showSuccess('تم حذف الكورس بنجاح 🗑️');
      },
      error: (err: any) => {
        this.showError('فشل الحذف');
      }
    });
  }

  // ──────────────────────────────────────────────────
  // 8️⃣ عرض الكورس للطالب
  // ──────────────────────────────────────────────────
  viewCourse(id: string): void {
    this.router.navigate(['/course', id]);
  }

  // ── logout ──────────────────────────────────────
  logout(): void {
    this.auth.logout();
  }

  // ── رسائل النجاح والخطأ (تختفي تلقائياً) ────────
  private showSuccess(msg: string): void { alert('✅ ' + msg); }
  showError(msg: string): void { alert('❌ ' + msg); }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💎 نظام الكويزات (إضافة وتعديل وحذف)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  allQuizzes: any[] = [];
  editingQuizId: string | null = null;

  quizForm: {
    courseId: string;
    unitTitle: string;
    title: string;
    questions: { text: string; options: string[]; correctOptionIndex: number }[];
  } = {
    courseId: '',
    unitTitle: '',
    title: '',
    questions: [
      { text: '', options: ['', '', '', ''], correctOptionIndex: 0 }
    ]
  };

  loadAllQuizzes(): void {
    this.quizService.getAllQuizzes().subscribe({
      next: (res) => {
        this.allQuizzes = res || [];
      },
      error: () => console.error('خطأ في جلب قائمة الكويزات')
    });
  }

  editQuiz(quiz: any): void {
    this.editingQuizId = quiz.id || quiz._id;
    this.quizForm = {
      courseId: quiz.courseId || '',
      unitTitle: quiz.unitTitle || '',
      title: quiz.title || '',
      questions: Array.isArray(quiz.questions) && quiz.questions.length > 0 
        ? quiz.questions.map((q: any) => ({
            text: q.text || q.question || '',
            options: Array.isArray(q.options) && q.options.length > 0 ? [...q.options] : ['', '', '', ''],
            correctOptionIndex: q.correctOptionIndex ?? 0
          }))
        : [{ text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
    };
    if (quiz.courseId) {
      this.onQuizCourseChange(quiz.courseId);
      this.quizForm.unitTitle = quiz.unitTitle || '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditQuiz(): void {
    this.editingQuizId = null;
    this.quizForm = {
      courseId: '',
      unitTitle: '',
      title: '',
      questions: [{ text: '', options: ['', '', '', ''], correctOptionIndex: 0 }]
    };
    this.selectedCourseUnits = [];
  }

  deleteQuiz(quizId: string): void {
    if (!confirm('هل أنت تأكد من حذف هذا الاختبار؟')) return;
    this.quizService.deleteQuiz(quizId).subscribe({
      next: () => {
        this.showSuccess('تم حذف الاختبار بنجاح');
        this.loadAllQuizzes();
      },
      error: () => this.showError('حدث خطأ أثناء حذف الاختبار')
    });
  }

  getCourseTitleById(courseId: string): string {
    const c = this.courses.find(c => (c.id || (c as any)._id) === courseId);
    return c ? c.title : 'كورس رئيسي';
  }

  addQuestion() {
    this.quizForm.questions.push({
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0
    });
  }

  removeQuestion(idx: number) {
    if (this.quizForm.questions.length > 1) {
      this.quizForm.questions.splice(idx, 1);
    }
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  submitQuiz() {
    if (!this.quizForm.courseId || !this.quizForm.title) {
      this.showError('يرجى اختيار الكورس وكتابة عنوان للاختبار');
      return;
    }

    const payload = {
      courseId: this.quizForm.courseId,
      title: this.quizForm.title,
      unitTitle: this.quizForm.unitTitle || '',
      questions: this.quizForm.questions
    };

    if (this.editingQuizId) {
      this.quizService.updateQuiz(this.editingQuizId, payload).subscribe({
        next: () => {
          this.showSuccess('تم تعديل الاختبار بنجاح!');
          this.cancelEditQuiz();
          this.loadAllQuizzes();
        },
        error: (err) => this.showError('خطأ في تعديل الاختبار')
      });
    } else {
      this.quizService.createQuiz(payload).subscribe({
        next: () => {
          this.showSuccess('تم إنشاء الاختبار بنجاح!');
          this.cancelEditQuiz();
          this.loadAllQuizzes();
        },
        error: (err) => this.showError('خطأ في حفظ الاختبار')
      });
    }
  }

  onQuizCourseChange(courseId: string): void {
    const course = this.courses.find(c => c.id === courseId);
    this.selectedCourseUnits = course?.units || [];
    this.quizForm.unitTitle = '';
  }

  loadSubmissions() {
    this.quizService.getAllSubmissions().subscribe({
      next: (res) => {
        this.submissions = res;
      },
      error: () => console.error('خطأ في جلب النتائج')
    });
  }

  loadLeaderboard(): void {
    this.isLeaderboardLoading = true;
    this.courseService.getLeaderboard(undefined, this.leaderboardGrade).subscribe({
      next: (res) => {
        this.leaderboard = res.top10 || [];
        this.isLeaderboardLoading = false;
      },
      error: (e) => {
        console.error('خطأ في جلب المتصدرين:', e);
        this.isLeaderboardLoading = false;
      }
    });
  }

  onLeaderboardGradeChange(): void {
    this.loadLeaderboard();
  }

  getLeaderboardGradeLabel(): string {
    const g = this.leaderboardGrades.find(x => x.value === this.leaderboardGrade);
    return g?.label || 'الصف';
  }

  getRankDisplay(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
  }

  // ── Helpers ─────────────────────────────────────
  getFreeCoursesCount(): number {
    return this.courses.filter(c => c.price === 0).length;
  }

  formatPrice(price: number): string {
    return price === 0 ? 'مجاني' : `${price} جنيه`;
  }

  trackByCourseId(index: number, course: Course): string {
    return course.id;
  }

  loadAdminBooks() {
    this.isBooksLoading = true;
    this.bookService.getBooks().subscribe({
      next: (data) => {
        this.books = (data || []).sort((a: any, b: any) => {
          const aIsEssential = a.importance === 'essential' || a.importance === 'ضروري';
          const bIsEssential = b.importance === 'essential' || b.importance === 'ضروري';
          if (aIsEssential && !bIsEssential) return -1;
          if (!aIsEssential && bIsEssential) return 1;
          return 0;
        });
        this.isBooksLoading = false;
      },
      error: (err) => {
        console.error('Error loading books:', err);
        this.isBooksLoading = false;
      }
    });
  }

  loadAdminBookOrders() {
    this.isBookOrdersLoading = true;
    this.bookService.getOrders().subscribe({
      next: (data) => {
        this.bookOrders = data || [];
        this.isBookOrdersLoading = false;
      },
      error: (err) => {
        console.error('Error loading book orders:', err);
        this.isBookOrdersLoading = false;
      }
    });
  }

  onBookCoverSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.isBookCoverUploading = true;
    this.courseService.uploadFile(file).subscribe({
      next: (res) => {
        this.bookForm.imageUrl = res.url || res.path;
        this.isBookCoverUploading = false;
        alert('✅ تم رفع غلاف الكتاب بنجاح!');
      },
      error: (err) => {
        console.error('Book cover upload error:', err);
        this.isBookCoverUploading = false;
        alert('❌ فشل رفع غلاف الكتاب.');
      }
    });
  }

  isEditBookMode: boolean = false;
  editingBookId: string | null = null;

  editBook(book: any): void {
    this.isEditBookMode = true;
    this.editingBookId = book._id || book.id;
    this.bookForm = {
      title: book.title || '',
      description: book.description || '',
      price: book.price || 0,
      imageUrl: book.imageUrl || '',
      instructorName: book.instructorName || 'د. محمد الشريف',
      subject: book.subject || 'القدرات والتحصيلي',
      importance: book.importance || 'normal'
    };
  }

  cancelBookEdit(): void {
    this.isEditBookMode = false;
    this.editingBookId = null;
    this.bookForm = {
      title: '',
      description: '',
      price: 0,
      imageUrl: '',
      instructorName: 'د. محمد الشريف',
      subject: 'القدرات والتحصيلي',
      importance: 'normal'
    };
  }

  changeBookImportance(book: any, importance: string): void {
    const bookId = book._id || book.id;
    this.bookService.updateBookImportance(bookId, importance).subscribe({
      next: (updated) => {
        book.importance = updated.importance || importance;
        this.loadAdminBooks();
        alert(importance === 'essential' ? '✅ تم حفظ أهمية الكتاب كـ (ضروري) ونقله فوراً للأعلى للطلاب!' : '✅ تم حفظ أهمية الكتاب كـ (عادي).');
      },
      error: (err) => {
        console.error('Error changing book importance:', err);
        alert('❌ فشل حفظ أهمية الكتاب.');
      }
    });
  }

  saveBook() {
    if (!this.bookForm.title || !this.bookForm.price || !this.bookForm.imageUrl) {
      alert('⚠️ يرجى إدخال اسم الكتاب والسعر ورفع صورة الغلاف.');
      return;
    }
    this.isAddingBook = true;

    if (this.isEditBookMode && this.editingBookId) {
      this.bookService.updateBook(this.editingBookId, this.bookForm).subscribe({
        next: () => {
          this.isAddingBook = false;
          alert('🎉 تم تعديل الكتاب بنجاح!');
          this.cancelBookEdit();
          this.loadAdminBooks();
        },
        error: (err) => {
          console.error('Error updating book:', err);
          this.isAddingBook = false;
          alert('❌ حدث خطأ أثناء تعديل الكتاب.');
        }
      });
    } else {
      this.bookService.addBook(this.bookForm).subscribe({
        next: () => {
          this.isAddingBook = false;
          alert('🎉 تم إضافة الكتاب بنجاح!');
          this.cancelBookEdit();
          this.loadAdminBooks();
        },
        error: (err) => {
          console.error('Error adding book:', err);
          this.isAddingBook = false;
          alert('❌ حدث خطأ أثناء إضافة الكتاب.');
        }
      });
    }
  }

  deleteBook(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب نهائياً؟')) return;
    this.bookService.deleteBook(id).subscribe({
      next: () => {
        alert('✅ تم حذف الكتاب بنجاح.');
        this.loadAdminBooks();
      },
      error: (err) => {
        console.error('Error deleting book:', err);
        alert('❌ فشل حذف الكتاب.');
      }
    });
  }

  updateBookOrderStatus(orderId: string, status: string) {
    this.bookService.updateOrderStatus(orderId, status).subscribe({
      next: () => {
        alert('✅ تم تحديث حالة الطلب بنجاح.');
        this.loadAdminBookOrders();
      },
      error: (err) => {
        console.error('Error updating order status:', err);
        alert('❌ فشل تحديث حالة الطلب.');
      }
    });
  }

  getFilteredBookOrders() {
    if (this.selectedBookOrderFilter === 'all') return this.bookOrders;
    return this.bookOrders.filter(o => o.subject === this.selectedBookOrderFilter);
  }

  exportBookOrdersToCSV() {
    const ordersToExport = this.getFilteredBookOrders();
    if (ordersToExport.length === 0) {
      alert('⚠️ لا توجد طلبات لتصديرها.');
      return;
    }

    // Define CSV header and rows
    const headers = ['اسم الكتاب', 'السعر', 'اسم الطالب رباعي', 'رقم التواصل', 'مكان الاستلام', 'الرقم المحول منه', 'الحالة', 'تاريخ الطلب'];
    const rows = ordersToExport.map(o => [
      o.bookTitle,
      o.price,
      o.studentName,
      o.studentPhone,
      o.deliveryLocation,
      o.transferNumber,
      o.status === 'pending' ? 'معلق' : o.status === 'approved' ? 'مقبول' : 'مرفوض',
      new Date(o.createdAt).toLocaleString('ar-EG')
    ]);

    // Construct CSV content with BOM for Excel Arabic support
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `طلبات_الكتب_${this.selectedBookOrderFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  resolveBookCover(book: any): string {
    return this.courseService.resolveUploadUrl(book?.imageUrl || '');
  }

  getPaymentReceiptUrl(order: any): string {
    return this.courseService.resolveUploadUrl(order?.paymentImageUrl || '');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎥 إدارة الحصص المباشرة (Jitsi Meet)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  loadLiveMeetings(): void {
    this.isLiveMeetingsLoading = true;
    this.liveMeetingService.getMeetings().subscribe({
      next: (meetings) => {
        this.liveMeetings = meetings;
        this.isLiveMeetingsLoading = false;
      },
      error: (err) => {
        console.error('Error loading live meetings:', err);
        this.isLiveMeetingsLoading = false;
      }
    });
  }

  getFilteredLiveMeetings(): any[] {
    if (this.liveMeetingFilter === 'all') return this.liveMeetings;
    return this.liveMeetings.filter(m => m.status === this.liveMeetingFilter);
  }

  openCreateMeetingModal(): void {
    this.meetingFormError = '';
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    this.newMeetingForm = {
      title: '',
      description: '',
      courseId: '',
      grade: '',
      instructorName: this.adminName || 'د. محمد الشريف',
      scheduledAt: localIso,
      duration: 60,
      password: ''
    };
    this.showCreateMeetingModal = true;
  }

  closeCreateMeetingModal(): void {
    this.showCreateMeetingModal = false;
    this.isCreatingMeeting = false;
    this.meetingFormError = '';
  }

  createLiveMeeting(): void {
    if (!this.newMeetingForm.title.trim()) {
      this.meetingFormError = 'يرجى إدخال عنوان الحصة المباشرة';
      return;
    }

    this.isCreatingMeeting = true;
    this.meetingFormError = '';

    let courseTitle = '';
    if (this.newMeetingForm.courseId) {
      const c = this.courses.find(course => (course.id || (course as any)._id) === this.newMeetingForm.courseId);
      if (c) {
        courseTitle = c.title;
        if (!this.newMeetingForm.grade && c.grade) {
          this.newMeetingForm.grade = c.grade;
        }
      }
    }

    const payload = {
      ...this.newMeetingForm,
      courseTitle
    };

    this.liveMeetingService.createMeeting(payload).subscribe({
      next: (created: any) => {
        const meetingItem = created.meeting || created;
        this.liveMeetings.unshift(meetingItem);
        this.closeCreateMeetingModal();
        this.showSuccess(`تم إنشاء الحصة "${meetingItem.title}" بنجاح!`);
      },
      error: (err) => {
        console.error('Error creating live meeting:', err);
        this.meetingFormError = err.error?.error || 'حدث خطأ أثناء إنشاء الحصة المباشرة';
        this.isCreatingMeeting = false;
      }
    });
  }

  changeMeetingStatus(meeting: any, newStatus: 'live' | 'ended' | 'scheduled'): void {
    const id = meeting._id || meeting.id;
    this.liveMeetingService.updateMeeting(id, { status: newStatus }).subscribe({
      next: (updated: any) => {
        meeting.status = updated.meeting?.status || updated.status || newStatus;
        this.showSuccess(`تم تحديث حالة الحصة إلى: ${newStatus === 'live' ? 'مباشر الآن 🔴' : newStatus === 'ended' ? 'منتهية' : 'مجدولة'}`);
      },
      error: (err) => {
        console.error('Error updating meeting status:', err);
        this.showError('تعذر تحديث حالة الحصة المباشرة');
      }
    });
  }

  deleteLiveMeeting(meeting: any): void {
    if (!confirm(`هل أنت متأكد من حذف الحصة المباشرة "${meeting.title}"؟`)) return;
    const id = meeting._id || meeting.id;
    this.liveMeetingService.deleteMeeting(id).subscribe({
      next: () => {
        this.liveMeetings = this.liveMeetings.filter(m => (m._id || m.id) !== id);
        this.showSuccess('تم حذف الحصة بنجاح');
      },
      error: (err) => {
        console.error('Error deleting live meeting:', err);
        this.showError('تعذر حذف الحصة المباشرة');
      }
    });
  }

  copyLiveMeetingLink(meeting: any): void {
    const id = meeting._id || meeting.id;
    const link = `${window.location.origin}/live-meeting/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      this.showSuccess('تم نسخ رابط الحصة المباشرة 📋');
    }).catch(() => {
      prompt('رابط الحصة المباشرة:', link);
    });
  }

  joinMeetingAsAdmin(meeting: any): void {
    const id = meeting._id || meeting.id;
    if (meeting.status === 'scheduled') {
      this.liveMeetingService.updateMeeting(id, { status: 'live' }).subscribe({
        next: () => {
          this.router.navigate(['/live-meeting', id]);
        },
        error: () => {
          this.router.navigate(['/live-meeting', id]);
        }
      });
    } else {
      this.router.navigate(['/live-meeting', id]);
    }
  }

  openAttendeesModal(meeting: any): void {
    this.selectedMeetingTitle = meeting.title;
    this.selectedMeetingAttendees = meeting.attendees || [];
    this.showAttendeesModal = true;
  }

  closeAttendeesModal(): void {
    this.showAttendeesModal = false;
    this.selectedMeetingAttendees = [];
    this.selectedMeetingTitle = '';
  }
}
