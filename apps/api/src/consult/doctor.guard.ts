import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from '../common/http';
import { PrismaService } from '../common/prisma.service';

/** Doctor routes need the DOCTOR role and a verified registration, checked on every request. */
@Injectable()
export class DoctorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.switchToHttp().getRequest<AuthedRequest>().user?.id;
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId }, include: { doctorProfile: true } }) : null;
    if (user?.role !== 'DOCTOR' || !user.doctorProfile?.verified) {
      throw new ForbiddenException({ code: 'DOCTORS_ONLY', message: 'This area is for verified doctors.' });
    }
    return true;
  }
}
