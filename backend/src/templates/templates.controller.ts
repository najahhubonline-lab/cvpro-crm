import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Post()
  create(@Body() createDto: CreateTemplateDto) {
    return this.templatesService.create(createDto);
  }

  @Post('sync')
  syncFromMeta() {
    return this.templatesService.syncFromMeta();
  }
}
