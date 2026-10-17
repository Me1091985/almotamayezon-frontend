import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';

import { from, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CourseService } from '../../services/course.service';
import { AuthService } from '../../services/auth.service';
import { QuizService } from '../../services/quiz.service';
import { ChatService } from '../../services/chat.service';
import { ThemeService } from '../../services/theme.service';
import { StreakService } from '../../services/streak.service';
import { PaymentService } from '../../services/payment.service';
import { compressAndNormalizeImage, isValidImageFile } from '../../utils/image-utils';


@Component({
  selector: 'app-course-view',
  templateUrl: './course-view.component.html',
  styleUrls: ['./course-view.component.css']
})
export class CourseViewComponent implements OnInit, OnDestroy {
  course: any = null;
  safeVideoUrl!: SafeResourceUrl;
  activeLessonUrl!: SafeResourceUrl;
  activeLessonTitle: string = '';
  selectedLessonIndex: number = 0;
  isEnrolled: boolean = false;
  isPending: boolean = false;
  loading: boolean = true;
  isFinished: boolean = false;
  enrollmentMessage: string = '';
  transferNumber: string = '';
  subscriptionInstructions: string = '';
  bankSettings: any = null;
  enrollmentImageFile: File | null = null;
  enrollmentImagePreview: string = '';
  isUploadingPaymentImage = false;
  lastPointsEarned: number | null = null;
  
  // -- YouTube API --
  player: any;
  userEmail: string = '';
  isPlayerReady: boolean = false;
  isPlayerApiReady: boolean = false;
  playOnReady: boolean = false;
  idmDetected: boolean = false;
  isPlayerVisible: boolean = true;
  isPlayerLoading: boolean = true;
  youtubePlayerError: string | null = null;
  isDirectVideo: boolean = false;
  idmCheckInterval: any = null;
  activeRawLessonUrl: string = '';
  activeLessonIsScheduled: boolean = false;
  scheduledReleaseDate: Date | null = null;
  scheduledReleaseDateDisplay: string = '';
  scheduledCountdownDisplay: string = '';
  private scheduledTimer: any = null;

  // -- Autoplay 3s Timer --
  autoPlayTimer: any = null;
  autoPlayCountdown: number = 0;
  private autoPlayInterval: any = null;

  // -- Custom Video Timeline --
  currentTimeDisplay: string = '00:00';
  durationDisplay: string = '00:00';
  progressPercent: number = 0;
  private timeUpdateInterval: any;
  
  accumulatedTimeWatched: number = 0;
  private lastTimeUpdated: number = 0;
  currentPlaybackRate: number = 1;
  playbackRates: number[] = [1, 1.25, 1.5, 1.75, 2];

  // ── الكويزات ──
  quizzes: any[] = [];
  activeQuiz: any = null;
  quizAnswers: any[] = [];
  quizScore: any = null;
  studentName: string = '';
  currentDate: Date = new Date();

  // ── الوحدات (Units Accordion) ──
  expandedUnits: Set<string> = new Set();
  /** مفتاح الدرس النشط داخل الوحدات: 'unitId_lessonIdx' */
  selectedUnitLessonKey: string = '';
  
  // ── التقدم والمشاهدة ──
  completedLessons: number[] = [];
  isEligibleForCertificate: boolean = false;
  certificateStatus: any = null;
  progressLoading: boolean = false;
  completingLessons: Set<number> = new Set();

  // ── الدردشة (Chat) ──
  chatMessages: any[] = [];
  newChatMessage: string = '';
  currentUserId: string = '';
  
  // ── التقييم (Rating) ──
  courseRating: number = 0;
  teacherRating: number = 0;
  reviewComment: string = '';
  isReviewSubmitted: boolean = false;
  showRatingSection: boolean = false;
  progress: number = 0;
  watermarkPos: { top: string, left: string } = { top: '10%', left: '10%' };
  private watermarkInterval: any;
  userPhone: string = '';
  shortUserId: string = '';

  isVideoPlaying = false;
  showVideoControls = true;
  private controlsHideTimer: any;
  private playerInitTimer: any;
  private watchProgressInterval: any;
  /** يُحسب الدرس عند بقاء 4 دقائق أو أقل على نهاية الفيدio */
  private readonly WATCH_BUFFER_SECONDS = 240;

  isDark: boolean = false;
  private themeSub?: Subscription;

  // ── Bookmarks ──
  bookmarkedLessons: Set<number> = new Set();
  bookmarkLoading: boolean = false;

  // ── Notes ──
  notes: any[] = []; // array of {lessonIndex, text, _id}
  currentNote: string = '';
  notesSaving: boolean = false;
  showNotesPanel: boolean = false;
  notesSaveTimeout: any;

  // ── Discount Codes ──
  discountCodeInput: string = '';
  isValidatedDiscount: boolean = false;
  discountErrorMsg: string = '';
  discountSuccessMsg: string = '';
  discountPercent: number = 0;
  discountAmount: number = 0;
  finalPrice: number = 0;
  isValidatingCode: boolean = false;

  // ── Card Payment (Visa / Mastercard / Mada) ──
  paymentMethodTab: 'card' | 'manual' = 'card';
  cardForm = {
    number: '',
    expiry: '',
    cvc: '',
    holderName: ''
  };
  isProcessingCard: boolean = false;
  cardPaymentSuccess: boolean = false;
  cardPaymentTxId: string = '';
  cardPaymentDetails: any = null;
  cardErrorMsg: string = '';

  constructor(
    private route: ActivatedRoute,
    private courseService: CourseService,
    private authService: AuthService,
    private quizService: QuizService,
    private chatService: ChatService,
    private sanitizer: DomSanitizer,
    private router: Router,
    public themeService: ThemeService,
    private streakService: StreakService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    this.studentName = this.authService.getUserName();
    this.currentUserId = localStorage.getItem('userId') || '';
    this.themeSub = this.themeService.isDark$.subscribe(d => this.isDark = d);

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (courseId) {
      this.loadCourseData(courseId);
      this.loadChatMessages(courseId);
      this.loadBookmarks(courseId);
      this.loadNotes(courseId);
    }

    this.initYoutubeApi();
    this.userEmail = localStorage.getItem('userEmail') || '';
    this.userPhone = localStorage.getItem('userPhone') || '';
    this.shortUserId = (localStorage.getItem('userId') || '').slice(-6).toUpperCase();
    this.startWatermarkMovement();
    this.loadGlobalSettings();
    this.startIdmDetection();
    this.startDevToolsDetection();
    this.activateScreenProtection(); // 🛡️ تفعيل حماية الشاشة
  }

  // ── Bookmarks ─────────────────────────────────────────────
  loadBookmarks(courseId: string): void {
    this.streakService.getBookmarks().subscribe({
      next: (bms) => {
        this.bookmarkedLessons = new Set(
          bms.filter(b => b.courseId === courseId).map(b => b.lessonIndex)
        );
      },
      error: () => {}
    });
  }

  isLessonBookmarked(lessonIndex: number): boolean {
    return this.bookmarkedLessons.has(lessonIndex);
  }

  toggleBookmark(lessonIndex: number, lessonTitle: string, unitTitle: string = ''): void {
    if (this.bookmarkLoading) return;
    this.bookmarkLoading = true;
    const courseId = this.course?.id || this.course?._id || '';
    this.streakService.toggleBookmark({
      courseId,
      courseTitle: this.course?.title || '',
      lessonIndex,
      lessonTitle,
      unitTitle,
    }).subscribe({
      next: (res) => {
        const wasAdded = res.action === 'added';
        if (wasAdded) {
          this.bookmarkedLessons.add(lessonIndex);
        } else {
          this.bookmarkedLessons.delete(lessonIndex);
        }
        this.bookmarkLoading = false;
      },
      error: () => { this.bookmarkLoading = false; }
    });
  }

  // ── Notes ─────────────────────────────────────────────────
  loadNotes(courseId: string): void {
    this.streakService.getNotes(courseId).subscribe({
      next: (ns) => {
        this.notes = ns;
        this.updateCurrentNote();
      },
      error: () => {}
    });
  }

  updateCurrentNote(): void {
    const note = this.notes.find(n => n.lessonIndex === this.selectedLessonIndex);
    this.currentNote = note?.text || '';
  }

  onNoteChange(): void {
    clearTimeout(this.notesSaveTimeout);
    this.notesSaveTimeout = setTimeout(() => this.saveNote(), 1500);
  }

  saveNote(): void {
    const courseId = this.course?.id || this.course?._id || '';
    if (!courseId) return;
    this.notesSaving = true;
    this.streakService.saveNote({
      courseId,
      lessonIndex: this.selectedLessonIndex,
      lessonTitle: this.activeLessonTitle || '',
      text: this.currentNote,
    }).subscribe({
      next: (saved) => {
        this.notesSaving = false;
        const idx = this.notes.findIndex(n => n.lessonIndex === this.selectedLessonIndex);
        if (idx > -1) this.notes[idx] = saved; else this.notes.push(saved);
      },
      error: () => { this.notesSaving = false; }
    });
  }

  // ── المصادر والملخصات المرتبة بالأهمية (ضروري أولاً) ──
  get sortedResources(): any[] {
    if (!this.course || !this.course.resources) return [];
    return [...this.course.resources].sort((a, b) => {
      const aIsEssential = a.importance === 'essential' || a.importance === 'ضروري';
      const bIsEssential = b.importance === 'essential' || b.importance === 'ضروري';
      if (aIsEssential && !bIsEssential) return -1;
      if (!aIsEssential && bIsEssential) return 1;
      return 0;
    });
  }

  toggleNotesPanel(): void {
    this.showNotesPanel = !this.showNotesPanel;
  }

  loadGlobalSettings(): void {
    this.courseService.getGlobalSettings().subscribe({
      next: (res) => {
        const teacherKey = this.course?.instructorId || '';
        const teacherName = this.course?.instructorName || '';
        let matchedPayment = null;

        if (res?.teacherPayments) {
          if (teacherKey && res.teacherPayments[teacherKey]) {
            matchedPayment = res.teacherPayments[teacherKey];
          } else if (res.teacherPayments['dr_mohamed_elsherif']) {
            matchedPayment = res.teacherPayments['dr_mohamed_elsherif'];
          }
        }

        if (matchedPayment && matchedPayment.message) {
          this.subscriptionInstructions = matchedPayment.message;
        } else {
          this.bankSettings = res?.bankSettings || null;
          this.subscriptionInstructions = res?.subscriptionInstructions || 'التحويل المباشر عبر بنك الراجحي (المملكة العربية السعودية) أو الدفع الإلكتروني، ثم إرفاق صورة إيصال التحويل لتفعيل الكورس فوراً.';
        }
      },
      error: () => {}
    });
  }

  async onPaymentImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      alert('يرجى اختيار ملف صورة أو مستند PDF فقط');
      return;
    }

    try {
      // Compress and process image on browser client side (converts HEIC/HEIF and resizes high-res phone camera photos)
      const processedFile = await compressAndNormalizeImage(file);
      this.enrollmentImageFile = processedFile;

      const reader = new FileReader();
      reader.onload = () => { this.enrollmentImagePreview = reader.result as string; };
      reader.readAsDataURL(processedFile);
    } catch (err) {
      console.error('Error processing payment image:', err);
      this.enrollmentImageFile = file;
    }
  }

  clearPaymentImage(): void {
    this.enrollmentImageFile = null;
    this.enrollmentImagePreview = '';
  }

  initYoutubeApi() {
    const isYtLoaded = (window as any)['YT'] && (window as any)['YT'].Player;
    if (isYtLoaded) {
      this.isPlayerReady = true;
      this.schedulePlayerInit();
      return;
    }

    if (!(window as any)['YT']) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (previousCallback) {
        try { previousCallback(); } catch (e) {}
      }
      this.isPlayerReady = true;
      this.schedulePlayerInit();
    };
  }

  private schedulePlayerInit(): void {
    clearTimeout(this.playerInitTimer);
    this.playerInitTimer = setTimeout(() => {
      if (this.isEnrolled && this.activeLessonUrl && !this.player) {
        this.createPlayer(false);
      }
    }, 400);
  }

  private destroyPlayer(): void {
    this.stopWatchTracking();
    this.stopTimeUpdate();
    this.isPlayerApiReady = false;
    this.playOnReady = false;
    if (this.player?.destroy) {
      try { this.player.destroy(); } catch { /* iframe may already be gone */ }
      this.player = null;
    }
  }

  private startWatchTracking(): void {
    this.stopWatchTracking();
    this.watchProgressInterval = setInterval(() => this.checkAutoCompleteLesson(), 4000);
    setTimeout(() => this.checkAutoCompleteLesson(), 1500);
  }

  private stopWatchTracking(): void {
    if (this.watchProgressInterval) {
      clearInterval(this.watchProgressInterval);
      this.watchProgressInterval = null;
    }
  }

  /** اكتمال تلقائي: مشاهدة 75% من الفيديو أو الوصول للنهاية */
  private checkAutoCompleteLesson(): void {
    if (!this.player || !this.isEnrolled || this.isLessonCompleted(this.selectedLessonIndex)) return;

    try {
      const duration = Number(this.player.getDuration?.() ?? 0);
      const currentTime = Number(this.player.getCurrentTime?.() ?? 0);
      if (this.isLessonWatchThresholdMet(this.accumulatedTimeWatched, duration, currentTime)) {
        this.markActiveLessonWatched();
      }
    } catch {
      /* المشغّل لم يجهّز بعد */
    }
  }

  private isLessonWatchThresholdMet(watchedTime: number, duration: number, currentTime: number = 0): boolean {
    if (!duration || duration <= 0) return false;
    // إذا وصل الفيديو لآخر 5 ثواني أو تجاوز 75% من مدته
    if (currentTime >= duration - 5 || (currentTime > 0 && currentTime / duration >= 0.75)) return true;
    // إذا كان الوقت التراكمي المشاهد يتجاوز 60% من الفيديو
    if (watchedTime > 0 && watchedTime / duration >= 0.6) return true;
    return false;
  }

  private afterSeekCheck(): void {
    setTimeout(() => this.checkAutoCompleteLesson(), 600);
  }

  private clearControlsTimer(): void {
    if (this.controlsHideTimer) {
      clearTimeout(this.controlsHideTimer);
      this.controlsHideTimer = null;
    }
  }

  private hideControlsAfterDelay(): void {
    this.clearControlsTimer();
    this.controlsHideTimer = setTimeout(() => {
      if (this.isVideoPlaying) {
        this.showVideoControls = false;
      }
    }, 2500);
  }

  onVideoMouseMove(): void {
    if (!this.isVideoPlaying) return;
    this.showVideoControls = true;
    this.hideControlsAfterDelay();
  }

  onVideoMouseLeave(): void {
    if (this.isVideoPlaying) {
      this.showVideoControls = false;
      this.clearControlsTimer();
    }
  }

  onVideoShieldClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;

    if (this.isVideoPlaying) {
      if (ratio < 0.28) {
        this.seekBackward();
        this.showVideoControls = true;
        this.hideControlsAfterDelay();
        return;
      }
      if (ratio > 0.72) {
        this.seekForward();
        this.showVideoControls = true;
        this.hideControlsAfterDelay();
        return;
      }
    }

    this.togglePlay();
  }

  seekForward(): void {
    this.ensurePlayer(() => {
      const t = this.player.getCurrentTime() || 0;
      this.player.seekTo(t + 10, true);
      this.afterSeekCheck();
    });
  }

  seekBackward(): void {
    this.ensurePlayer(() => {
      const t = this.player.getCurrentTime() || 0;
      this.player.seekTo(Math.max(0, t - 10), true);
    });
  }

  private ensurePlayer(then: () => void): void {
    if (!this.player || !this.isPlayerApiReady) {
      if (!this.player) {
        this.createPlayer(true);
      }
      const checkInterval = setInterval(() => {
        if (this.isPlayerApiReady) {
          clearInterval(checkInterval);
          then();
        }
      }, 100);
      setTimeout(() => clearInterval(checkInterval), 5000);
      return;
    }
    then();
  }

  start3SecAutoPlay(): void {
    this.clearAutoPlayTimer();
    this.autoPlayCountdown = 3;

    this.autoPlayInterval = setInterval(() => {
      if (this.autoPlayCountdown > 1) {
        this.autoPlayCountdown--;
      } else {
        this.clearAutoPlayInterval();
      }
    }, 1000);

    this.autoPlayTimer = setTimeout(() => {
      this.clearAutoPlayTimer();
      this.triggerAutoPlay();
    }, 3000);
  }

  clearAutoPlayTimer(): void {
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    this.clearAutoPlayInterval();
  }

  private clearAutoPlayInterval(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
    this.autoPlayCountdown = 0;
  }

  triggerAutoPlay(): void {
    this.clearAutoPlayTimer();
    if (this.activeRawLessonUrl && !this.isVideoPlaying) {
      this.activeLessonUrl = this.formatYoutubeUrl(this.activeRawLessonUrl, true);
    }
    this.ensurePlayer(() => {
      this.safePlayVideo();
    });
  }

  safePlayVideo(): void {
    if (!this.player) {
      this.createPlayer(true);
      return;
    }
    if (!this.isPlayerApiReady) {
      this.playOnReady = true;
      return;
    }
    try {
      const playPromise = this.player.playVideo();
      this.isVideoPlaying = true;
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Mobile browser autoplay policy fallback -> mute and play inline
          try {
            if (this.player.mute) this.player.mute();
            this.player.playVideo();
            this.isVideoPlaying = true;
          } catch (e) {}
        });
      }
    } catch (e) {
      try {
        if (this.player.mute) this.player.mute();
        this.player.playVideo();
        this.isVideoPlaying = true;
      } catch (e2) {
        this.createPlayer(true);
      }
    }
  }

  togglePlay() {
    this.clearAutoPlayTimer();
    if (!this.player) {
      this.createPlayer(true);
      return;
    }

    if (!this.isPlayerApiReady) {
      this.playOnReady = true;
      return;
    }

    try {
      const state = this.player.getPlayerState();
      if (state === 1) {
        this.player.pauseVideo();
        this.isVideoPlaying = false;
        this.showVideoControls = true;
        this.clearControlsTimer();
      } else {
        this.safePlayVideo();
      }
    } catch (e) {
      console.error('Error toggling play:', e);
      this.createPlayer(true);
    }
  }

  toggleSpeed(): void {
    const currentIndex = this.playbackRates.indexOf(this.currentPlaybackRate);
    const nextIndex = (currentIndex + 1) % this.playbackRates.length;
    this.currentPlaybackRate = this.playbackRates[nextIndex];
    if (this.player && this.player.setPlaybackRate) {
      try {
        this.player.setPlaybackRate(this.currentPlaybackRate);
      } catch (e) {}
    }
  }

  startWatermarkMovement() {
    this.watermarkInterval = setInterval(() => {
      const top = Math.floor(Math.random() * 75) + 5;
      const left = Math.floor(Math.random() * 65) + 5;
      this.watermarkPos = { top: `${top}%`, left: `${left}%` };
    }, 3000); // Move every 3 seconds — harder to edit out
  }

  startDevToolsDetection(): void {
    // Detect DevTools open via window size delta
    const threshold = 160;
    setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        // DevTools likely open — pause the player and show warning
        if (this.player && this.player.pauseVideo) {
          try { this.player.pauseVideo(); } catch (e) {}
        }
      }
    }, 1000);
  }

  isRotatedLandscape: boolean = false;

  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  onFullscreenChange() {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      this.isRotatedLandscape = false;
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (e) {}
    }
  }

  rotateScreen(elem: HTMLElement) {
    this.isRotatedLandscape = !this.isRotatedLandscape;

    const requestFS = elem.requestFullscreen || (elem as any).webkitRequestFullscreen || (elem as any).msRequestFullscreen;

    if (!document.fullscreenElement) {
      if (requestFS) {
        Promise.resolve(requestFS.call(elem)).then(() => {
          try {
            if (screen.orientation && (screen.orientation as any).lock) {
              (screen.orientation as any).lock('landscape').catch(() => {});
            }
          } catch (e) {}
        }).catch(() => {});
      }
    } else {
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (e) {}
    }
  }

  toggleFullscreen(elem: HTMLElement) {
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }

  createPlayer(autoPlay: boolean = false) {
    if (this.idmDetected) return;
    this.isPlayerLoading = true;
    this.youtubePlayerError = null;

    if (!(window as any).YT?.Player) {
      clearTimeout(this.playerInitTimer);
      this.playerInitTimer = setTimeout(() => this.createPlayer(autoPlay), 200);
      return;
    }
    const el = document.getElementById('protected-player');
    if (!el) {
      clearTimeout(this.playerInitTimer);
      this.playerInitTimer = setTimeout(() => this.createPlayer(autoPlay), 100);
      return;
    }

    this.destroyPlayer();

    try {
      this.player = new (window as any).YT.Player('protected-player', {
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          playsinline: 1, // 📱 ESSENTIAL for mobile Safari & Chrome inline playback
          enablejsapi: 1,
          origin: window.location.protocol.startsWith('http') ? window.location.origin : undefined,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          showinfo: 0,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          hl: 'ar'
        },
        events: {
          onReady: (event: any) => {
            this.isPlayerApiReady = true;
            this.isPlayerLoading = false;
            if (autoPlay || this.playOnReady) {
              this.safePlayVideo();
              this.playOnReady = false;
            }
          },
          onError: (event: any) => {
            console.warn('YouTube Player Error code:', event.data);
            this.isPlayerLoading = false;
            if (event.data === 101 || event.data === 150) {
              this.youtubePlayerError = 'قام صاحب الفيديو بتعطيل تشغيله في المواقع الخارجية (Error 150). يرجى إبلاغ إدارة المنصة لتحديث الرابط.';
            } else if (event.data === 2) {
              this.youtubePlayerError = 'رابط الفيديو غير صحيح أو لم يعد متوفراً على يوتيوب (Error 2).';
            } else {
              this.youtubePlayerError = 'حدث خطأ غير متوقع أثناء تحميل الفيديو (Error ' + event.data + ').';
            }
          },
          onStateChange: (event: any) => {
            const YT = (window as any).YT;
            if (event.data === YT.PlayerState.PLAYING) {
              this.isVideoPlaying = true;
              this.isPlayerLoading = false;
              this.hideControlsAfterDelay();
              this.startWatchTracking();
              this.startTimeUpdate();
            } else if (
              event.data === YT.PlayerState.PAUSED ||
              event.data === YT.PlayerState.ENDED ||
              event.data === YT.PlayerState.CUED
            ) {
              this.isVideoPlaying = false;
              this.isPlayerLoading = false;
              this.showVideoControls = true;
              this.clearControlsTimer();
              this.stopWatchTracking();
              this.stopTimeUpdate();
            }
            if (event.data === YT.PlayerState.ENDED) {
              this.checkAutoCompleteLesson();
            }
          }
        }
      });
    } catch (e) {
      console.error('Error creating YouTube player:', e);
      this.isPlayerLoading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.watermarkInterval) clearInterval(this.watermarkInterval);
    if (this.idmCheckInterval) clearInterval(this.idmCheckInterval);
    this.stopTimeUpdate();
    this.clearControlsTimer();
    this.stopWatchTracking();
    this.clearAutoPlayTimer();
    clearTimeout(this.playerInitTimer);
    this.destroyPlayer();
    this.themeSub?.unsubscribe();
  }

  startTimeUpdate(): void {
    this.stopTimeUpdate();
    this.timeUpdateInterval = setInterval(() => {
      if (this.player && this.player.getCurrentTime && this.player.getDuration) {
        try {
          const current = this.player.getCurrentTime() || 0;
          const duration = this.player.getDuration() || 0;
          
          if (this.lastTimeUpdated !== 0) {
            const diff = current - this.lastTimeUpdated;
            if (diff > 0 && diff <= 2.5) {
              this.accumulatedTimeWatched += diff;
            }
          }
          this.lastTimeUpdated = current;
          
          this.progressPercent = duration > 0 ? (current / duration) * 100 : 0;
          this.currentTimeDisplay = this.formatTime(current);
          this.durationDisplay = this.formatTime(duration);
        } catch (e) {
          // ignore
        }
      }
    }, 500);
  }

  stopTimeUpdate(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }
  
  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    
    if (h > 0) {
      return `${h}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  }

  onProgressBarClick(event: MouseEvent): void {
    if (!this.player || !this.player.getDuration || !this.player.seekTo) return;
    try {
      const el = event.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const width = rect.width;
      const clickPercent = clickX / width;
      const duration = this.player.getDuration();
      const seekTime = duration * clickPercent;
      
      this.player.seekTo(seekTime, true);
      this.progressPercent = clickPercent * 100;
      this.currentTimeDisplay = this.formatTime(seekTime);
    } catch (e) {
      // ignore
    }
  }

  startIdmDetection(): void {
    if (this.idmCheckInterval) {
      clearInterval(this.idmCheckInterval);
    }
    this.idmCheckInterval = setInterval(() => {
      // 1. Check for IDM embedded communication object
      const idmEmbed = document.getElementById('__IDM__');
      if (idmEmbed) {
        this.onIdmDetected();
        return;
      }

      // 2. Check for explicit active IDM panel elements injected in DOM
      const idmInjectedElements = document.querySelectorAll('#IDM_Panel, #idm_panel, .idm-downloader-bar, div[id*="idm_download"]');
      if (idmInjectedElements.length > 0) {
        this.onIdmDetected();
        return;
      }
    }, 4000);
  }

  onIdmDetected(): void {
    if (this.idmDetected) return;
    this.idmDetected = true;
    this.isVideoPlaying = false;
    this.destroyPlayer();
    if (this.idmCheckInterval) {
      clearInterval(this.idmCheckInterval);
    }
    console.warn('IDM Detected! Video streaming blocked to protect IP.');
  }

  bypassIdmBlock(): void {
    this.idmDetected = false;
    this.isPlayerVisible = true;
    this.schedulePlayerInit();
  }

  retryVideoLoad(): void {
    this.youtubePlayerError = null;
    this.isPlayerLoading = true;
    this.destroyPlayer();
    this.createPlayer(true);
  }

  checkIdmAgain(): void {
    window.location.reload();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  loadCourseData(courseId: string): void {
    this.loading = true;
    // ✅ Single unified call: backend returns video URLs for enrolled users automatically
    this.courseService.getCourseById(courseId).subscribe({
      next: (courseData: any) => {
        this.course = courseData;
        this.finalPrice = courseData?.price || 0;

        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');

        // Backend now returns isEnrolled flag directly
        this.isEnrolled = courseData.isEnrolled || false;

        // Also cross-check with students array for safety
        if (!this.isEnrolled && userId && courseData?.students) {
          this.isEnrolled = courseData.students.some((s: any) => s.toString() === userId);
        }

        const canAccessLessons = this.isEnrolled || userRole === 'admin';

        if (!canAccessLessons) {
          // محاولة جلب الدروس عبر مسار /lessons المشفر كـ fallback للتحقق من التوكن والاشتراك
          if (userId) {
            this.courseService.getCourseLessons(courseId).subscribe({
              next: (lessonsCourse: any) => {
                if (lessonsCourse) {
                  this.isEnrolled = true;
                  this.course = lessonsCourse;
                  this.initLessonsPlayback(lessonsCourse, courseId);
                  this.loadCourseQuizzes(courseId);
                  this.loadCourseProgress(courseId);
                  this.saveLastVisitedCourse();
                  this.loading = false;
                  return;
                }
              },
              error: () => {
                // ليس مشتركاً بالفعل — فحص حالة الطلب المعلق
                this.courseService.checkRequestStatus(courseId, userId).subscribe(req => {
                  this.isPending = !!req;
                });
                this.loading = false;
              }
            });
            return;
          }
          this.loading = false;
          return;
        }

        // ✅ تم التحقق من الاشتراك — تشغيل الفيديوهات
        this.initLessonsPlayback(courseData, courseId);
        this.loadCourseQuizzes(courseId);

        if (this.isEnrolled) {
          this.loadCourseProgress(courseId);
          this.saveLastVisitedCourse();
        }

        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        console.error('خطأ في جلب بيانات الكورس:', err);
      }
    });
  }

  private initLessonsPlayback(fullCourse: any, courseId: string): void {
    if (fullCourse?.units && fullCourse.units.length > 0) {
      const firstUnit = fullCourse.units[0];
      if (firstUnit?._id) {
        this.expandedUnits.add(firstUnit._id);
      }
      if (firstUnit?.lessons && firstUnit.lessons.length > 0) {
        this.selectUnitLesson(firstUnit, 0);
      }
    } else if (fullCourse?.lessons && fullCourse.lessons.length > 0) {
      const savedIndex = localStorage.getItem(`lastLesson_${courseId}`);
      const startIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
      const validIndex = (startIndex >= 0 && startIndex < fullCourse.lessons.length) ? startIndex : 0;
      this.selectLesson(validIndex);
    } else if (fullCourse?.youtubeUrl) {
      this.activeRawLessonUrl = fullCourse.youtubeUrl;
      this.activeLessonUrl = this.formatYoutubeUrl(fullCourse.youtubeUrl, false);
      this.activeLessonTitle = fullCourse.title || '';
    }
  }

  private saveLastVisitedCourse(): void {
    try {
      if (!this.course) return;
      const lastCourseInfo = {
        id: this.course.id || this.course._id,
        title: this.course.title,
        thumbnail: this.course.thumbnail,
        instructor: this.course.instructorName || this.course.instructor || 'د. محمد الشريف'
      };
      localStorage.setItem('lastVisitedCourse', JSON.stringify(lastCourseInfo));
    } catch (e) {
      console.error('Error saving last visited course:', e);
    }
  }


  validateDiscountCode(): void {
    this.discountErrorMsg = '';
    this.discountSuccessMsg = '';
    const code = this.discountCodeInput.trim();
    if (!code) {
      this.discountErrorMsg = 'أدخل الكود أولاً';
      return;
    }
    const originalPrice = this.course?.price || 0;
    this.isValidatingCode = true;
    this.streakService.validateDiscountCode(code, originalPrice).subscribe({
      next: (res) => {
        this.isValidatedDiscount = true;
        this.discountPercent = res.discountPercent;
        this.discountAmount = res.discountAmount;
        this.finalPrice = res.finalPrice;
        this.discountSuccessMsg = `تم تطبيق الخصم ${res.discountPercent}% بنجاح! السعر الجديد: ${res.finalPrice} جنيه ✅`;
        this.isValidatingCode = false;
      },
      error: (err) => {
        this.isValidatedDiscount = false;
        this.discountErrorMsg = err.error?.error || 'كود الخصم غير صالح';
        this.isValidatingCode = false;
      }
    });
  }

  resetDiscountCode(): void {
    this.discountCodeInput = '';
    this.isValidatedDiscount = false;
    this.discountErrorMsg = '';
    this.discountSuccessMsg = '';
    this.discountPercent = 0;
    this.discountAmount = 0;
    this.finalPrice = this.course?.price || 0;
  }

  enroll(): void {
    if (!this.course?.id) return;

    if (!this.transferNumber || !this.transferNumber.trim()) {
      alert('يرجى كتابة رقم التحويل أولاً لتتمكن من إرسال طلب الاشتراك');
      return;
    }

    if (!this.enrollmentImageFile) {
      alert('يرجى رفع صورة إيصال الدفع أولاً لتتمكن من إرسال طلب الاشتراك');
      return;
    }

    this.loading = true;

    const submit = (imageUrl: string) => {
      const code = this.isValidatedDiscount ? this.discountCodeInput.trim() : undefined;
      const originalPrice = this.course?.price || 0;
      const finalPrice = this.isValidatedDiscount ? this.finalPrice : originalPrice;

      this.courseService.enroll(
        this.course.id,
        this.course.title,
        this.transferNumber,
        this.enrollmentMessage,
        imageUrl,
        code,
        originalPrice,
        finalPrice
      ).subscribe({
        next: () => {
          this.isPending = true;
          this.loading = false;
          this.isUploadingPaymentImage = false;
          alert('تم إرسال طلب الاشتراك بنجاح. يرجى انتظار موافقة الإدارة لتفعيل الكورس ✅');
        },
        error: (err: any) => {
          this.loading = false;
          this.isUploadingPaymentImage = false;
          const serverMsg = err?.error?.error;
          if (err?.status === 400 && serverMsg) {
            this.isPending = true;
            alert('⏳ ' + serverMsg);
          } else {
            alert(serverMsg || 'حدث خطأ أثناء إرسال الطلب ❌');
          }
        }
      });
    };

    if (this.enrollmentImageFile) {
      this.isUploadingPaymentImage = true;
      this.courseService.uploadFile(this.enrollmentImageFile).subscribe({
        next: (res) => submit(res.url || res.secure_url || ''),
        error: (err: any) => {
          this.loading = false;
          this.isUploadingPaymentImage = false;
          const msg = err?.error?.error || err?.message || 'فشل رفع صورة إيصال الدفع';
          alert(msg);
        }
      });
    } else {
      submit('');
    }
  }

  // ── 💳 Card Payment Handlers (Visa / Mastercard / Mada) ──
  onCardNumberInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.substring(0, 16);
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    this.cardForm.number = parts.join(' ');
  }

  onCardExpiryInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    if (value.length >= 2) {
      this.cardForm.expiry = value.substring(0, 2) + '/' + value.substring(2);
    } else {
      this.cardForm.expiry = value;
    }
  }

  onCardCvcInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    this.cardForm.cvc = value;
  }

  payWithCard(): void {
    if (!this.course?.id) return;
    this.cardErrorMsg = '';

    const cleanNumber = this.cardForm.number.replace(/\s+/g, '');
    if (!cleanNumber || cleanNumber.length < 15) {
      this.cardErrorMsg = 'يرجى إدخال رقم بطاقة بنكية صحيح مكون من 16 رقماً.';
      return;
    }

    if (!this.cardForm.expiry || !this.cardForm.expiry.includes('/')) {
      this.cardErrorMsg = 'يرجى إدخال تاريخ انتهاء البطاقة بصيغة MM/YY (مثال: 08/28).';
      return;
    }

    if (!this.cardForm.cvc || this.cardForm.cvc.length < 3) {
      this.cardErrorMsg = 'يرجى إدخال رمز الأمان (CVV/CVC) المكون من 3 أو 4 أرقام.';
      return;
    }

    if (!this.cardForm.holderName || this.cardForm.holderName.trim().length < 3) {
      this.cardErrorMsg = 'يرجى إدخال اسم حامل البطاقة كما هو مطبوع عليها.';
      return;
    }

    this.isProcessingCard = true;
    const studentId = localStorage.getItem('userId') || '';
    const studentName = this.authService.getUserName() || this.studentName || 'طالب المنصة';
    const originalPrice = this.course?.price || 0;
    const finalPrice = this.isValidatedDiscount ? this.finalPrice : originalPrice;
    const discountCode = this.isValidatedDiscount ? this.discountCodeInput.trim() : undefined;

    this.paymentService.payWithCard({
      courseId: this.course.id,
      studentId,
      studentName,
      amount: finalPrice,
      cardNumber: cleanNumber,
      cardExpiry: this.cardForm.expiry,
      cardCvc: this.cardForm.cvc,
      cardHolderName: this.cardForm.holderName.trim(),
      discountCode
    }).subscribe({
      next: (res) => {
        this.isProcessingCard = false;
        this.isEnrolled = true;
        this.isPending = false;
        this.cardPaymentSuccess = true;
        this.cardPaymentTxId = res.transactionId || 'TXN-SUCCESS';
        this.cardPaymentDetails = res;
        this.courseService.invalidateCoursesCache();
        // Reload course with full video lessons
        this.loadCourseData(this.course.id);
      },
      error: (err) => {
        this.isProcessingCard = false;
        this.cardErrorMsg = err?.error?.error || 'فشلت عملية الدفع. يرجى مراجعة بيانات البطاقة والمحاولة مرة أخرى.';
      }
    });
  }

  payWithStripeCheckout(): void {
    if (!this.course?.id) return;
    this.isProcessingCard = true;
    const studentId = localStorage.getItem('userId') || '';
    const discountCode = this.isValidatedDiscount ? this.discountCodeInput.trim() : undefined;

    this.paymentService.createCheckoutSession(this.course.id, studentId, discountCode).subscribe({
      next: (res) => {
        this.isProcessingCard = false;
        if (res.url) {
          window.location.href = res.url;
        }
      },
      error: (err) => {
        this.isProcessingCard = false;
        this.cardErrorMsg = err?.error?.error || 'فشل فتح بوابة الدفع الإلكتروني';
      }
    });
  }

  closePaymentSuccessModal(): void {
    this.cardPaymentSuccess = false;
  }

  checkProgress(courseData: any): void {
    // Basic progress calculation: lessons completed / total lessons
    // In a real app, this would be fetched from Firestore 'enrollments'
    // For now, let's simulation based on course completion flag or quiz
    if (this.isFinished || this.quizScore >= 70) {
      this.progress = 100;
      this.showRatingSection = true;
    }
  }

  setCourseRating(stars: number) { this.courseRating = stars; }
  setTeacherRating(stars: number) { this.teacherRating = stars; }

  submitReview(): void {
    if (this.courseRating === 0 || this.teacherRating === 0) {
      alert('يرجى اختيار تقييم بالنجوم لكل من الكورس والمعلم');
      return;
    }

    const reviewData = {
      courseId: this.course.id,
      courseTitle: this.course.title,
      teacherId: this.course.instructorId || 'unknown',
      studentId: this.currentUserId,
      studentName: this.studentName,
      courseRating: this.courseRating,
      teacherRating: this.teacherRating,
      comment: this.reviewComment
    };

    this.courseService.submitReview(reviewData).subscribe({
      next: () => {
        this.isReviewSubmitted = true;
        alert('شكراً لك! تم إرسال تقييمك بنجاح ❤️');
      },
      error: (err: any) => {
        alert('حدث خطأ أثناء إرسال التقييم');
      }
    });
  }

  extractYoutubeId(url: string): string {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();

    // 1. Shorts link: youtube.com/shorts/ID
    if (trimmed.includes('youtube.com/shorts/')) {
      const parts = trimmed.split('youtube.com/shorts/')[1];
      const id = parts?.split(/[\?\&/#]/)[0];
      if (id && id.length === 11) return id;
    }

    // 2. Short link: youtu.be/ID
    if (trimmed.includes('youtu.be/')) {
      const parts = trimmed.split('youtu.be/')[1];
      const id = parts?.split(/[\?\&/#]/)[0];
      if (id && id.length === 11) return id;
    }

    // 3. Watch link: youtube.com/watch?v=ID or m.youtube.com/watch?v=ID
    if (trimmed.includes('youtube.com/watch') || trimmed.includes('m.youtube.com/watch')) {
      try {
        const queryString = trimmed.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        const v = params.get('v');
        if (v && v.length === 11) return v;
      } catch {}
    }

    // 4. Embed link: /embed/ID
    if (trimmed.includes('/embed/')) {
      const parts = trimmed.split('/embed/')[1];
      const id = parts?.split(/[\?\&/#]/)[0];
      if (id && id.length === 11) return id;
    }

    // 5. Fallback Regex for any format
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return match[2];
    }

    return '';
  }

  formatYoutubeUrl(url: string, autoPlay: boolean = false): SafeResourceUrl {
    this.youtubePlayerError = null;
    this.isPlayerLoading = true;

    if (!url) {
      this.isPlayerLoading = false;
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }

    const trimmed = url.trim();

    // Check if direct video file (.mp4, .webm, cloudinary video)
    if (/\.(mp4|webm|m3u8|ogv)(\?.*)?$/i.test(trimmed) || trimmed.includes('/video/upload/')) {
      this.isDirectVideo = true;
      this.isPlayerLoading = false;
      return this.sanitizer.bypassSecurityTrustResourceUrl(trimmed);
    }
    this.isDirectVideo = false;

    const videoId = this.extractYoutubeId(trimmed);
    if (!videoId) {
      // If no Youtube ID extracted but it's another valid HTTPS embed link (e.g. Vimeo/Drive)
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        this.isPlayerLoading = false;
        return this.sanitizer.bypassSecurityTrustResourceUrl(trimmed);
      }
      this.isPlayerLoading = false;
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }

    const ap = autoPlay ? 1 : 0;
    
    let originParam = '';
    if (window.location.protocol.startsWith('http')) {
      originParam = `&origin=${encodeURIComponent(window.location.origin)}`;
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${ap}&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=1&controls=0&fs=0&playsinline=1&enablejsapi=1${originParam}&cc_load_policy=0&hl=ar`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  isFutureDate(dateStr: any): boolean {
    return !!dateStr && new Date(dateStr).getTime() > Date.now();
  }

  checkScheduledStatus(lesson: any): void {
    if (this.scheduledTimer) {
      clearInterval(this.scheduledTimer);
      this.scheduledTimer = null;
    }
    this.scheduledCountdownDisplay = '';
    
    if (!lesson) {
      this.activeLessonIsScheduled = false;
      return;
    }

    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
      this.activeLessonIsScheduled = false;
      return;
    }

    const scheduledTime = lesson.scheduledAt ? new Date(lesson.scheduledAt).getTime() : 0;
    const now = Date.now();

    if (lesson.isScheduled || (scheduledTime > now && !lesson.url)) {
      this.activeLessonIsScheduled = true;
      if (lesson.scheduledAt) {
        this.scheduledReleaseDate = new Date(lesson.scheduledAt);
        this.scheduledReleaseDateDisplay = this.scheduledReleaseDate.toLocaleString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        this.scheduledReleaseDateDisplay = 'في موعد يحدده المدرس';
      }

      if (scheduledTime > now) {
        this.updateScheduledCountdown(scheduledTime);
        this.scheduledTimer = setInterval(() => {
          const remaining = scheduledTime - Date.now();
          if (remaining <= 0) {
            clearInterval(this.scheduledTimer);
            this.scheduledTimer = null;
            this.activeLessonIsScheduled = false;
            if (this.course?.id) {
              this.loadCourseData(this.course.id);
            }
          } else {
            this.updateScheduledCountdown(scheduledTime);
          }
        }, 1000);
      }
    } else {
      this.activeLessonIsScheduled = false;
    }
  }

  private updateScheduledCountdown(targetTime: number): void {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      this.scheduledCountdownDisplay = '';
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    parts.push(`${seconds} ثانية`);

    this.scheduledCountdownDisplay = parts.join(' و ');
  }

  selectLesson(index: number): void {
    if (!this.course?.lessons || !this.course.lessons[index]) return;

    // Save index to localStorage
    localStorage.setItem(`lastLesson_${this.course.id}`, index.toString());

    this.clearAutoPlayTimer();
    this.activeQuiz = null;
    this.quizScore = null;
    this.selectedLessonIndex = index;
    const lesson = this.course.lessons[index];
    
    this.checkScheduledStatus(lesson);

    this.isVideoPlaying = false;
    this.showVideoControls = true;
    this.stopWatchTracking();
    this.destroyPlayer();
    
    this.accumulatedTimeWatched = 0;
    this.lastTimeUpdated = 0;
    this.currentPlaybackRate = 1;

    if (this.activeLessonIsScheduled) {
      this.isPlayerVisible = false;
      this.activeRawLessonUrl = '';
      this.activeLessonUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
      return;
    }

    // Reset player visibility to destroy the iframe and recreate a clean DOM element
    this.isPlayerVisible = false;
    this.activeRawLessonUrl = lesson.url;
    this.activeLessonUrl = this.formatYoutubeUrl(lesson.url, false);
    this.activeLessonTitle = lesson.title;

    setTimeout(() => {
      this.isPlayerVisible = true;
      if (!this.idmDetected && !this.activeLessonIsScheduled) {
        this.schedulePlayerInit();
        this.start3SecAutoPlay();
      }
    }, 100);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  completeCourse(): void { this.isFinished = true; }
  goBack(): void { this.router.navigate(['/student-dashboard']); }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // الوحدات (Units)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  toggleUnit(unitId: string): void {
    if (this.expandedUnits.has(unitId)) {
      this.expandedUnits.delete(unitId);
    } else {
      this.expandedUnits.add(unitId);
    }
  }

  isUnitExpanded(unitId: string): boolean {
    return this.expandedUnits.has(unitId);
  }

  selectUnitLesson(unit: any, lessonIdx: number): void {
    const lesson = unit.lessons[lessonIdx];
    if (!lesson) return;

    let globalIdx = 0;
    for (const u of this.course.units || []) {
      if (String(u._id) === String(unit._id)) {
        globalIdx += lessonIdx;
        break;
      }
      globalIdx += (u.lessons?.length || 0);
    }

    this.clearAutoPlayTimer();
    this.selectedUnitLessonKey = `${unit._id}_${lessonIdx}`;
    this.selectedLessonIndex = globalIdx;
    this.activeQuiz = null;
    this.quizScore = null;

    this.checkScheduledStatus(lesson);

    this.isVideoPlaying = false;
    this.showVideoControls = true;
    this.stopWatchTracking();
    this.destroyPlayer();
    this.accumulatedTimeWatched = 0;
    this.lastTimeUpdated = 0;
    this.currentPlaybackRate = 1;

    if (this.activeLessonIsScheduled) {
      this.isPlayerVisible = false;
      this.activeRawLessonUrl = '';
      this.activeLessonUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
      return;
    }

    this.isPlayerVisible = false;
    this.activeRawLessonUrl = lesson.url;
    this.activeLessonUrl = this.formatYoutubeUrl(lesson.url, false);
    this.activeLessonTitle = lesson.title;

    setTimeout(() => {
      this.isPlayerVisible = true;
      if (!this.idmDetected && !this.activeLessonIsScheduled) {
        this.schedulePlayerInit();
        this.start3SecAutoPlay();
      }
    }, 100);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getQuizzesForUnit(unitTitle: string): any[] {
    if (!unitTitle || !this.quizzes || this.quizzes.length === 0) return [];
    const cleanUnit = unitTitle.trim().toLowerCase();
    return this.quizzes.filter(q => {
      if (!q.unitTitle) return false;
      const cleanQuizUnit = q.unitTitle.trim().toLowerCase();
      return cleanQuizUnit === cleanUnit || cleanQuizUnit.includes(cleanUnit) || cleanUnit.includes(cleanQuizUnit);
    });
  }

  hasUnits(): boolean {
    return this.course?.units && this.course.units.length > 0;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // الكويزات (Quizzes)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  loadCourseQuizzes(courseId: string) {
    this.quizService.getQuizzesByCourse(courseId).subscribe({
      next: (res) => this.quizzes = res,
      error: (err) => console.error('خطأ أثناء جلب الكويزات')
    });
  }

  openQuiz(quiz: any) {
    this.activeQuiz = quiz;
    this.quizAnswers = new Array(quiz.questions.length).fill('');
    this.quizScore = null;
  }

  closeQuiz() {
    this.activeQuiz = null;
    this.quizScore = null;
  }

  submitQuiz() {
    if (this.quizAnswers.includes('')) {
      alert('يجب الإجابة على جميع الأسئلة قبل التسليم');
      return;
    }

    // حساب الدرجة
    let correctCount = 0;
    this.activeQuiz.questions.forEach((q: any, i: number) => {
      if (this.quizAnswers[i] === q.options[q.correctOptionIndex]) {
        correctCount++;
      }
    });

    const score = Math.round(((correctCount / this.activeQuiz.questions.length) * 100) * 10) / 10;
    this.quizScore = score;

    const payload = {
      quizId: String(this.activeQuiz.id || this.activeQuiz._id || ''),
      courseId: String(this.course.id || this.course._id || ''),
      courseTitle: this.course.title,
      userId: this.currentUserId,
      studentName: this.studentName,
      studentEmail: localStorage.getItem('userEmail') || '',
      answers: this.quizAnswers,
      score: score,
      totalScore: 100
    };

    this.quizService.submitQuiz(payload).subscribe({
      next: (res) => {
        alert(`تم تسليم الاختبار! درجتك: ${score}% ✅`);
        this.loadCourseProgress(this.course.id);
        // Don't close immediately if we want to show results
      },
      error: (err) => {
        alert('خطأ أثناء تسليم الاختبار');
      }
    });
  }

  loadCourseProgress(courseId: string) {
    this.progressLoading = true;
    this.courseService.getCourseProgress(courseId, this.currentUserId).subscribe({
      next: (res: any) => {
        this.completedLessons = res.completedLessons || [];
        this.isEligibleForCertificate = res.isEligible || false;
        this.certificateStatus = res;
        this.progressLoading = false;
        
        // حساب نسبة التقدم الإجمالية
        const total = res.totalLessons || 1;
        const watched = this.completedLessons.length;
        this.progress = Math.round((watched / total) * 100);

        if (this.progress === 100 && this.isEligibleForCertificate) {
          this.showRatingSection = true;
        }
      },
      error: (err: any) => {
        console.error('خطأ في جلب التقدم:', err);
        this.progressLoading = false;
      }
    });
  }

  toggleLessonWatched(index: number, completed: boolean = true) {
    if (!this.course?.id || this.completingLessons.has(index)) return;
    if (completed && this.completedLessons.includes(index)) return;

    if (completed) {
      this.completingLessons.add(index);
    }

    this.courseService.completeLesson(this.course.id, index, completed).subscribe({
      next: () => {
        if (completed) {
          this.completingLessons.delete(index);
        }
        this.loadCourseProgress(this.course.id);
      },
      error: (err: any) => {
        if (completed) {
          this.completingLessons.delete(index);
        }
        console.error('خطأ في تحديث حالة مشاهدة الدرس:', err);
      }
    });
  }

  isLessonCompleted(index: number): boolean {
    return this.completedLessons.includes(index);
  }

  markActiveLessonWatched(): void {
    if (this.isLessonCompleted(this.selectedLessonIndex) || this.completingLessons.has(this.selectedLessonIndex) || !this.course?.id) return;

    this.completingLessons.add(this.selectedLessonIndex);

    this.courseService.completeLesson(this.course.id, this.selectedLessonIndex, true).subscribe({
      next: (res) => {
        this.completingLessons.delete(this.selectedLessonIndex);
        if (!this.completedLessons.includes(this.selectedLessonIndex)) {
          this.completedLessons = [...this.completedLessons, this.selectedLessonIndex];
        }
        if (res.pointsAwarded > 0) {
          this.lastPointsEarned = res.pointsAwarded;
          setTimeout(() => { this.lastPointsEarned = null; }, 4000);
        }
        this.loadCourseProgress(this.course.id);
      },
      error: (err: any) => {
        this.completingLessons.delete(this.selectedLessonIndex);
        console.error('خطأ في تسجيل مشاهدة الدرس:', err);
      }
    });
  }

  get allLessons(): any[] {
    if (!this.course) return [];
    const list: any[] = [];
    // Flat lessons
    if (this.course.lessons) {
      this.course.lessons.forEach((l: any, idx: number) => {
        list.push({ ...l, globalIndex: idx });
      });
    }
    // Unit lessons
    if (this.course.units) {
      let globalIdx = this.course.lessons?.length || 0;
      this.course.units.forEach((u: any) => {
        if (u.lessons) {
          u.lessons.forEach((l: any, li: number) => {
            list.push({ ...l, globalIndex: globalIdx + li });
          });
        }
        globalIdx += u.lessons?.length || 0;
      });
    }
    return list;
  }

  getUnitLessonGlobalIndex(unit: any, lessonIdx: number): number {
    if (!this.course) return 0;
    let globalIdx = 0;
    for (const u of this.course.units || []) {
      if (String(u._id) === String(unit._id)) {
        globalIdx += lessonIdx;
        break;
      }
      globalIdx += (u.lessons?.length || 0);
    }
    return globalIdx;
  }

  requestCertificateIssuance() {
    if (!this.isEligibleForCertificate) {
      alert('⚠️ عذراً، لم تستوفِ شروط إصدار الشهادة بعد. يرجى مشاهدة جميع الفيديوهات واجتياز كل الكويزات بنسبة تفوق 70%.');
      return;
    }

    // حساب متوسط درجات الاختبارات لإدراجه في الشهادة، أو وضع 100 في حال عدم وجود كويزات
    const averageQuizScore = this.certificateStatus?.quizzes && this.certificateStatus.quizzes.length > 0
      ? Math.round(this.certificateStatus.quizzes.reduce((acc: number, curr: any) => acc + (curr.maxScore || 0), 0) / this.certificateStatus.quizzes.length)
      : 100;

    const certData = {
      userId: this.currentUserId,
      studentName: this.studentName,
      courseId: this.course.id,
      courseTitle: this.course.title,
      score: averageQuizScore,
      date: new Date(),
      signature: 'Basmat Elm Digital Signature'
    };

    this.quizService.issueCertificate(certData).subscribe({
      next: () => {
        alert('🎉 مبروك! تم إصدار شهادة التقدير لك بنجاح. يمكنك الآن رؤيتها وتحميلها كملف PDF.');
        this.loadCourseProgress(this.course.id);
      },
      error: (err: any) => {
        alert('❌ خطأ في إصدار الشهادة: ' + (err.error?.error || err.message));
      }
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // إنشاء وتحميل شهادة التقدير (PDF)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  async downloadCertificate(): Promise<void> {
    const certificateElement = document.getElementById('certificateData');
    if (!certificateElement) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      html2canvas(certificateElement, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`شهادة_إتمام_${this.course.title.replace(/ /g, '_')}.pdf`);
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // دردشة الكورس (Chat)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  loadChatMessages(courseId: string) {
    this.chatService.getMessages(courseId).subscribe({
      next: (res) => {
        this.chatMessages = res;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => console.error('خطأ في جلب الرسائل')
    });
  }

  sendChatMessage() {
    if (!this.newChatMessage.trim() || !this.course?.id) return;

    this.chatService.sendMessage(this.course.id, this.newChatMessage).subscribe({
      next: () => {
        this.newChatMessage = '';
      },
      error: (err) => alert('فشل إرسال الرسالة')
    });
  }

  scrollToBottom() {
    const chatContainer = document.getElementById('chat-box');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // ══════════════════════════════════════════════════════
  // 🛡️ ADVANCED SCREEN RECORDING PROTECTION SYSTEM
  // ══════════════════════════════════════════════════════

  private screenProtectionActive = false;
  private visibilityHandler: any;
  private screenShareStream: MediaStream | null = null;
  private antiCaptureInterval: any;
  screenRecordingDetected = false;
  screenRecordingWarning = false;

  /**
   * تفعيل كامل نظام الحماية - يُستدعى عند تشغيل الفيديو
   */
  activateScreenProtection(): void {
    if (this.screenProtectionActive) return;
    this.screenProtectionActive = true;

    this.interceptBrowserScreenShare();
    this.setupVisibilityProtection();
    this.injectAntiCaptureCSS();
    this.blockPrintAndScreenshot();
    this.setupKeyboardProtection();

    console.log('🛡️ نظام حماية الشاشة مفعّل');
  }

  deactivateScreenProtection(): void {
    this.screenProtectionActive = false;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.antiCaptureInterval) clearInterval(this.antiCaptureInterval);
    this.removeAntiCaptureCSS();
  }

  // ── 1. كشف مشاركة الشاشة عبر المتصفح واعتراضها ──────────────
  private interceptBrowserScreenShare(): void {
    const original = navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);
    if (!original) return;

    const self = this;
    (navigator.mediaDevices as any).getDisplayMedia = async function(constraints?: any) {
      // أظهر تحذيراً فورياً
      self.screenRecordingWarning = true;
      self.pauseVideoPlayer();

      // انتظر قرار المستخدم
      return new Promise((resolve, reject) => {
        // نرفض الطلب ونخبر الطالب
        setTimeout(() => {
          self.screenRecordingWarning = false;
        }, 5000);
        reject(new DOMException('تم حظر مشاركة الشاشة على هذه المنصة التعليمية', 'NotAllowedError'));
      });
    };
  }

  // ── 2. إيقاف الفيديو عند مغادرة الصفحة أو تصغيرها ──────────
  private setupVisibilityProtection(): void {
    this.visibilityHandler = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        this.pauseVideoPlayer();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // كشف تصغير النافذة
    window.addEventListener('blur', () => {
      if (this.screenProtectionActive) {
        this.pauseVideoPlayer();
      }
    });
  }

  // ── 3. CSS Anti-Capture Layer (تقنية mix-blend-mode) ─────────
  // هذه التقنية تجعل محتوى الفيديو يظهر مختلفاً في برامج التسجيل
  // التي تعتمد على التقاط طبقات الـ compositor بشكل منفصل
  private injectAntiCaptureCSS(): void {
    const styleId = 'anti-capture-style';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* طبقة الحماية - تتداخل مع آليات التقاط الشاشة */
      .anti-capture-overlay {
        position: fixed !important;
        inset: 0 !important;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        background: transparent !important;
        mix-blend-mode: difference !important;
        animation: captureFlicker 0.1s steps(1) infinite !important;
        display: none;
      }

      @keyframes captureFlicker {
        0%   { opacity: 0; }
        50%  { opacity: 0; }
        100% { opacity: 0; }
      }

      /* منع الـ screenshot عبر print media */
      @media print {
        body * { visibility: hidden !important; }
        body::after {
          content: '🚫 محتوى محمي - لا يمكن طباعته' !important;
          visibility: visible !important;
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          font-size: 2rem !important;
          color: #ef4444 !important;
        }
      }

      /* حماية إضافية لحقل الفيديو */
      .cv-video-iframe {
        -webkit-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    // أنشئ طبقة الحماية
    const overlay = document.createElement('div');
    overlay.className = 'anti-capture-overlay';
    overlay.id = 'anti-capture-overlay';
    document.body.appendChild(overlay);
  }

  private removeAntiCaptureCSS(): void {
    document.getElementById('anti-capture-style')?.remove();
    document.getElementById('anti-capture-overlay')?.remove();
  }

  // ── 4. منع الطباعة والـ Screenshot من المتصفح ────────────────
  private blockPrintAndScreenshot(): void {
    // منع Ctrl+P (طباعة)
    // منع PrtScn لا يمكن 100% لكن نضيف رسالة
    window.addEventListener('beforeprint', (e) => {
      e.preventDefault();
      alert('🚫 لا يمكن طباعة المحتوى التعليمي المحمي');
      window.stop();
    });

    // منع Print via matchMedia
    const printMQ = window.matchMedia('print');
    printMQ.addEventListener('change', (mq) => {
      if (mq.matches) {
        // إخفاء الفيديو فوراً أثناء الطباعة
        const iframe = document.getElementById('protected-player') as HTMLIFrameElement;
        if (iframe) iframe.style.visibility = 'hidden';
        setTimeout(() => {
          if (iframe) iframe.style.visibility = 'visible';
        }, 1000);
      }
    });
  }

  // ── 5. حماية لوحة المفاتيح ───────────────────────────────────
  private setupKeyboardProtection(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // منع أدوات المطور
      if (e.key === 'F12') { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && ['I','J','C','K'].includes(e.key)) { e.preventDefault(); return; }
      if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return; } // عرض المصدر
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); return; } // طباعة
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); return; } // حفظ

      // كشف PrtScn (غير موثوق لكن نسجّله)
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        this.logSuspiciousActivity('محاولة لقطة شاشة بـ PrintScreen');
      }

      // Windows Game Bar (Win + G) → لا يمكن منعه لكن نسجّله
      if (e.metaKey && e.key === 'g') {
        this.logSuspiciousActivity('محاولة فتح Game Bar');
      }
    }, true);
  }

  // ── مساعد: إيقاف الفيديو ─────────────────────────────────────
  private pauseVideoPlayer(): void {
    try {
      if (this.player && typeof this.player.pauseVideo === 'function') {
        this.player.pauseVideo();
      }
      this.isVideoPlaying = false;
    } catch {}
  }

  // ── مساعد: تسجيل النشاط المشبوه وإرساله للـ backend ─────────
  private logSuspiciousActivity(action: string): void {
    const log = {
      action,
      student: this.studentName,
      userId: this.currentUserId,
      shortId: this.shortUserId,
      phone: this.userPhone,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    console.warn('🚨 نشاط مشبوه:', log);
    // إرسال للـ backend (اختياري)
    try {
      fetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(log)
      }).catch(() => {});
    } catch {}
  }

  // ── واجهة المستخدم: إغلاق التحذير ───────────────────────────
  dismissScreenWarning(): void {
    this.screenRecordingWarning = false;
  }

  // ══════════════════════════════════════════════════════════════
  // 🔬 FORENSIC TEMPORAL WATERMARK - يخترق OBS و Bandicam
  // ══════════════════════════════════════════════════════════════
  //
  // المبدأ العلمي:
  // - كل 60 إطار (ثانية واحدة عند 60fps) → يومض الـ canvas لإطار واحد (16ms)
  // - العين البشرية: لا تدرك أي شيء أقل من 25ms
  // - OBS / Bandicam / أي مسجّل: يلتقط هذا الإطار الواحد
  // - النتيجة: كل تسجيل يحتوي هوية الطالب كل ثانية بالضبط 🎯
  //
  // هذه التقنية تُستخدم في صناعة السينما لكشف تسريب الأفلام
  // ══════════════════════════════════════════════════════════════

  private forensicAnimationId: number = 0;
  private forensicFrameCount: number = 0;
  private forensicCanvas: HTMLCanvasElement | null = null;
  private forensicCtx: CanvasRenderingContext2D | null = null;

  // الإعدادات
  private readonly FLASH_EVERY_FRAMES = 90;    // كل 90 إطار ≈ 1.5 ثانية
  private readonly FLASH_DURATION_FRAMES = 2;   // إطاران فقط = ~33ms (غير مرئي للعين)
  private readonly NOISE_EVERY_FRAMES = 3;      // ضوضاء خفيفة كل 3 إطارات

  startForensicProtection(): void {
    return;
  }

  private runForensicLoop(): void {
    this.forensicAnimationId = requestAnimationFrame(() => {
      if (!this.forensicCanvas || !this.forensicCtx || !this.screenProtectionActive) return;

      // تحديث أبعاد الـ canvas
      const w = this.forensicCanvas.offsetWidth;
      const h = this.forensicCanvas.offsetHeight;
      if (this.forensicCanvas.width !== w) this.forensicCanvas.width = w;
      if (this.forensicCanvas.height !== h) this.forensicCanvas.height = h;

      this.forensicFrameCount++;
      const ctx = this.forensicCtx;

      // ── Phase 1: امسح الإطار السابق ──
      ctx.clearRect(0, 0, w, h);

      // ── Phase 2: Forensic Flash (الإطار الجنائي) ──
      const flashStart = this.forensicFrameCount % this.FLASH_EVERY_FRAMES;
      if (flashStart < this.FLASH_DURATION_FRAMES) {
        this.drawForensicFrame(ctx, w, h);
      }

      // ── Phase 3: ضوضاء خفيفة مستمرة (تعيق برامج ضغط التسجيل) ──
      if (this.forensicFrameCount % this.NOISE_EVERY_FRAMES === 0) {
        this.drawSubtleNoise(ctx, w, h);
      }

      this.runForensicLoop();
    });
  }

  // رسم الإطار الجنائي - يظهر في تسجيلات OBS
  private drawForensicFrame(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const timestamp = new Date().toLocaleString('ar-EG');

    // خلفية شبه شفافة جداً (مرئية للمسجّل، غير مرئية للعين)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, w, h);

    // نص هوية الطالب
    const lines = [
      `👤 ${this.studentName}`,
      `🆔 ${this.currentUserId}`,
      `📱 ${this.userPhone}`,
      `⏰ ${timestamp}`,
      `🔐 محتوى محمي - أكاديمية المتميزون`
    ];

    // رسم النص في مواضع متعددة على الشاشة
    const positions = [
      { x: w * 0.1, y: h * 0.1 },
      { x: w * 0.5, y: h * 0.5 },
      { x: w * 0.7, y: h * 0.85 },
    ];

    positions.forEach((pos, pi) => {
      ctx.save();
      ctx.font = `bold ${Math.max(10, w * 0.012)}px Cairo, monospace`;
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';

      // ظل للنص (يزيد وضوحه في التسجيل)
      ctx.shadowColor = 'rgba(255,0,0,0.8)';
      ctx.shadowBlur = 3;

      lines.forEach((line, i) => {
        // تدوير خفيف في كل موضع
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pi === 1 ? -0.05 : 0);

        // خلفية النص
        const metrics = ctx.measureText(line);
        ctx.fillStyle = 'rgba(255,0,0,0.06)';
        ctx.fillRect(-metrics.width - 4, (i * 18) - 14, metrics.width + 8, 18);

        // النص نفسه
        ctx.fillStyle = `rgba(255, 255, 255, 0.07)`;
        ctx.fillText(line, 0, i * 18);

        ctx.restore();
      });
      ctx.restore();
    });

    // باركود بصري (نمط فريد لكل طالب)
    this.drawUserBarcode(ctx, w, h);
  }

  // رسم باركود بصري فريد لكل طالب
  private drawUserBarcode(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const userId = this.currentUserId || 'unknown';
    const barWidth = 2;
    const barHeight = Math.min(40, h * 0.05);
    const startX = 10;
    const startY = h - barHeight - 10;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';

    // تحويل userId لنمط بصري
    for (let i = 0; i < Math.min(userId.length * 4, w - 20); i++) {
      const charCode = userId.charCodeAt(i % userId.length);
      if ((charCode + i) % 2 === 0) {
        ctx.fillRect(startX + (i * barWidth), startY, barWidth, barHeight);
      }
    }
  }

  // ضوضاء خفيفة مستمرة لإعاقة برامج ضغط الفيديو
  private drawSubtleNoise(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // نقاط عشوائية نادرة جداً - غير مرئية للعين لكن تزيد صعوبة الضغط
    const numPoints = Math.floor(w * h * 0.00005); // 0.005% فقط من البكسلات
    for (let i = 0; i < numPoints; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = `rgba(255,255,255,0.04)`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  stopForensicProtection(): void {
    if (this.forensicAnimationId) {
      cancelAnimationFrame(this.forensicAnimationId);
    }
    if (this.forensicCtx && this.forensicCanvas) {
      this.forensicCtx.clearRect(0, 0, this.forensicCanvas.width, this.forensicCanvas.height);
    }
  }
}


