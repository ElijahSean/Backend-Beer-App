import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TemperatureReading } from '../../temperature-readings/entities/temperature-reading.entity';

@Entity('beers')
export class Beer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column('float')
  minTemp: number;

  @Column('float')
  maxTemp: number;

  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Not loaded by default — join explicitly when needed
  @OneToMany(() => TemperatureReading, (reading) => reading.beer)
  temperatureReadings: TemperatureReading[];
}
