
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { serialize, unserialize } from '../utils';

export default class FileStore {
  constructor(indexing, dbPath) {
    this.indexing = indexing;
    this.dbPath = dbPath;
  }
  init() {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath);
    }
  }
  async reset() {
    await new Promise(accept => rimraf(this.dbPath, accept));
    this.init();
  }
  async saveBlockInfo(blockInfo) {
    const filePath = `${this.dbPath}/blockInfo.json`;
    fs.writeFileSync(filePath, JSON.stringify(blockInfo));
  }
  async getBlockInfo() {
    const filePath = path.resolve(this.dbPath, 'blockInfo.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath).toString());
  }
  put(events) {
    for (let i = 0; events.length > i; i += 1) {
      const event = events[i];
      const config = this.indexing.events[event.event];
      if (config && config.keys) {
        config.keys.forEach((key) => {
          const indexKey = `${event.event}-${key}-${event.args[key]}`;
          const filePath = `${this.dbPath}/${indexKey}.jsons`;
          const data = JSON.stringify(serialize(event));
          fs.appendFileSync(filePath, `${data}\n`);
        });
      }
    }
  }
  get(eventType, indexId, value) {
    const indexKey = `${eventType}-${indexId}-${value}`;
    const filePath = `${this.dbPath}/${indexKey}.jsons`;
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return fs.readFileSync(filePath)
      .toString().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .map(e => unserialize(e));
  }
}
