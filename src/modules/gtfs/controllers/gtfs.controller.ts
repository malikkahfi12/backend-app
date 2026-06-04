import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { GtfsService } from '../gtfs.service';
import { ImportGtfsResponseDto } from '../dto/import-gtfs.dto';

@ApiTags('GTFS Import')
@ApiBearerAuth()
@Controller('gtfs')
export class GtfsController {
  constructor(private readonly gtfsService: GtfsService) {}

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        source: { type: 'string', example: 'mrt-jakarta' },
        countryCode: { type: 'string', example: 'ID' },
        regionCode: { type: 'string', example: 'jakarta' },
      },
      required: ['file', 'source', 'countryCode', 'regionCode'],
    },
  })
  @ApiCreatedResponse({
    description: 'GTFS import completed.',
    type: ImportGtfsResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'application/zip' ||
          file.originalname.endsWith('.zip')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only .zip files allowed'), false);
        }
      },
    }),
  )
  async importGtfs(
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string; size: number }
      | undefined,
    @Body('source') source: string,
    @Body('countryCode') countryCode: string,
    @Body('regionCode') regionCode: string,
  ): Promise<ImportGtfsResponseDto> {
    if (!file) {
      throw new BadRequestException('GTFS zip file is required');
    }

    return this.gtfsService.import(
      file.buffer,
      source,
      countryCode,
      regionCode,
    );
  }
}
