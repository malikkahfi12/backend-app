import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/app.config';
import { gzipSync, gunzipSync } from 'zlib';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly compressionThreshold: number;

  constructor(configService: ConfigService<AppConfig, true>) {
    const url = configService.get('redis.url', { infer: true });
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.compressionThreshold = 1024 * 1024;

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.getBuffer(key);
      if (!raw) return null;

      const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

      if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
        const decompressed = gunzipSync(data);
        return JSON.parse(decompressed.toString('utf-8')) as T;
      }

      return JSON.parse(data.toString('utf-8')) as T;
    } catch (error) {
      this.logger.warn(
        `Redis GET failed for key '${key}': ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<boolean> {
    try {
      const data = JSON.stringify(value);

      if (Buffer.byteLength(data) > this.compressionThreshold) {
        const compressed = gzipSync(data);
        if (ttlSeconds) {
          await this.client.set(key, compressed, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, compressed);
        }
      } else {
        if (ttlSeconds) {
          await this.client.set(key, data, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, data);
        }
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Redis SET failed for key '${key}': ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.warn(
        `Redis DEL failed for key '${key}': ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.warn(
        `Redis INCR failed for key '${key}': ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return -1;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
