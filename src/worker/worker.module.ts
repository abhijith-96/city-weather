import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { WorkerService } from './worker.service';
import { Weather, WeatherSchema } from '../weather/weather.schema';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule,
    RabbitmqModule,   // <-- IMPORTANT: gives access to RABBITMQ_CHANNEL + CONNECTION
    MongooseModule.forFeature([{ name: Weather.name, schema: WeatherSchema }]),
  ],
  providers: [WorkerService],
})
export class WorkerModule {}
