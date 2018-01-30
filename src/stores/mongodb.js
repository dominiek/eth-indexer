
import { promisify } from 'util';
import { MongoClient } from 'mongodb';
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

const mongodbInsertMany = (collection, events) => new Promise((accept, reject) => {
  collection.insertMany(events, (err) => {
    if (err) return reject(err);
    return accept();
  });
});

export default class MongodbStore {
  constructor(indexing, mongodbUrl) {
    this.indexing = indexing;
    this.mongodbUrl = mongodbUrl;
  }
  async init() {
    if (!this.db) {
      const mongoConnect = promisify(MongoClient.connect).bind(MongoClient);
      this.client = await mongoConnect(this.mongodbUrl);
      const mongoPath = this.mongodbUrl.split('/');
      this.db = this.client.db(mongoPath.slice(-1)[0]);
    }
  }
  close() {
    if (this.client) {
      this.client.close();
    }
  }
  async reset() {
    if (!this.db) {
      await this.init();
    }
    const promises = Object.keys(this.indexing.events).map((eventType) => {
      const collection = this.db.collection(eventType);
      const remove = promisify(collection.remove).bind(collection);
      return remove({});
    });
    await Promise.all(promises);
  }
  async put(events) {
    const byCollection = {};
    for (let i = 0; events.length > i; i += 1) {
      if (!byCollection[events[i].event]) byCollection[events[i].event] = [];
      byCollection[events[i].event].push(events[i]);
    }
    for (const eventType of Object.keys(byCollection)) {
      const collection = this.db.collection(eventType);
      const serializedEvents = byCollection[eventType].map(event => serialize(event));
      await mongodbInsertMany(collection, serializedEvents);
    }
  }
  async get(eventType, indexId, value) {
    const collection = this.db.collection(eventType);
    const query = {};
    query[`args.${indexId}`] = value;
    return new Promise((accept, reject) => {
      collection.find(query).toArray((err, result) => {
        if (err) return reject(err);
        return accept(result.map(item => unserialize(item)));
      });
    });
  }
}
