import { Module } from '@nestjs/common';
import { CvAnalyzerService } from './cv-analyzer.service';

@Module({
  providers: [CvAnalyzerService],
  exports: [CvAnalyzerService],
})
export class CvAnalyzerModule {}
