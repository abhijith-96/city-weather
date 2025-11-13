import { Inject, Injectable, HttpException, HttpStatus, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Weather, WeatherDocument } from './weather.schema';
import { ConfigService } from '@nestjs/config'; 

@Injectable()
export class WeatherService {
  constructor(@InjectModel(Weather.name) private weatherModel: Model<WeatherDocument>,
  @Inject('RABBITMQ_CHANNEL') private channel: any,
  private readonly configService: ConfigService,
) {}

  // ✅ Helper to format structured responses
  private formatResponse(
    status: 'success' | 'error',
    code: number,
    message: string,
    data: any = null,
  ) {
    return { status, code, message, data };
  }

  // ✅ 1. Add a new weather location
  async createWeather(dto: { city: string; lat: number; lon: number }) {
    try {
      const exists = await this.weatherModel.findOne({ city: dto.city.trim() });
      if (exists) {
        throw new ConflictException(this.formatResponse('error', 409, 'City already exists'));
      }

      const newCity = await this.weatherModel.create(dto);
      await this.publish('city.created', newCity);
      return this.formatResponse('success', 201, 'City added successfully', newCity);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        this.formatResponse('error', 500, 'Error creating city'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ 2. Get all weather locations
  async getAllWeather() {
    try {
      const cities = await this.weatherModel.find().sort({ city: 1 }).lean();
      return this.formatResponse('success', 200, 'Cities fetched successfully', cities);
    } catch {
      throw new HttpException(
        this.formatResponse('error', 500, 'Error fetching cities'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ 3. Get weather for a specific city
  async getWeatherDetails(cityName: string) {
    try {
      const city = await this.weatherModel.findOne({ city: cityName.trim() });
      if (!city)
        throw new NotFoundException(
          this.formatResponse('error', 404, 'City not found in database'),
        );

      const weather = await this.fetchWeather(city.lat, city.lon);
      const data = {
        city: city.city,
        lat: city.lat,
        lon: city.lon,
        weather,
      };

      await this.publish('weather_requested', { city: city.city });

      return this.formatResponse('success', 200, 'Weather fetched successfully', data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        this.formatResponse('error', 500, 'Failed to fetch weather'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ 4. Update city details
  async updateWeather(name: string, dto: { lat?: number; lon?: number }) {
    try {
      const updated = await this.weatherModel.findOneAndUpdate({ city: name.trim() }, dto, {
        new: true,
      });
      if (!updated)
        throw new NotFoundException(this.formatResponse('error', 404, 'City not found'));
      await this.publish('city.updated', updated);

      return this.formatResponse('success', 200, 'City updated successfully', updated);
    } catch {
      throw new HttpException(
        this.formatResponse('error', 500, 'Error updating city'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ 5. Delete city
  async deleteWeather(name: string) {
    try {
      const deleted = await this.weatherModel.findOneAndDelete({ city: name.trim() });
      if (!deleted)
        throw new NotFoundException(this.formatResponse('error', 404, 'City not found'));
      await this.publish('city.deleted', { city: name });

      return this.formatResponse(
        'success',
        200,
        `City '${name}' deleted successfully`,
      );
    } catch {
      throw new HttpException(
        this.formatResponse('error', 500, 'Error deleting city'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Helper: Fetch weather from OpenWeather
  private async fetchWeather(lat: number, lon: number) {
    try {
      const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY'); // ✅ read from .env safely
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const { data } = await axios.get(url);
      return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        condition: data.weather[0].description,
        wind_speed: data.wind.speed,
      };
    } catch {
      throw new HttpException(
        this.formatResponse('error', 502, 'Error fetching weather data from API'),
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
  private async publish(event: string, data: any) {
  await this.channel.sendToQueue(
    this.configService.get('RABBITMQ_QUEUE'),
    Buffer.from(JSON.stringify({ event, data, timestamp: new Date() })),
    { persistent: true },
  );
  }
}