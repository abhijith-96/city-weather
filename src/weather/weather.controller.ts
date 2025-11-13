import { Controller, Post, Get, Param, Body, Patch, Delete } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  // POST /weather
  @Post()
  create(@Body() body: { city: string; lat: number; lon: number }) {
    return this.weatherService.createWeather(body);
  }

  // GET /weather
  @Get()
  getAll() {
    return this.weatherService.getAllWeather();
  }

  // GET /weather/:name
  @Get(':name')
  getWeather(@Param('name') name: string) {
    return this.weatherService.getWeatherDetails(name);
  }

  // PATCH /weather/:name
  @Patch(':name')
  update(@Param('name') name: string, @Body() body: { lat?: number; lon?: number }) {
    return this.weatherService.updateWeather(name, body);
  }

  // DELETE /weather/:name
  @Delete(':name')
  delete(@Param('name') name: string) {
    return this.weatherService.deleteWeather(name);
  }
}
  
