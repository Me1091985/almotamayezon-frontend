import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { CourseService } from '../../services/course.service';
import { TaskService } from '../../services/task.service';
import { SessionService } from '../../services/session.service';
import { QuizService } from '../../services/quiz.service';
import { ThemeService } from '../../services/theme.service';
import { StreakService } from '../../services/streak.service';
import { BookService } from '../../services/book.service';
import { LiveMeetingService, LiveMeeting } from '../../services/live-meeting.service';
import { compressAndNormalizeImage, isValidImageFile } from '../../utils/image-utils';


@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  userName: string = '';
  userCreated: Date = new Date();
  allCourses: any[] = [];
  tasks: any[] = [];
  lastVisitedCourse: any = null;
  studentStats = {
    joinedCourses: 0,
    completedCourses: 0,
    savedVideos: 0,
    progress: 0,
    totalSessions: 0,
    totalMinutes: 0,
    activity: [] as any[]
  };

  // Timer Properties
  timer = {
    minutes: 45,
    seconds: 0,
    isActive: false,
    interval: null as any,
    isWorkSession: true
  };

  // Study Plan Properties
  studyPlan = {
    daysRemaining: 180,
    progressPercentage: 0,
    targetDate: new Date()
  };

  showCertificatesTab: boolean = false;
  certificates: any[] = [];
  selectedCert: any = null;
  isDownloadingCert: boolean = false;
  currentDate: Date = new Date();
  welcomeMessage: string = '';
  showNotifications: boolean = false;
  globalNotification: string = '';
  isNotificationRead: boolean = false;

  leaderboard: any[] = [];
  myScore = 0;
  myRank: number | null = null;

  isDark = false;
  private themeSub?: Subscription;
  motivationalQuote: string = '';
  private quotes = [
    "من سلك طريقاً يلتمس فيه علماً سهل الله له به طريقاً إلى الجنة 📖",
    "وقل رب زدني علماً ✨",
    "قليل دائم خير من كثير منقطع.. استمر في سعيك 🚀",
    "إن الله يحب إذا عمل أحدكم عملاً أن يتقنه ✅",
    "العلم صيد والكتابة قيده.. دوّن ما تتعلمه اليوم 📝",
    "النجاح هو مجموع محاولات صغيرة تتكرر يوماً بعد يوم 🎯",
    "طلب العلم فريضة على كل مسلم ومسلمة 🎓",
    "بالعلم تجذب العقول.. وبالأخلاق تجذب القلوب ❤️"
  ];

  activeTab: 'home' | 'courses' | 'forum' | 'account' | 'study' | 'certificates' | 'joinedCourses' | 'bookmarks' | 'books' | 'groups' | 'live' = 'home';
  mobileMenuOpen = false;

  // ── الحصص المباشرة (Jitsi Meet) ─────────────────────
  liveMeetings: any[] = [];
  activeLiveMeeting: any = null;
  isLiveMeetingsLoading = false;

  // ── إدارة الجروبات ─────────────────────────────────
  gradeGroups: { [key: string]: string } = {};
  studentGroupUrl: string = '';
  showGroupModal: boolean = false;

  // ── إدارة الكتب ──────────────────────────────────
  books: any[] = [];
  isBooksLoading = false;
  selectedBook: any = null;
  isBookPurchaseOpen = false;
  isReceiptUploading = false;
  isSubmittingOrder = false;
  purchaseForm = {
    studentName: '',
    studentPhone: '',
    deliveryLocation: 'center',
    governorate: '',
    transferNumber: '',
    paymentImageUrl: ''
  };

  // ── Streak & Badges ──────────────────────────────────────
  streak: number = 0;
  maxStreak: number = 0;
  badges: { id: string; label: string }[] = [];
  newBadgeAlert: { id: string; label: string } | null = null;

  // ── Bookmarks ────────────────────────────────────────────
  bookmarks: any[] = [];

  readonly navLinks = [
    { id: 'home' as const, icon: 'fa-regular fa-compass', label: 'الرئيسية' },
    { id: 'live' as const, icon: 'fa-solid fa-video', label: 'الحصص المباشرة' },
    { id: 'joinedCourses' as const, icon: 'fa-regular fa-circle-play', label: 'كورساتي', premium: 'courses' },
    { id: 'groups' as const, icon: 'fa-solid fa-users', label: 'جروباتي' },
    { id: 'study' as const, icon: 'fa-regular fa-lightbulb', label: 'زاكر', premium: 'study' },
    { id: 'courses' as const, icon: 'fa-regular fa-rectangle-list', label: 'الكورسات المتاحة' },
    { id: 'books' as const, icon: 'fa-regular fa-bookmark', label: 'الكتب والملازم' },
    { id: 'certificates' as const, icon: 'fa-regular fa-star', label: 'شهاداتي', premium: 'cert' },
    { id: 'account' as const, icon: 'fa-regular fa-user', label: 'حسابي' },
  ];

  readonly mobileNavLinks = [
    { id: 'home' as const, icon: 'fa-regular fa-compass', label: 'الرئيسية' },
    { id: 'live' as const, icon: 'fa-solid fa-video', label: 'مباشر' },
    { id: 'joinedCourses' as const, icon: 'fa-regular fa-circle-play', label: 'كورساتي' },
    { id: 'groups' as const, icon: 'fa-solid fa-users', label: 'جروباتي' },
    { id: 'study' as const, icon: 'fa-regular fa-lightbulb', label: 'زاكر' },
    { id: 'courses' as const, icon: 'fa-regular fa-rectangle-list', label: 'الكورسات' },
    { id: 'account' as const, icon: 'fa-regular fa-user', label: 'حسابي' },
  ];

  loadFullStats() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    this.courseService.getStudentStats(userId).subscribe({
      next: (res) => {
        this.studentStats = res;
      },
      error: (err) => console.error('❌ فشل في جلب الإحصائيات:', err)
    });
  }
  phone: string = '';
  parentPhone: string = '';
  grade: string = '';
  
  // Task Form
  newTaskTitle: string = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    private courseService: CourseService,
    private taskService: TaskService,
    private sessionService: SessionService,
    private quizService: QuizService,
    public themeService: ThemeService,
    private streakService: StreakService,
    private bookService: BookService,
    private liveMeetingService: LiveMeetingService
  ) {}

  ngOnInit(): void {
    this.userName = this.auth.getUserName();
    this.userCreated = new Date();

    // ── الريكويستات الأساسية اللي بتظهر في الصفحة الرئيسية مباشرة ──
    this.loadProfile();          // بيانات الطالب (لازم)
    this.loadCourses();          // الكورسات (لازم - cached 10 دقايق في الخدمة)
    this.loadGlobalSettings();   // الإعدادات (cached 5 دقايق في الخدمة)
    this.loadLiveMeetings();     // فحص الحصص المباشرة الفعالة والمجدولة

    // ── ريكويستات مؤجلة لا تظهر في اللحظة الأولى ──
    // نشغلهم بعد 1 ثانية عشان الـ initial render يخلص أول
    setTimeout(() => {
      this.loadFullStats();        // إحصائيات الطالب
      this.loadSessionStats();     // إحصائيات الجلسات
      this.loadLeaderboard();      // المتصدرين
    }, 1000);

    // ── streak: مرة واحدة في اليوم بس ──
    this.updateStreakIfNeeded();

    // ── بيانات lazy - تُجلب لما يفتح التبويب الخاص بها فقط ──
    // loadTasks() → فقط لما activeTab === 'study'
    // loadCertificates() → فقط لما activeTab === 'certificates'
    // loadBookmarks() → فقط لما activeTab === 'bookmarks'
    // loadStudentBooks() → فقط لما activeTab === 'books'

    this.calculateStudyPlan();
    this.setDailyQuote();
    this.themeSub = this.themeService.isDark$.subscribe(d => this.isDark = d);
    this.loadLastVisitedCourse();
  }

  /** يُحدّث الـ streak مرة واحدة في اليوم بس، ويحفظ تاريخ آخر تحديث في localStorage */
  updateStreakIfNeeded() {
    const key = 'streakLastUpdated';
    const today = new Date().toDateString();
    const last = localStorage.getItem(key);
    if (last === today) return; // سبق تحديثها النهارده
    this.streakService.updateStreak().subscribe({
      next: (res) => {
        this.streak = res.streak ?? 0;
        this.maxStreak = res.maxStreak ?? 0;
        this.badges = res.badges ?? [];
        localStorage.setItem(key, today);
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  loadLastVisitedCourse() {
    try {
      const stored = localStorage.getItem('lastVisitedCourse');
      if (stored) {
        this.lastVisitedCourse = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading last visited course:', e);
    }
  }

  loadProfile() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    // Fetch logged in user profile details securely
    this.auth.getProfile().subscribe({
      next: (me) => {
        if (me) {
          this.userName = me.name;
          this.phone = me.phone || 'غير مسجل';
          this.parentPhone = me.parentPhone || 'غير مسجل';
          this.grade = me.grade || 'غير محدد';
          
          // Update local storage for future use
          localStorage.setItem('userName', me.name);
          localStorage.setItem('userPhone', me.phone || '');
          localStorage.setItem('parentPhone', me.parentPhone || '');
          localStorage.setItem('userGrade', me.grade || '');
          this.checkStudentGroup();
        }
      },
      error: (err) => console.error('❌ Error loading profile:', err)
    });
  }


  goHome(): void {
    this.router.navigate(['/']);
  }

  enterCourse(courseId: string) {
    this.router.navigate(['/course', courseId]);
  }



  setActiveTab(tab: 'home' | 'courses' | 'forum' | 'account' | 'study' | 'certificates' | 'joinedCourses' | 'bookmarks' | 'books' | 'groups') {
    this.activeTab = tab;
    this.showCertificatesTab = (tab === 'certificates');
    this.closeMobileMenu();

    // ── Lazy load: بنجيب البيانات لما الطالب يفتح التبويب لأول مرة بس ──
    if (tab === 'joinedCourses') {
      this.showJoinedCourses();
    } else if (tab === 'courses') {
      this.showAllCourses();
      this.selectedInstructorId = null;
    } else if (tab === 'books' && this.books.length === 0) {
      this.loadStudentBooks();
    } else if (tab === 'certificates' && this.certificates.length === 0) {
      this.loadCertificates();
    } else if (tab === 'bookmarks' && this.bookmarks.length === 0) {
      this.loadBookmarks();
    } else if (tab === 'study' && this.tasks.length === 0) {
      this.loadTasks();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  // ── Streak & Badges ───────────────────────────────────────
  updateStreak(): void {
    this.streakService.updateStreak().subscribe({
      next: (res) => {
        this.streak = res.streak;
        this.maxStreak = res.maxStreak;
        // ✅ badges now returned directly in the updateStreak response (no extra GET /streak call)
        this.badges = res.badges || [];
        // عرض تنبيه لو حصل شارة جديدة
        if (res.newBadges && res.newBadges.length > 0) {
          this.newBadgeAlert = res.newBadges[0];
          setTimeout(() => this.newBadgeAlert = null, 5000);
        }
      },
      error: () => {} // صامت — مش ضروري يزعج المستخدم
    });
  }

  // ── Bookmarks ─────────────────────────────────────────────
  loadBookmarks(): void {
    this.streakService.getBookmarks().subscribe({
      next: (bm) => this.bookmarks = bm,
      error: () => {}
    });
  }

  removeBookmark(bookmark: any): void {
    this.streakService.toggleBookmark({
      courseId: bookmark.courseId,
      courseTitle: bookmark.courseTitle,
      lessonIndex: bookmark.lessonIndex,
      lessonTitle: bookmark.lessonTitle,
    }).subscribe({
      next: (res) => this.bookmarks = res.bookmarks,
      error: () => {}
    });
  }

  goToBookmark(bookmark: any): void {
    this.router.navigate(['/course', bookmark.courseId], {
      queryParams: { lesson: bookmark.lessonIndex }
    });
  }

  getGradeLabel(): string {
    if (this.grade === 'prep1') return 'الصف الأول الإعدادي';
    if (this.grade === 'prep2') return 'الصف الثاني الإعدادي';
    if (this.grade === 'prep3') return 'الصف الثالث الإعدادي';
    if (this.grade === '1') return 'الصف الأول الثانوي';
    if (this.grade === '2') return 'الصف الثاني الثانوي والبكالوريا';
    if (this.grade === '3') return 'الصف الثالث الثانوي';
    if (this.grade === 'univ') return 'المرحلة الجامعية';
    return 'طالب';
  }

  getTabTitle(): string {
    const titles: Record<string, string> = {
      home: 'الرئيسية',
      live: 'الحصص المباشرة',
      study: 'جلسة المذاكرة',
      joinedCourses: 'كورساتي',
      courses: 'الكورسات المتاحة',
      certificates: 'شهاداتي',
      account: 'حسابي',
      forum: 'المنتدى',
      books: 'الكتب والملازم',
      groups: 'جروباتي'
    };
    return titles[this.activeTab] || 'لوحة الطالب';
  }

  getActivityHeight(value: number): number {
    if (!this.studentStats.activity?.length) return 0;
    const max = Math.max(...this.studentStats.activity.map((d) => d.value), 60);
    return Math.min(100, Math.round((value / max) * 100));
  }

  isEnrolled(course: any): boolean {
    const isFree = course?.price === 0 || !course?.price;
    if (isFree) return true;

    const userId = localStorage.getItem('userId');
    if (!userId || !course?.students) return false;
    return course.students.some((s: any) => s.toString() === userId);
  }

  setDailyQuote() {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    this.motivationalQuote = this.quotes[dayOfYear % this.quotes.length];
  }

  globalTeacherPayments: any = null;

  loadGlobalSettings() {
    this.courseService.getGlobalSettings().subscribe({
      next: (res) => {
        this.welcomeMessage = res.welcomeMessage || '';
        this.globalNotification = res.globalNotification || '';
        this.gradeGroups = res.gradeGroups || {};
        this.globalTeacherPayments = res.teacherPayments || null;
        this.checkNotificationStatus();
        this.checkStudentGroup();
      },
      error: (e) => console.error('Err loading settings:', e)
    });
  }

  getTeacherPaymentForBook(book: any): { number: string; message: string } {
    if (!book) return { number: '', message: '' };
    if (this.globalTeacherPayments) {
      if (this.globalTeacherPayments['mohamed_elsharif']) {
        return this.globalTeacherPayments['mohamed_elsharif'];
      }
      const firstKey = Object.keys(this.globalTeacherPayments)[0];
      if (firstKey) return this.globalTeacherPayments[firstKey];
    }
    return { number: '', message: '' };
  }

  checkStudentGroup() {
    const currentGrade = this.grade || localStorage.getItem('userGrade') || this.auth.getUserGrade() || '1';
    this.studentGroupUrl = this.gradeGroups[currentGrade] || this.gradeGroups['1'] || '';
    if (this.studentGroupUrl) {
      const dismissed = sessionStorage.getItem('groupModalDismissed');
      if (!dismissed) {
        this.showGroupModal = true;
      }
    }
  }

  closeGroupModal() {
    this.showGroupModal = false;
    sessionStorage.setItem('groupModalDismissed', 'true');
  }

  openStudentGroup() {
    if (this.studentGroupUrl) {
      window.open(this.studentGroupUrl, '_blank');
    }
  }

  getGradeName(gKey?: string): string {
    const target = gKey || this.grade || localStorage.getItem('userGrade') || this.auth.getUserGrade();
    const map: any = {
      'prep1': 'الصف الأول الإعدادي',
      'prep2': 'الصف الثاني الإعدادي',
      'prep3': 'الصف الثالث الإعدادي',
      '1': 'الصف الأول الثانوي',
      '2': 'الصف الثاني الثانوي',
      '3': 'الصف الثالث الثانوي',
      'univ': 'المرحلة الجامعية'
    };
    return map[target] || 'صفك الدراسي';
  }

  checkNotificationStatus() {
    if (this.globalNotification) {
      const lastRead = localStorage.getItem('lastReadNotification');
      this.isNotificationRead = (lastRead === this.globalNotification);
    } else {
      this.isNotificationRead = true;
    }
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications && this.globalNotification) {
      localStorage.setItem('lastReadNotification', this.globalNotification);
      this.isNotificationRead = true;
    }
  }

  loadLeaderboard() {
    const userId = localStorage.getItem('userId') || '';
    const grade = this.grade || this.auth.getUserGrade() || '';
    this.courseService.getLeaderboard(userId, grade || undefined).subscribe({
      next: (res) => {
        this.leaderboard = res.top10 || [];
        this.myScore = res.myScore ?? 0;
        this.myRank = res.myRank ?? null;
      },
      error: (e) => console.error('Err loading leaderboard:', e)
    });
  }

  isMeOnLeaderboard(entry: { userId: string }): boolean {
    return entry.userId === localStorage.getItem('userId');
  }

  filteredCourses: any[] = [];
  isShowingJoinedOnly: boolean = false;
  selectedInstructorId: string | null = null;

  loadCourses() {
    const grade = this.auth.getUserGrade();
    const userId = localStorage.getItem('userId');
    
    this.courseService.getAllCourses(grade, userId || undefined, true).subscribe({
      next: (res) => {
        this.allCourses = res;
        if (this.isShowingJoinedOnly || this.activeTab === 'joinedCourses') {
          this.showJoinedCourses();
        } else {
          this.filteredCourses = res;
        }
        
        if (userId) {
          this.studentStats.joinedCourses = res.filter(c => 
            c.students && c.students.some((s: any) => s.toString() === userId)
          ).length;
        }
      },
      error: (err) => console.error('❌ فشل في جلب الكورسات:', err)
    });
  }

  showJoinedCourses() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    this.isShowingJoinedOnly = true;
    this.filteredCourses = this.allCourses.filter(c => 
      c.students && c.students.some((s: any) => s.toString() === userId)
    );
  }


  showAllCourses() {
    this.isShowingJoinedOnly = false;
    this.filteredCourses = this.allCourses;
  }

  selectInstructor(instructorId: string): void {
    this.selectedInstructorId = instructorId;
  }

  getInstructorCourses(): any[] {
    const base = this.isShowingJoinedOnly ? this.filteredCourses : this.allCourses;
    if (!this.selectedInstructorId) return base;
    return base.filter(c => c.instructorId === this.selectedInstructorId);
  }


  loadCertificates() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    this.quizService.getCertificates(userId).subscribe(res => {
      this.certificates = res;
    });
  }

  loadTasks() {
    this.taskService.getTasks().subscribe({
      next: (res) => this.tasks = res,
      error: (err) => console.error('❌ فشل في جلب المهام:', err)
    });
  }

  loadSessionStats() {
    this.sessionService.getSessionStats().subscribe({
      next: (res) => {
        this.studentStats.totalSessions = res.totalSessions || 0;
        this.studentStats.totalMinutes = res.totalMinutes || 0;
      },
      error: (err) => console.error('❌ فشل في جلب إحصائيات الجلسات:', err)
    });
  }

  calculateStudyPlan() {
    const start = this.userCreated.getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    
    this.studyPlan.daysRemaining = Math.max(0, 180 - diffDays);
    this.studyPlan.progressPercentage = Math.min(100, Math.round((diffDays / 180) * 100));
    
    const target = new Date(start);
    target.setDate(target.getDate() + 180);
    this.studyPlan.targetDate = target;
  }

  // Task Actions
  addTask() {
    if (!this.newTaskTitle.trim()) return;
    this.taskService.addTask(this.newTaskTitle).subscribe({
      next: () => {
        this.newTaskTitle = '';
        this.loadTasks();
      }
    });
  }

  setTaskStatus(task: any, status: 'completed' | 'failed') {
    if (task.status === status) return; // Already set

    this.taskService.updateTaskStatus(task.id, status).subscribe({
      next: () => {
        task.status = status;
        if (status === 'completed') {
          // Optional: Add a small sound or subtle toast instead of annoying alert
        }
      },
      error: (err: any) => console.error('❌ فشل في تحديث المهمة:', err)
    });
  }

  get dailyEvaluation(): string {
    const total = this.tasks.length;
    if (total === 0) return 'لا توجد مهام مضافة.';
    
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const failed = this.tasks.filter(t => t.status === 'failed').length;
    const pending = this.tasks.filter(t => t.status === 'pending').length;

    const score = Math.round((completed / total) * 100);

    if (score === 100 && pending === 0 && failed === 0) {
      return '🏆 <strong>يوم مثالي!</strong><br>إنجاز 100%، استمر يا بطل!';
    }
    if (score >= 70) {
      return '🔥 <strong>أداء ممتاز!</strong><br>لقد أنجزت معظم مهامك بنجاح.';
    }
    if (score >= 40) {
      return '👍 <strong>أداء جيد.</strong><br>لكن يمكنك تقديم الأفضل غداً وتجاوز المهام المخفقة.';
    }
    if (failed > completed) {
      return '⚠️ <strong>احذر!</strong><br>لقد أضعت الكثير من المهام، حاول التركيز أكثر غداً.';
    }
    
    return '⏳ لا يزال لديك مهام بانتظارك، لا تستسلم!';
  }

  deleteTask(id: string) {
    this.taskService.deleteTask(id).subscribe({
      next: () => this.loadTasks()
    });
  }

  // Timer Logic
  startTimer() {
    if (this.timer.isActive) return;
    this.timer.isActive = true;
    this.timer.interval = setInterval(() => {
      if (this.timer.seconds > 0) {
        this.timer.seconds--;
      } else if (this.timer.minutes > 0) {
        this.timer.minutes--;
        this.timer.seconds = 59;
      } else {
        this.onTimerComplete();
      }
    }, 1000);
  }

  pauseTimer() {
    this.timer.isActive = false;
    clearInterval(this.timer.interval);
  }

  resetTimer() {
    this.pauseTimer();
    this.timer.minutes = 45;
    this.timer.seconds = 0;
  }

  onTimerComplete() {
    this.pauseTimer();
    this.sessionService.logSession(45).subscribe({
      next: () => {
        alert('🎉 أحسنت! انتهت جلسة التركيز (45 دقيقة). تم تسجيل الإنجاز.');
        this.loadSessionStats();
        this.resetTimer();
      }
    });
  }

  get completedCourses() {
    return this.allCourses.filter(c => c.isCompleted);
  }

  toggleCertificates() {
    this.setActiveTab('certificates');
  }

  downloadCertificate(cert: any) {
    if (this.isDownloadingCert) return;
    this.selectedCert = cert;
    this.isDownloadingCert = true;

    setTimeout(async () => {
      const element = document.getElementById('certificateData');
      if (element) {
        window.scrollTo(0, 0); // Reset scroll to avoid capture offsets
        try {
          const html2canvas = (await import('html2canvas')).default;
          const { jsPDF } = await import('jspdf');

          html2canvas(element, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`شهادة-إتمام-${cert.courseTitle.replace(/\s+/g, '-')}.pdf`);
            this.isDownloadingCert = false;
            this.selectedCert = null;
          });
        } catch (err) {
          console.error('Failed to generate PDF:', err);
          this.isDownloadingCert = false;
          this.selectedCert = null;
        }
      }
    }, 500);

  }

  getCourseCover(course: any, fallback = 'assets/images/teacher4.png'): string {
    return this.courseService.getCourseCoverUrl(course, fallback);
  }

  getInstructorNameForCert(courseId: string): string {
    if (!courseId) return 'إدارة الأكاديمية';
    const course = this.allCourses.find(c => c.id === courseId || c._id === courseId);
    return course?.instructorName || 'د. محمد الشريف';
  }

  onLogout() {
    this.auth.logout();
  }

  loadStudentBooks() {
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
        console.error('Error loading books in dashboard:', err);
        this.isBooksLoading = false;
      }
    });
  }

  resolveBookCover(book: any): string {
    return this.courseService.resolveUploadUrl(book?.imageUrl || '');
  }

  openBookPurchase(book: any) {
    this.selectedBook = book;
    this.isBookPurchaseOpen = true;
    // Reset form
    this.purchaseForm = {
      studentName: '',
      studentPhone: '',
      deliveryLocation: 'center',
      governorate: '',
      transferNumber: '',
      paymentImageUrl: ''
    };
  }

  closeBookPurchase() {
    this.isBookPurchaseOpen = false;
    this.selectedBook = null;
  }

  async onReceiptSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      alert('يرجى اختيار ملف صورة أو مستند PDF فقط');
      return;
    }

    this.isReceiptUploading = true;

    try {
      const processedFile = await compressAndNormalizeImage(file);
      this.courseService.uploadFile(processedFile).subscribe({
        next: (res) => {
          this.purchaseForm.paymentImageUrl = res.url || res.path || res.secure_url;
          this.isReceiptUploading = false;
          alert('✅ تم رفع إيصال الدفع بنجاح!');
        },
        error: (err) => {
          console.error('Receipt upload error:', err);
          this.isReceiptUploading = false;
          const errorMsg = err.error?.error || err.message || 'فشل رفع إيصال الدفع.';
          alert('❌ ' + errorMsg);
        }
      });
    } catch (err) {
      console.error('Error compressing receipt:', err);
      this.isReceiptUploading = false;
      alert('❌ حدث خطأ أثناء تجهيز الصورة، يرجى إعادة المحاولة.');
    }
  }

  submitBookOrder() {
    if (!this.purchaseForm.studentName || !this.purchaseForm.studentPhone || !this.purchaseForm.transferNumber || !this.purchaseForm.paymentImageUrl) {
      alert('⚠️ يرجى ملء جميع الحقول المطلوبة ورفع صورة الإيصال.');
      return;
    }

    if (this.purchaseForm.deliveryLocation === 'governorate' && !this.purchaseForm.governorate) {
      alert('⚠️ يرجى إدخال اسم المحافظة لشحن الكتاب.');
      return;
    }

    this.isSubmittingOrder = true;
    const orderData = {
      bookId: this.selectedBook._id || this.selectedBook.id,
      bookTitle: this.selectedBook.title,
      price: this.selectedBook.price,
      studentName: this.purchaseForm.studentName,
      studentPhone: this.purchaseForm.studentPhone,
      deliveryLocation: this.purchaseForm.deliveryLocation === 'center' ? 'السنتر' : this.purchaseForm.governorate,
      transferNumber: this.purchaseForm.transferNumber,
      paymentImageUrl: this.purchaseForm.paymentImageUrl,
      subject: this.selectedBook.subject
    };

    this.bookService.createOrder(orderData).subscribe({
      next: () => {
        this.isSubmittingOrder = false;
        this.isBookPurchaseOpen = false;
        this.selectedBook = null;
        alert('🎉 تم إرسال طلب الشراء بنجاح! سيقوم الدعم بمراجعته وتأكيده معك.');
      },
      error: (err) => {
        console.error('Order submission error:', err);
        this.isSubmittingOrder = false;
        alert('❌ حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.');
      }
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎥 الحصص المباشرة (Jitsi Meet)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  loadLiveMeetings(): void {
    this.isLiveMeetingsLoading = true;
    this.liveMeetingService.getMeetings().subscribe({
      next: (meetings) => {
        this.liveMeetings = meetings;
        this.activeLiveMeeting = meetings.find(m => m.status === 'live') || null;
        this.isLiveMeetingsLoading = false;
      },
      error: (err) => {
        console.error('❌ فشل في جلب الحصص المباشرة:', err);
        this.isLiveMeetingsLoading = false;
      }
    });
  }

  joinLiveMeeting(meeting: any): void {
    const id = meeting._id || meeting.id;
    this.router.navigate(['/live-meeting', id]);
  }
}
