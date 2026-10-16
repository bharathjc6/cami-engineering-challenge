import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { ClassificationService } from './classification.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ClassifyRequestDto } from './dto/classify-request.dto';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';
import { HistoryQueryDto } from './dto/history-query.dto';

@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly classificationService: ClassificationService,
  ) {}

  @Get()
  list(@Query() query: ListRequestsQueryDto) {
    return this.requestsService.list(query);
  }

  @Get('history')
  async history(@Query() query: HistoryQueryDto) {
    return { items: await this.classificationService.listHistory(query) };
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.getById(id);
  }

  @Post()
  create(@Body() body: CreateRequestDto) {
    return this.requestsService.create(body.message);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateStatusDto) {
    return this.requestsService.updateStatus(id, body.status);
  }

  @Post('classify')
  classify(@Body() body: ClassifyRequestDto) {
    return this.classificationService.classify(body.message, body.requestId);
  }
}
