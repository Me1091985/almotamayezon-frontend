import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { inject } from '@vercel/analytics';

// تفعيل Vercel Analytics لتتبع زيارات الموقع في بيئة الإنتاج فقط
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  inject();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
