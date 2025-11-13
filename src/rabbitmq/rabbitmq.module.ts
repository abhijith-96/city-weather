import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'RABBITMQ_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const url = configService.get<string>('RABBITMQ_URL');
        const connection = await amqp.connect(url);
        return connection;
      },
      inject: [ConfigService],
    },

    {
      provide: 'RABBITMQ_CHANNEL',
      useFactory: async (connection: amqp.Connection, configService: ConfigService) => {
        const queue = configService.get<string>('RABBITMQ_QUEUE');
        const channel = await connection.createChannel();
        await channel.assertQueue(queue, { durable: true });
        return channel;
      },
      inject: ['RABBITMQ_CONNECTION', ConfigService],
    },
  ],
  exports: ['RABBITMQ_CONNECTION', 'RABBITMQ_CHANNEL'],
})
export class RabbitmqModule {}
