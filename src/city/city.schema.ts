import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// define a TS type (Document)
export type CityDocument = City & Document;

@Schema({
  timestamps: true,
  toJSON: {
    transform(doc, ret: any) { // 👈 add ": any" to ret
      ret.id = ret._id.toString(); // ensure it's a string
      delete ret._id; // now no TS error
      delete ret.__v;
      return ret;
    },
  },
})
export class City {
  // City name: required, trimmed, unique so we don't store duplicates
  @Prop({ required: true, trim: true })
  city: string;

  // Latitude & longitude as numbers
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lon: number;
}

// Convert class → Mongoose schema
export const CitySchema = SchemaFactory.createForClass(City);

// Create index to make city unique (case insensitive)
CitySchema.index({ city: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });