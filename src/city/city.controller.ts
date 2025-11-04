import { Controller, Post, Get, Param, Body, Patch, Delete } from '@nestjs/common';
import { CityService } from './city.service';

@Controller('city')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  // POST /city
  @Post()
  create(@Body() body: { city: string; lat: number; lon: number }) {
    return this.cityService.createCity(body);
  }

  // GET /city
  @Get()
  getAll() {
    return this.cityService.getAllCities();
  }

  // GET /city/weather/:name
  @Get('weather/:name')
  getWeather(@Param('name') name: string) {
    return this.cityService.getCityWeather(name);
  }

  // PATCH /city/:name
  @Patch(':name')
  update(@Param('name') name: string, @Body() body: { lat?: number; lon?: number }) {
    return this.cityService.updateCity(name, body);
  }

  // DELETE /city/:name
  @Delete(':name')
  delete(@Param('name') name: string) {
    return this.cityService.deleteCity(name);
  }
}
