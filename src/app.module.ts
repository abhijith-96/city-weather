// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CityModule } from './city/city.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Connect to MongoDB using MONGO_URI from .env
    MongooseModule.forRoot(process.env.MONGO_URI!),

    // Import CityModule
    CityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}