import { Controller, Post, Get, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';
import { AnalyzeAiResponseDto } from './dto/analyze-ai.dto';
import { AiResultResponseDto } from './dto/ai-result.dto';

@Controller('documents')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/analyze-ai')
    async analyzeDocument(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<AnalyzeAiResponseDto> {
        return this.aiService.analyzeDocument(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/ai-result')
    async getAiResult(
        @Param('id', ParseIntPipe) id: number,
    ): Promise<AiResultResponseDto | null> {
        return this.aiService.getAiResult(id);
    }
}