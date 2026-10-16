import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerRequest } from './customer-request.entity';
import { ClassificationCategory } from './classification-provider';

@Entity({ name: 'classification_history' })
export class ClassificationRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CustomerRequest, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'request_id' })
  request!: CustomerRequest | null;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId!: string | null;

  /** Snapshot of the classified text; classify can run without a stored request. */
  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 32 })
  category!: ClassificationCategory;

  @Column({ type: 'float' })
  confidence!: number;

  @Column({ type: 'varchar', length: 64 })
  provider!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
