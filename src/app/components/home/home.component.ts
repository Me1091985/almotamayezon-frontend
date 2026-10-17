import { Component, OnInit, OnDestroy, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CourseService } from '../../services/course.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { BookService } from '../../services/book.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  private courseService = inject(CourseService);
  public themeService = inject(ThemeService);
  private auth = inject(AuthService);
  private bookService = inject(BookService);
  private sanitizer = inject(DomSanitizer);

  courses: any[] = this.getMockCourses();
  books: any[] = this.getMockBooks();
  isLoading = false;
  isBooksLoading = false;
  isDark = false;
  isLoggedIn = false;
  dashboardLink = '/student-dashboard';
  activeFaq: number | null = null;
  homeVideoUrl: string = '';
  safeHomeVideoUrl: SafeResourceUrl | null = null;
  isVideoPlaying = false;
  private sub!: Subscription;
  private authSub?: Subscription;

  // Book Showcase & Checkout State
  selectedBook: any = null;
  isBookDetailsOpen = false;
  isBookPurchaseOpen = false;
  isSubmittingOrder = false;
  isReceiptUploading = false;
  // Metrics for circular gauges (matching reference Image 2)
  platformMetrics = [
    { value: '204', label: 'طلاب مسجلين', percent: 78, color: '#0d9488' },
    { value: '128', label: 'ساعات تدريبية', percent: 65, color: '#0d9488' },
    { value: '176', label: 'مهارات وقوانين', percent: 82, color: '#f97316' },
    { value: '148', label: 'اختبارات وتجميعات', percent: 72, color: '#0d9488' }
  ];

  purchaseForm = {
    studentName: '',
    studentPhone: '',
    deliveryLocation: 'center', // default
    governorate: '',
    transferNumber: '',
    paymentImageUrl: ''
  };

  features = [
    {
      title: 'دكتوراه في الرياضيات',
      description: 'تأسيس علمي وأكاديمي رصين يضمن استيعاب أعمق المفاهيم الرياضية والانتقال من الحفظ إلى الفهم.',
      icon: 'fa-graduation-cap',
    },
    {
      title: 'مدرب قدرات وتحصيلي',
      description: 'تدريب مكثف على المهارات الكمية والمسائل النموذجية لاجتياز الاختبارات بأعلى الدرجات.',
      icon: 'fa-chart-line',
    },
    {
      title: 'استراتيجيات الحل السريع',
      description: 'تقنيات الحساب الذهني الذكي وإدارة وقت الاختبار لحل المسائل المعقدة في ثوانٍ معدودة.',
      icon: 'fa-bolt',
    },
    {
      title: 'الرياضيات والمقررات الجامعية',
      description: 'شرح وتبسيط مقررات الرياضيات الجامعية (Calculus, Linear Algebra) بأسلوب تحليلي مبسط.',
      icon: 'fa-university',
    },
    {
      title: 'تمارين وبنك أسئلة شامل',
      description: 'اختبارات تفاعلية بعد كل درس لمتابعة مستواك وتعزيز ما تعلمته خطوة بخطوة.',
      icon: 'fa-clipboard-check',
    },
    {
      title: 'دعم ومتابعة مستمرة',
      description: 'مساعد ذكي وقنوات تواصل للإجابة على استفساراتك وتذليل كافة الصعوبات الرياضية.',
      icon: 'fa-headset',
    }
  ];

  faqs = [
    {
      q: 'كيف يمكنني الاشتراك في دورات القدرات والتحصيلي؟',
      a: 'يمكنك الاشتراك بسهولة عبر إنشاء حساب جديد على المنصة، ثم تصفح الكورسات واختيار الدورة المناسبة والضغط على زر "اشترك الآن" وإتمام عملية الدفع.'
    },
    {
      q: 'ما هي طرق الدفع المتاحة لطلاب المملكة العربية السعودية؟',
      a: 'نوفر التحويل المباشر عبر بنك الراجحي كخيار أساسي ومعتمد للطلاب في السعودية، بالإضافة إلى خيارات الدفع الإلكتروني والتحويل البنكي.'
    },
    {
      q: 'هل الدورات تركز على الحفظ أم الفهم واستراتيجيات الحل؟',
      a: 'رؤية الدكتور محمد الشريف تقوم على الانتقال بالطالب من مرحلة الحفظ والتعقيد إلى مرحلة التحليل والفهم العميق مع تدريب عملي على استراتيجيات الحساب الذهني والحل السريع.'
    },
    {
      q: 'هل تتوفر شروحات للمقررات والرياضيات الجامعية؟',
      a: 'نعم، يقدم الدكتور شروحات متخصصة لطلاب الجامعات تشمل مقررات التفاضل والتكامل، الجبر الخطي، والإحصاء الرياضي بأسلوب علمي واضح.'
    },
    {
      q: 'هل يمكنني متابعة الدروس من الجوال والتابلت؟',
      a: 'نعم، المنصة متوافقة تماماً وتعمل بسلاسة عالية على جميع الأجهزة الذكية والهواتف واللوحيات.'
    }
  ];

  ngOnInit(): void {
    this.loadCourses();
    this.loadBooks();
    this.loadSettings();
    this.sub = this.themeService.isDark$.subscribe(d => this.isDark = d);
    this.updateAuthState();
    this.authSub = this.auth.isLoggedIn$.subscribe(() => this.updateAuthState());
  }

  loadSettings(): void {
    this.courseService.getGlobalSettings().subscribe({
      next: (res) => {
        if (res && res.homeVideoUrl) {
          this.homeVideoUrl = res.homeVideoUrl;
          const embedUrl = this.formatYoutubeEmbed(res.homeVideoUrl);
          this.safeHomeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
        }
      },
      error: (err) => console.error('Failed to load settings on home page:', err)
    });
  }

  private formatYoutubeEmbed(url: string): string {
    if (!url || !url.trim()) return '';
    const trimmed = url.trim();

    let videoId = '';

    // youtu.be short links
    if (trimmed.includes('youtu.be/')) {
      videoId = trimmed.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0]?.split('#')[0];
    }
    // youtube.com/watch?v=
    else if (trimmed.includes('youtube.com/watch')) {
      try {
        const params = new URLSearchParams(trimmed.split('?')[1] || '');
        videoId = params.get('v') || '';
      } catch {}
    }
    // youtube.com/shorts/
    else if (trimmed.includes('youtube.com/shorts/')) {
      videoId = trimmed.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0];
    }
    // already embed URL
    else if (trimmed.includes('youtube.com/embed/')) {
      return trimmed.replace('youtube.com/embed/', 'www.youtube-nocookie.com/embed/');
    }

    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
    }

    // Non-YouTube URL — return as-is (e.g. Facebook, Vimeo embed links)
    return trimmed;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.authSub?.unsubscribe();
  }

  private updateAuthState(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    if (this.isLoggedIn) {
      this.dashboardLink = this.auth.getUserRole() === 'admin'
        ? '/admin-dashboard'
        : '/student-dashboard';
    }
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleFaq(index: number): void {
    this.activeFaq = this.activeFaq === index ? null : index;
  }

  getCourseCover(course: any): string {
    if (course?.thumbnail?.startsWith('assets/')) return course.thumbnail;
    if (course?.thumbnail) return this.courseService.resolveUploadUrl(course.thumbnail);
    return 'assets/images/course_qudurat.jpg';
  }

  getCourseSubject(course: any): string {
    return course.subject || 'الرياضيات';
  }

  getCourseGradeLabel(course: any): string {
    const map: Record<string, string> = {
      'qudurat': 'القدرات العامة',
      'tahsili': 'التحصيلي',
      'prep1': 'الصف الأول الإعدادي',
      'prep2': 'الصف الثاني الإعدادي',
      'prep3': 'الصف الثالث الإعدادي',
      '1': 'الصف الأول الثانوي',
      '2': 'الصف الثاني الثانوي',
      '3': 'الصف الثالث الثانوي',
      'univ': 'المرحلة الجامعية'
    };
    return map[course?.grade] || 'الرياضيات';
  }

  getInstructorName(course?: any): string {
    return 'د. محمد الشريف';
  }

  loadCourses() {
    this.courseService.getAllCourses().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const mapped = data.map((c: any, index: number) => ({
            ...c,
            thumbnail: c.thumbnail ? this.courseService.resolveUploadUrl(c.thumbnail) : this.getDefaultCourseThumb(index)
          }));
          const existingIds = new Set(mapped.map((c: any) => c.id || c._id));
          const complementary = this.getMockCourses().filter(m => !existingIds.has(m.id));
          this.courses = [...mapped, ...complementary];
        } else {
          this.courses = this.getMockCourses();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching courses, using fallback mock courses:', err);
        this.courses = this.getMockCourses();
        this.isLoading = false;
      }
    });
  }

  getDefaultCourseThumb(index: number): string {
    const thumbs = [
      'assets/images/course_qudurat.jpg',
      'assets/images/course_tahsili.jpg',
      'assets/images/course_sec3.jpg',
      'assets/images/course_university.jpg',
      'assets/images/course_models120.jpg'
    ];
    return thumbs[index % thumbs.length];
  }

  getDefaultBookCover(index: number): string {
    const bookCovers = [
      'assets/images/book_qudurat_3d.jpg',
      'assets/images/book_tahsili_3d.jpg',
      'assets/images/book_bank_3d.jpg',
      'assets/images/book_uni_3d.jpg'
    ];
    return bookCovers[index % bookCovers.length];
  }

  private getMockCourses(): any[] {
    return [
      {
        id: 'qudurat_quant',
        title: 'دورة تأسيس واحتراف القدرات (القسم الكمي 2026)',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 36,
        unitsCount: 6,
        price: 250,
        grade: 'qudurat',
        subject: 'القدرات العامة',
        description: 'تأسيس شامل في المهارات الكمية واستراتيجيات الحساب الذهني السريع والتجميعات الحديثة.',
        thumbnail: 'assets/images/course_qudurat.jpg'
      },
      {
        id: 'tahsili_math',
        title: 'المراجعة الشاملة للاختبار التحصيلي - الرياضيات',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 32,
        unitsCount: 5,
        price: 290,
        grade: 'tahsili',
        subject: 'التحصيلي',
        description: 'شرح وتلخيص قوانين ومفاهيم رياضيات المرحلة الثانوية وحل بنوك الأسئلة المكثفة.',
        thumbnail: 'assets/images/course_tahsili.jpg'
      },
      {
        id: 'sec3_math',
        title: 'رياضيات الصف الثالث الثانوي (المنهج السعودي المطور)',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 38,
        unitsCount: 6,
        price: 280,
        grade: '3',
        subject: 'الثانوية العامة',
        description: 'شرح كامل وتدريبات لجميع فصول المنهج وحلول نموذجية لتمارين الكتاب الوزاري.',
        thumbnail: 'assets/images/course_sec3.jpg'
      },
      {
        id: 'calculus_uni',
        title: 'الرياضيات الجامعية - التفاضل والتكامل والجبر',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 40,
        unitsCount: 8,
        price: 350,
        grade: 'univ',
        subject: 'الرياضيات الجامعية',
        description: 'تبسيط وتعميق مفاهيم النهايات، الاشتقاق، والتكامل وتطبيقاتها لطلاب الكليات العلمية والهندسية.',
        thumbnail: 'assets/images/course_university.jpg'
      },
      {
        id: 'models_120',
        title: 'بنك تجميعات الـ 120 نموذج الأحدث - القدرات',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 24,
        unitsCount: 4,
        price: 180,
        grade: 'qudurat',
        subject: 'نماذج المحوسب',
        description: 'تدريب عملي مكثف على أحدث نماذج وتسريبات قياس واختبارات المحوسب وطرق الحل الفوري.',
        thumbnail: 'assets/images/course_models120.jpg'
      },
      {
        id: 'speed_math',
        title: 'استراتيجيات الحساب الذهني والحل في ثوانٍ',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 20,
        unitsCount: 3,
        price: 190,
        grade: 'qudurat',
        subject: 'الحساب الذهني',
        description: 'أقوى تكتيكات توفير الوقت وحل أعقد المسائل الرياضية بأبسط الطرق دون تعقيد.',
        thumbnail: 'assets/images/course_qudurat.jpg'
      },
      {
        id: 'sec2_math',
        title: 'رياضيات الصف الثاني الثانوي (تأسيس واحتراف)',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 30,
        unitsCount: 5,
        price: 260,
        grade: '2',
        subject: 'الثانوية العامة',
        description: 'الدوال والمصفوفات والاحتمالات والمتتابعات مع تدريبات شاملة للاختبارات الدورية.',
        thumbnail: 'assets/images/course_sec3.jpg'
      },
      {
        id: 'advanced_calculus',
        title: 'تفاضل وتكامل متقدم ومعادلات تفاضلية (Calculus II & ODE)',
        instructorId: 'dr_mohamed_elsherif',
        lessonsCount: 42,
        unitsCount: 7,
        price: 380,
        grade: 'univ',
        subject: 'الرياضيات الجامعية',
        description: 'المقررات الجامعية المتقدمة لطلاب كليات الهندسة وعلوم الحاسب والعلوم والتربية.',
        thumbnail: 'assets/images/course_university.jpg'
      }
    ];
  }

  ngAfterViewInit(): void {
    const initSwiper = () => {
      const swiperEl = document.querySelector('swiper-container');
      if (swiperEl && !(swiperEl as any).swiper) {
        const swiperParams = {
          slidesPerView: 1,
          spaceBetween: 20,
          navigation: true,
          pagination: true,
          breakpoints: {
            640: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 }
          },
          injectStyles: [
            `
            .swiper-button-next, .swiper-button-prev {
              color: #4f8aff !important;
              background: rgba(255, 255, 255, 0.9);
              width: 40px;
              height: 40px;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            }
            .swiper-button-next::after, .swiper-button-prev::after {
              font-size: 18px !important;
            }
            `
          ]
        };

        Object.assign(swiperEl, swiperParams);
        (swiperEl as any).initialize();
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(initSwiper, { timeout: 2000 });
    } else {
      setTimeout(initSwiper, 150);
    }
  }

  loadBooks() {
    this.bookService.getBooks().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const mapped = data.map((b: any, index: number) => ({
            ...b,
            imageUrl: b.imageUrl ? this.courseService.resolveUploadUrl(b.imageUrl) : this.getDefaultBookCover(index)
          }));
          const existingIds = new Set(mapped.map((b: any) => b.id || b._id));
          const complementary = this.getMockBooks().filter(m => !existingIds.has(m.id));
          this.books = [...mapped, ...complementary];
        } else {
          this.books = this.getMockBooks();
        }
        this.isBooksLoading = false;
      },
      error: (err) => {
        console.error('Error loading books:', err);
        this.books = this.getMockBooks();
        this.isBooksLoading = false;
      }
    });
  }

  private getMockBooks(): any[] {
    return [
      {
        id: 'book_qudurat_10',
        title: 'كتاب الشريف في القدرات (القسم الكمي)',
        subject: 'القدرات العامة',
        instructorName: 'د. محمد الشريف',
        description: 'تأسيس شامل للقسم الكمي مع استراتيجيات الحساب الذهني وحل بنوك الأسئلة الحديثة.',
        price: 65,
        originalPrice: 110,
        imageUrl: 'assets/images/book_qudurat_3d.jpg'
      },
      {
        id: 'book_tahsili_9',
        title: 'كتاب الشريف في التحصيلي (رياضيات شاملة)',
        subject: 'الاختبار التحصيلي',
        instructorName: 'د. محمد الشريف',
        description: 'دليل شامل لجميع معايير وتجميعات رياضيات المرحلة الثانوية بأسلوب الفهم والتحليل.',
        price: 85,
        originalPrice: 140,
        imageUrl: 'assets/images/book_tahsili_3d.jpg'
      },
      {
        id: 'book_bank_120',
        title: 'كتاب بنك الـ 120 نموذج الحديثة - المحوسب',
        subject: 'تجميعات المحوسب',
        instructorName: 'د. محمد الشريف',
        description: 'أقوى تجميعة للنماذج الجديدة محلولة بالكامل مع شروحات وتكنيكات الحل في ثوانٍ.',
        price: 75,
        originalPrice: 120,
        imageUrl: 'assets/images/book_bank_3d.jpg'
      },
      {
        id: 'book_uni_math',
        title: 'كتاب الشريف في الرياضيات الجامعية',
        subject: 'المرحلة الجامعية',
        instructorName: 'د. محمد الشريف',
        description: 'شرح حساب التفاضل والتكامل والجبر الخطي وتطبيقاتها العلمية للجامعات.',
        price: 95,
        originalPrice: 160,
        imageUrl: 'assets/images/book_uni_3d.jpg'
      }
    ];
  }

  resolveBookCover(book: any): string {
    if (book?.imageUrl?.startsWith('assets/')) return book.imageUrl;
    if (book?.imageUrl) return this.courseService.resolveUploadUrl(book.imageUrl);
    return 'assets/images/book_qudurat_3d.jpg';
  }

  openBookDetails(book: any) {
    this.selectedBook = book;
    this.isBookDetailsOpen = true;
  }

  closeBookDetails() {
    this.isBookDetailsOpen = false;
    this.selectedBook = null;
  }

  openBookPurchase(book: any) {
    this.selectedBook = book;
    this.isBookDetailsOpen = false;
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

  onReceiptSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    this.isReceiptUploading = true;
    this.courseService.uploadFile(file).subscribe({
      next: (res) => {
        this.purchaseForm.paymentImageUrl = res.url || res.path;
        this.isReceiptUploading = false;
        alert('✅ تم رفع إيصال الدفع بنجاح!');
      },
      error: (err) => {
        console.error('Receipt upload error:', err);
        this.isReceiptUploading = false;
        alert('❌ فشل رفع إيصال الدفع، يرجى المحاولة مرة أخرى.');
      }
    });
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
}