// backend/src/image-processor/image-processor.service.ts
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class ImageProcessorService {
    constructor(private readonly logger: AppLoggerService) {}

    async process(inputPath: string): Promise<string> {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const baseName = path.basename(inputPath, ext);
        const outputPath = path.join(dir, `${baseName}_processed${ext}`);

        try {
            await sharp(inputPath)
                .rotate()
                .resize(2500, 3500, { fit: 'inside', withoutEnlargement: true })
                .grayscale()
                .normalize()
                .toFile(outputPath);

            await this.logger.log({
                module: 'ImageProcessor',
                type: 'PROCESS',
                url: inputPath,
                action: 'обработка изображения',
                status: 'success',
                statusCode: 200,
                message: `Изображение обработано: ${outputPath}`,
            });

            return outputPath;
        } catch (error) {
            await this.logger.log({
                module: 'ImageProcessor',
                type: 'PROCESS',
                url: inputPath,
                action: 'обработка изображения',
                status: 'error',
                statusCode: 500,
                message: error instanceof Error ? error.message : 'Ошибка обработки',
            });

            return inputPath;
        }
    }
}