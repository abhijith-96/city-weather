import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Weather, WeatherSchema } from './weather.schema';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    // Connects the Weather schema with MongoDB
    MongooseModule.forFeature([{ name: Weather.name, schema: WeatherSchema }]),
    RabbitmqModule, 
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
