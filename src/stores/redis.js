
import { promisify } from 'util';
import redis from 'redis';

export default class RedisStore {
  constructor(indexing) {
    this.indexing = indexing;
  }
  init() {
    if (!this.db) {
      this.db = redis.createClient();
      this.redisLrange = promisify(this.db.lrange).bind(this.db);
      this.redisFlushdb = promisify(this.db.flushdb).bind(this.db);
      this.redisDel = promisify(this.db.del).bind(this.db);
      this.redisRpush = promisify(this.db.rpush).bind(this.db);
    }
  }
  close() {
    if (this.db) {
      this.db.quit();
    }
  }
  async reset() {
    if (!this.db) {
      this.init();
    }
    await this.redisFlushdb();
  }
  async put(events) {
    for (const event of events) {
      const eventType = event.event;
      const config = this.indexing.events[eventType];
      if (config && config.keys) {
        for (const key of config.keys) {
          const indexKey = `${event.event}-${key}-${event.args[key]}`;
          await this.redisRpush(indexKey, JSON.stringify(event));
        }
      }
    }
  }
  async get(eventType, indexId, value) {
    const results = await this.redisLrange(`${eventType}-${indexId}-${value}`, 0, 1000);
    return results.map(result => JSON.parse(result));
  }
}
