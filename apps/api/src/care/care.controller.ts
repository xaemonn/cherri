import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { Public, ZodPipe } from '../common/http';
import { CareService } from './care.service';

const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(25).default(5),
});

@Controller('care')
export class CareController {
  constructor(private readonly care: CareService) {}

  @Public()
  @Get('resources')
  resources() {
    return this.care.resources();
  }

  @Get('nearby')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  nearby(@Query(new ZodPipe(nearbyQuery)) query: z.infer<typeof nearbyQuery>) {
    return this.care.nearby(query.lat, query.lng, query.radiusKm);
  }
}
