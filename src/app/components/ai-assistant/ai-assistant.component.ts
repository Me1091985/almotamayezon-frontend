import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AiService, ChatMessage, Quiz, QuizQuestion } from '../../services/ai.service';

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AiAssistantComponent implements AfterViewChecked {

  @ViewChild('chatBox') chatBox!: ElementRef;

  // ── Tabs ──────────────────────────────
  activeTab: 'chat' | 'summarize' | 'quiz' = 'chat';

  // ── Chat ──────────────────────────────
  chatHistory: ChatMessage[] = [];
  chatInput = '';
  chatLoading = false;
  chatError = '';
  private shouldScrollChat = false;

  // ── Summarize ─────────────────────────
  summarizeText = '';
  summarizeLoading = false;
  summarizeError = '';
  summaryResult = '';

  // ── Quiz ──────────────────────────────
  quizTopic = '';
  quizCount: number = 5;
  quizDifficulty = 'medium';
  quizGrade = '';
  quizLoading = false;
  quizError = '';
  generatedQuiz: Quiz | null = null;
  currentQuestionIndex = 0;
  selectedAnswers: (number | null)[] = [];
  quizAnswered = false;
  quizFinished = false;

  constructor(private ai: AiService) {}

  ngAfterViewChecked(): void {
    if (this.shouldScrollChat) {
      this.scrollChatToBottom();
      this.shouldScrollChat = false;
    }
  }

  setTab(tab: 'chat' | 'summarize' | 'quiz') {
    this.activeTab = tab;
  }

  // ════ CHAT ════════════════════════════════════════════════

  quickAsk(q: string) {
    this.chatInput = q;
    this.sendChat();
  }

  onEnterChat(e: KeyboardEvent) {
    if (!e.shiftKey) {
      e.preventDefault();
      this.sendChat();
    }
  }

  sendChat() {
    const q = this.chatInput.trim();
    if (!q || this.chatLoading) return;

    this.chatError = '';
    this.chatHistory.push({ role: 'user', content: q });
    this.chatInput = '';
    this.chatLoading = true;
    this.shouldScrollChat = true;

    // Build history for API (exclude last user msg we just pushed)
    const historyForApi = this.chatHistory.slice(0, -1);

    this.ai.chat(q, historyForApi).subscribe({
      next: (res) => {
        this.chatHistory.push({ role: 'assistant', content: res.answer });
        this.chatLoading = false;
        this.shouldScrollChat = true;
      },
      error: (err) => {
        this.chatError = err?.error?.error || 'حدث خطأ. حاول مرة أخرى.';
        this.chatLoading = false;
        this.shouldScrollChat = true;
      }
    });
  }

  private scrollChatToBottom() {
    try {
      if (this.chatBox?.nativeElement) {
        this.chatBox.nativeElement.scrollTop = this.chatBox.nativeElement.scrollHeight;
      }
    } catch {}
  }

  // ════ SUMMARIZE ═══════════════════════════════════════════

  doSummarize() {
    if (this.summarizeText.trim().length < 20 || this.summarizeLoading) return;
    this.summarizeError = '';
    this.summaryResult = '';
    this.summarizeLoading = true;

    this.ai.summarize(this.summarizeText).subscribe({
      next: (res) => {
        this.summaryResult = res.summary;
        this.summarizeLoading = false;
      },
      error: (err) => {
        this.summarizeError = err?.error?.error || 'حدث خطأ. حاول مرة أخرى.';
        this.summarizeLoading = false;
      }
    });
  }

  // ════ QUIZ ════════════════════════════════════════════════

  doGenerateQuiz() {
    if (!this.quizTopic.trim() || this.quizLoading) return;
    this.quizError = '';
    this.quizLoading = true;
    this.generatedQuiz = null;
    this.quizFinished = false;

    this.ai.generateQuiz(this.quizTopic, this.quizCount, this.quizDifficulty, this.quizGrade).subscribe({
      next: (res) => {
        this.generatedQuiz = res.quiz;
        this.currentQuestionIndex = 0;
        this.selectedAnswers = new Array(res.quiz.questions.length).fill(null);
        this.quizAnswered = false;
        this.quizLoading = false;
      },
      error: (err) => {
        this.quizError = err?.error?.error || 'حدث خطأ في إنشاء الاختبار.';
        this.quizLoading = false;
      }
    });
  }

  get currentQuestion(): QuizQuestion | null {
    return this.generatedQuiz?.questions[this.currentQuestionIndex] ?? null;
  }

  selectAnswer(index: number) {
    if (this.quizAnswered) return;
    this.selectedAnswers[this.currentQuestionIndex] = index;
    this.quizAnswered = true;
  }

  nextQuestion() {
    if (!this.generatedQuiz) return;
    this.currentQuestionIndex++;
    this.quizAnswered = this.selectedAnswers[this.currentQuestionIndex] !== null;
  }

  finishQuiz() {
    this.quizFinished = true;
  }

  getScore(): number {
    if (!this.generatedQuiz) return 0;
    return this.generatedQuiz.questions.reduce((score, q, i) =>
      score + (this.selectedAnswers[i] === q.correctIndex ? 1 : 0), 0);
  }

  getScorePercent(): number {
    if (!this.generatedQuiz) return 0;
    return Math.round((this.getScore() / this.generatedQuiz.questions.length) * 100);
  }

  getResultMessage(): string {
    const p = this.getScorePercent();
    if (p >= 90) return '🌟 ممتاز! أداء رائع';
    if (p >= 75) return '✅ جيد جداً! استمر';
    if (p >= 60) return '👍 جيد، يمكنك التحسن';
    return '💪 لا تيأس! راجع الدرس وحاول مجدداً';
  }

  retryQuiz() {
    if (!this.generatedQuiz) return;
    this.currentQuestionIndex = 0;
    this.selectedAnswers = new Array(this.generatedQuiz.questions.length).fill(null);
    this.quizAnswered = false;
    this.quizFinished = false;
  }

  restartQuiz() {
    this.generatedQuiz = null;
    this.quizFinished = false;
    this.quizAnswered = false;
  }

  newQuiz() {
    this.generatedQuiz = null;
    this.quizFinished = false;
    this.quizAnswered = false;
    this.quizTopic = '';
  }

  // ════ UTILS ═══════════════════════════════════════════════

  formatMessage(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('تم النسخ!');
    });
  }
}
