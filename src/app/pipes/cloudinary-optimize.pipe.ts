import { Pipe, PipeTransform } from '@angular/core';
import { optimizeCloudinaryUrl } from '../utils/image-utils';

@Pipe({
  name: 'cldOptimize'
})
export class CloudinaryOptimizePipe implements PipeTransform {
  transform(url: string | null | undefined, width: number = 400, height?: number): string {
    if (!url) return '';
    return optimizeCloudinaryUrl(url, width, height);
  }
}
