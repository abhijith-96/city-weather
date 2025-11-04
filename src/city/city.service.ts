import { Injectable, HttpException, HttpStatus, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { City, CityDocument } from './city.schema';

@Injectable()
export class CityService {
  constructor(@InjectModel(City.name) private cityModel: Model<CityDocument>) {}

  // ✅ Helper to format structured responses
  private formatResponse(status: 'success' | 'error', code: number, message: string, data: any = null) {
    return { status, code, message, data };
  }

  // ✅ 1. Add a new city
  async createCity(dto: { city: string; lat: number; lon: number }) {
    try {
      const exists = await this.cityModel.findOne({ city: dto.city.trim() });
      if (exists) {
        throw new ConflictException(this.formatResponse('error', 409, 'City already exists'));
      }

      const newCity = await this.cityModel.create(dto);
      return this.formatResponse( 'success', 201, 'City added successfully', newCity);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(this.formatResponse('error', 500, 'Error creating city'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ 2. Get all cities
  async getAllCities() {
    try {
      const cities = await this.cityModel.find().sort({ city: 1 }).lean();
      return this.formatResponse('success', 200, 'Cities fetched successfully', cities);
    } catch {
      throw new HttpException(this.formatResponse('error', 500, 'Error fetching cities'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ 3. Get city by name + weather
  async getCityWeather(cityName: string) {
    try {
      const city = await this.cityModel.findOne({ city: cityName.trim() });
      if (!city) throw new NotFoundException(this.formatResponse('error', 404, 'City not found in database'));

      const weather = await this.fetchWeather(city.lat, city.lon);
      const data = {
        city: city.city,
        lat: city.lat,
        lon: city.lon,
        weather,
      };

      return this.formatResponse('success', 200, 'Weather fetched successfully', data);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(this.formatResponse('error', 500, 'Failed to fetch weather'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ 4. Update city
  async updateCity(name: string, dto: { lat?: number; lon?: number }) {
    try {
      const updated = await this.cityModel.findOneAndUpdate({ city: name.trim() }, dto, { new: true });
      if (!updated) throw new NotFoundException(this.formatResponse('error', 404, 'City not found'));
      return this.formatResponse('success', 200, 'City updated successfully', updated);
    } catch {
      throw new HttpException(this.formatResponse('error', 500, 'Error updating city'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ 5. Delete city
  async deleteCity(name: string) {
    try {
      const deleted = await this.cityModel.findOneAndDelete({ city: name.trim() });
      if (!deleted) throw new NotFoundException(this.formatResponse('error', 404, 'City not found'));
      return this.formatResponse('success', 200, `City '${name}' deleted successfully`);
    } catch {
      throw new HttpException(this.formatResponse('error', 500, 'Error deleting city'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ Helper: Fetch weather from OpenWeather
  private async fetchWeather(lat: number, lon: number) {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
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
      throw new HttpException(this.formatResponse('error', 502, 'Error fetching weather data from API'), HttpStatus.BAD_GATEWAY);
    }
  }
}
