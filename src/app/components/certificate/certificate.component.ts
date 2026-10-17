import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-certificate',
  templateUrl: './certificate.component.html',
  styleUrls: ['./certificate.component.css']
})
export class CertificateComponent implements OnInit {
  // ✅ دول الـ Inputs اللي الـ CourseView بيبعتهم
  @Input() show: boolean = false;
  @Input() studentName: string = ''; 
  @Input() courseName: string = '';
  
  // ✅ ده الحدث اللي بيقفل الشهادة
  @Output() closeEvent = new EventEmitter<void>();

  // ✅ متغيرات داخلية للشهادة
  certificateId: string = '';
  today: Date = new Date();

  constructor() {}

  ngOnInit(): void {
    // توليد رقم تحقق فريد عند فتح الشهادة
    this.certificateId = `ZM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  downloadPDF() {
    window.print();
  }

  // ✅ دالة الإغلاق اللي بتنادي الـ EventEmitter
  close() {
    this.closeEvent.emit();
  }
}
