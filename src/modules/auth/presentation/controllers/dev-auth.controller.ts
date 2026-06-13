import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Internal } from '../../../security/decorators/internal.decorator';
import { AuthService } from '../../auth.service';
import { DevLoginRequestDto } from '../dto/dev-login-request.dto';
import { DevLoginResponseDto } from '../dto/dev-login-response.dto';

@ApiTags('Auth (Dev)')
@Internal()
@Controller('internal/auth')
export class DevAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('dev-login')
  @ApiCreatedResponse({
    description:
      'Dev account login - access token & refresh token tanpa kadaluarsa (100 tahun).',
    type: DevLoginResponseDto,
  })
  async devLogin(
    @Body() dto: DevLoginRequestDto,
  ): Promise<DevLoginResponseDto> {
    return this.authService.createDevSession(dto.username, dto.displayName);
  }
}
