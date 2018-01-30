
import levelup from 'levelup';
import leveldown from 'leveldown';
import rimraf from 'rimraf';

const indexEventToLevelDb = async (db, key, event) => {
  const indexKey = `${event.event}-${key}-${event.args[key]}`;
  try {
    const result = await db.get(indexKey);
    const resultArray = JSON.parse(result);
    resultArray.push(event);
    await db.put(indexKey, JSON.stringify(resultArray));
  } catch (error) {
    if (error.notFound) {
      await db.put(indexKey, JSON.stringify([event]));
    } else {
      throw error;
    }
  }
};

export default class LevelStore {
  constructor(indexing, dbPath) {
    this.indexing = indexing;
    this.dbPath = dbPath;
  }
  init() {
    if (!this.db) {
      this.db = levelup(leveldown(this.dbPath));
    }
  }
  async reset() {
    if (this.db) {
      await this.db.close();
    }
    await new Promise(accept => rimraf(this.dbPath, accept));
    this.init();
  }
  async put(events) {
    for (const event of events) {
      const eventType = event.event;
      const config = this.indexing.events[eventType];
      if (config && config.keys) {
        for (const key of config.keys) {
          await indexEventToLevelDb(this.db, key, event);
        }
      }
    }
  }
  async get(eventType, indexId, value) {
    const results = await this.db.get(`${eventType}-${indexId}-${value}`);
    return JSON.parse(results);
  }
}
