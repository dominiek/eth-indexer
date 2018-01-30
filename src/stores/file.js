
import fs from 'fs';
import rimraf from 'rimraf';
import BigNumber from 'bignumber.js';

const serialize = (event) => {
  const doc = Object.assign({}, event);
  for (const key in event.args) {
    if (event.args[key] instanceof BigNumber) {
      doc.args[key] = {
        type: 'BigNumber',
        value: event.args[key].toString(),
      };
    }
  }
  return doc;
};

const unserialize = (doc) => {
  const event = Object.assign({}, doc);
  for (const key in doc.args) {
    if (doc.args[key] && doc.args[key].type === 'BigNumber') {
      event.args[key] = new BigNumber(doc.args[key].value);
    }
  }
  return event;
};

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
  put(events) {
    for (let i = 0; events.length > i; i += 1) {
      const event = events[i];
      const config = this.indexing.events[event.event];
      if (config && config.keys) {
        config.keys.forEach((key) => {
          const indexKey = `${event.event}-${key}-${event.args[key]}`;
          const path = `${this.dbPath}/${indexKey}.jsons`;
          const data = JSON.stringify(serialize(event));
          fs.appendFileSync(path, `${data}\n`);
        });
      }
    }
  }
  get(eventType, indexId, value) {
    const indexKey = `${eventType}-${indexId}-${value}`;
    const path = `${this.dbPath}/${indexKey}.jsons`;
    return fs.readFileSync(path)
      .toString().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .map(e => unserialize(e));
  }
}
