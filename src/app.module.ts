import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeersModule } from './beers/beers.module';
import { TemperatureReadingsModule } from './temperature-readings/temperature-readings.module';
import { AuthModule } from './auth/auth.module';

// Root module — wires up database, config, and all feature modules
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Supabase PostgreSQL connection; synchronize: true auto-migrates in dev
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'postgres'),
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    BeersModule,
    TemperatureReadingsModule,
  ],
})
export class AppModule {}
