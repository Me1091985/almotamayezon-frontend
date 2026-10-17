import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LiveMeetingService, LiveMeeting } from '../../services/live-meeting.service';
import { ToastService } from '../../services/toast.service';

declare const JitsiMeetExternalAPI: any;

@Component({
  selector: 'app-live-meeting',
  templateUrl: './live-meeting.component.html',
  styleUrls: ['./live-meeting.component.css']
})
export class LiveMeetingComponent implements OnInit, OnDestroy {
  @ViewChild('jitsiContainer', { static: false }) jitsiContainer!: ElementRef;

  meetingId: string = '';
  meeting: LiveMeeting | null = null;
  isLoading = true;
  errorMessage = '';
  isJitsiInitialized = false;
  jitsiApi: any = null;

  currentUser: any = null;
  isAdmin = false;
  isFullscreen = false;

  // Session timer
  sessionSeconds = 0;
  private timerInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private liveMeetingService: LiveMeetingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = {
      id: localStorage.getItem('userId'),
      name: this.authService.getUserName(),
      role: this.authService.getUserRole(),
      email: localStorage.getItem('userEmail'),
      grade: this.authService.getUserGrade()
    };
    this.isAdmin = this.currentUser?.role === 'admin';

    this.route.params.subscribe(params => {
      this.meetingId = params['id'];
      if (this.meetingId) {
        this.loadMeeting();
      } else {
        this.errorMessage = 'معرف الحصة المباشرة غير صحيح';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanupJitsi();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadMeeting(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.liveMeetingService.getMeetingById(this.meetingId).subscribe({
      next: (meeting) => {
        this.meeting = meeting;
        this.isLoading = false;
        // Record attendance for students
        this.liveMeetingService.joinMeeting(meeting._id || meeting.id || this.meetingId).subscribe({
          next: () => {},
          error: (err) => console.warn('Could not record attendance:', err)
        });

        // Initialize Jitsi after view is rendered
        setTimeout(() => {
          this.initJitsi();
        }, 100);
      },
      error: (err) => {
        console.error('Failed to load meeting:', err);
        this.errorMessage = 'تعذر تحميل بيانات الحصة المباشرة. تأكد من الرابط والمحاولة مجدداً.';
        this.isLoading = false;
      }
    });
  }

  async initJitsi(): Promise<void> {
    if (!this.meeting || this.isJitsiInitialized) return;

    try {
      await this.liveMeetingService.loadJitsiScript();

      if (typeof JitsiMeetExternalAPI === 'undefined') {
        throw new Error('Jitsi API not available');
      }

      const domain = 'meet.jit.si';
      const container = this.jitsiContainer.nativeElement;
      container.innerHTML = ''; // Clear container

      const displayName = this.currentUser?.name || (this.isAdmin ? 'المحاضر' : 'طالب');
      const userEmail = this.currentUser?.email || '';

      const toolbarButtons = [
        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
        'fodeviceselection', 'hangup', 'chat', 'recording',
        'livestreaming', 'sharedvideo', 'settings', 'raisehand',
        'videoquality', 'filmstrip', 'stats', 'shortcuts',
        'tileview', 'videobackgroundblur', 'download', 'help'
      ];

      if (this.isAdmin) {
        toolbarButtons.push('mute-everyone', 'security');
      }

      const options = {
        roomName: this.meeting.roomName,
        width: '100%',
        height: '100%',
        parentNode: container,
        userInfo: {
          displayName: displayName,
          email: userEmail
        },
        configOverwrite: {
          startWithAudioMuted: !this.isAdmin,
          startWithVideoMuted: !this.isAdmin,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          defaultLanguage: 'ar',
          toolbarButtons: toolbarButtons,
          disableInviteFunctions: true,
          requireDisplayName: false
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          DEFAULT_REMOTE_DISPLAY_NAME: 'طالب',
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          ENABLE_FEEDBACK_ANIMATION: false
        }
      };

      this.jitsiApi = new JitsiMeetExternalAPI(domain, options);
      this.isJitsiInitialized = true;

      // Start elapsed timer
      this.sessionSeconds = 0;
      this.timerInterval = setInterval(() => {
        this.sessionSeconds++;
      }, 1000);

      // Event listeners
      this.jitsiApi.addEventListeners({
        videoConferenceJoined: (response: any) => {
          this.toastService.show('مرحباً بك في الحصة المباشرة! 🎉');
        },
        videoConferenceLeft: () => {
          this.onLeaveMeeting();
        },
        participantJoined: (participant: any) => {
          console.log('Participant joined:', participant);
        }
      });

      // Set password if exists
      if (this.meeting.password) {
        this.jitsiApi.addEventListener('participantRoleChanged', (event: any) => {
          if (event.role === 'moderator' && this.meeting?.password) {
            this.jitsiApi.executeCommand('password', this.meeting.password);
          }
        });
      }

    } catch (err) {
      console.error('Error initializing Jitsi Meet:', err);
      this.errorMessage = 'حدث خطأ أثناء تشغيل نافذة البث المباشر. يرجى إعادة تحميل الصفحة.';
    }
  }

  cleanupJitsi(): void {
    if (this.jitsiApi) {
      try {
        this.jitsiApi.dispose();
      } catch (e) {
        console.warn('Error disposing Jitsi API:', e);
      }
      this.jitsiApi = null;
    }
    this.isJitsiInitialized = false;
  }

  toggleFullscreen(): void {
    const elem = document.documentElement;
    if (!this.isFullscreen) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      this.isFullscreen = false;
    }
  }

  copyMeetingLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.show('تم نسخ رابط الحصة المباشرة بنجاح 📋');
    }).catch(() => {
      this.toastService.show('تعذر نسخ الرابط تلقائياً ❌');
    });
  }

  onLeaveMeeting(): void {
    this.cleanupJitsi();
    if (this.isAdmin) {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/student-dashboard']);
    }
  }

  get formattedTime(): string {
    const mins = Math.floor(this.sessionSeconds / 60);
    const secs = this.sessionSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
