import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Define a TS type (Document)
export type WeatherDocument = Weather & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform(doc, ret: any) {
      ret.id = ret._id.toString(); // ensure string ID
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Weather {
  // City name: required, trimmed, unique to avoid duplicates
  @Prop({ required: true, trim: true, unique: true })
  city: string;

  // Latitude & longitude as numbers
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lon: number;

  @Prop({ type: Object, required: false })
  lastWeather?: any;
}

// Convert class → Mongoose schema
export const WeatherSchema = SchemaFactory.createForClass(Weather);

// Create index to make city unique (case-insensitive)
WeatherSchema.index({ city: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
