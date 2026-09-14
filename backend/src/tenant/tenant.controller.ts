import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { TenantProvisioningService, ProvisionTenantDto } from './tenant-provisioning.service';
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class ProvisionTenantRequestDto implements ProvisionTenantDto {
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @IsString()
  @IsNotEmpty()
  tenantDomain!: string;

  @IsString()
  @IsNotEmpty()
  workspaceName!: string;

  @IsString()
  @IsNotEmpty()
  workspaceSlug!: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail!: string;

  @IsString()
  @IsNotEmpty()
  adminFullName!: string;
}

@Controller('api/v1/tenants')
export class TenantController {
  constructor(private readonly provisioningService: TenantProvisioningService) {}

  @Post('provision')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async provisionTenant(@Body() dto: ProvisionTenantRequestDto) {
    return this.provisioningService.provisionTenantSaga(dto);
  }
}
