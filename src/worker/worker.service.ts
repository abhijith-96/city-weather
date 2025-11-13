// src/worker/worker.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Weather, WeatherDocument } from '../weather/weather.schema';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private queue: string;

  constructor(
    @Inject('RABBITMQ_CHANNEL') private readonly channel: any,
    @Inject('RABBITMQ_CONNECTION') private readonly connection: any,
    private readonly configService: ConfigService,
    @InjectModel(Weather.name) private readonly weatherModel: Model<WeatherDocument>,
  ) {
    const q = this.configService.get<string>('RABBITMQ_QUEUE');
    if (!q) {
      throw new Error('❌ RABBITMQ_QUEUE is not configured in .env');
    }
    this.queue = q;
  }

  // ----------------------------------------------------
  // 🔥 Step 1 — Worker Starts Listening to the Queue
  // ----------------------------------------------------
  async onModuleInit() {
    this.logger.log(`🚀 Worker Started — Listening on queue: ${this.queue}`);

    await this.channel.consume(
      this.queue,
      this.handleMessage.bind(this),
      { noAck: false },
    );
  }

  // ----------------------------------------------------
  // 🔥 Step 2 — Properly Close RabbitMQ Connection
  // ----------------------------------------------------
  async onModuleDestroy() {
    this.logger.log('🛑 Worker shutting down — closing RabbitMQ connection');
    try {
      await this.connection.close();
    } catch (err) {
      this.logger.error('❌ Error closing connection', err);
    }
  }

  // ----------------------------------------------------
  // 🔥 Step 3 — Handle Incoming Messages
  // ----------------------------------------------------
  private async handleMessage(msg: any) {
    if (!msg) return;

    try {
      const parsed = JSON.parse(msg.content.toString());
      const { event, data } = parsed;

      this.logger.log(`📩 Received event → ${event}`);

      switch (event) {
        case 'city.created':
          await this.processCityUpdate(data);
          break;

        case 'city.updated':
          await this.processCityUpdate(data);
          break;

        case 'city.deleted':
          this.logger.log(`🗑 City deleted: ${data.city}`);
          break;

        default:
          this.logger.warn(`⚠ Unknown event received: ${event}`);
      }

      this.channel.ack(msg);
    } catch (err) {
      this.logger.error('❌ Error processing message', err);
      this.channel.nack(msg, false, false);
    }
  }

  // ----------------------------------------------------
  // 🔥 Step 4 — Process Insert/Update Weather Jobs
  // ----------------------------------------------------
  private async processCityUpdate(city: any) {
    const cityName = city.city;
    const lat = city.lat;
    const lon = city.lon;

    if (!cityName || lat == null || lon == null) {
      this.logger.warn('⚠ Missing city data for weather update', city);
      return;
    }

    try {
      const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

      const { data } = await axios.get(url);

      const snapshot = {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        condition: data.weather[0].description,
        wind_speed: data.wind.speed,
        fetchedAt: new Date(),
      };

      await this.weatherModel.findOneAndUpdate(
        { city: cityName },
        { $set: { lastWeather: snapshot } },
        { new: true },
      );

      this.logger.log(`🌦 Weather updated in DB for → ${cityName}`);

    } catch (err) {
      this.logger.error(
        `❌ Failed to update weather for ${cityName}`,
        err,
      );
    }
  }
}
