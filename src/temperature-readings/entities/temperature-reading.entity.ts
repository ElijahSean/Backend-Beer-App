import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Beer } from '../../beers/entities/beer.entity';

@Entity('temperature_readings')
export class TemperatureReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Deleting a Beer cascades to remove all its readings
  @ManyToOne(() => Beer, (beer) => beer.temperatureReadings, {
    onDelete: 'CASCADE',
  })
  beer: Beer;

  @Column('float')
  temperature: number;

  @CreateDateColumn()
  recordedAt: Date;
}
