import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket = 'beer-images';

  constructor(private readonly config: ConfigService) {
    // Service-role key is used server-side to bypass Supabase RLS
    this.supabase = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  // Uploads a file buffer to Supabase Storage and returns the public URL
  async uploadImage(file: Express.Multer.File): Promise<string> {
    const filename = `${uuidv4()}${extname(file.originalname)}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Image upload failed: ${error.message}`);
      throw new InternalServerErrorException(
        `Image upload failed: ${error.message}`,
      );
    }

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filename);

    this.logger.log(`Image uploaded [file=${filename}]`);
    return data.publicUrl;
  }
}
