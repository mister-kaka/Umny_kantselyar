import { Module } from '@nestjs/common';
import { ImageProcessorService } from './image-processor.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
    imports: [LoggerModule],
    providers: [ImageProcessorService],
    exports: [ImageProcessorService],
})
export class ImageProcessorModule {}