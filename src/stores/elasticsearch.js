
import elasticsearch from 'elasticsearch';
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

const createElasticsearchIndex = async (client, eventType, config) => {
  const index = eventType.toLowerCase();
  const mappings = {};
  const argsProperties = {};
  if (config && config.keys) {
    config.keys.forEach((key) => {
      argsProperties[key] = { type: 'keyword' };
    });
  }
  const properties = {
    transactionHash: { type: 'keyword' },
    blockNumber: { type: 'long' },
    args: { properties: argsProperties },
  };
  mappings[index] = { properties };
  await client.indices.create({ index, body: { mappings } });
};

export default class MongodbStore {
  constructor(indexing, elasticsearchHost = 'http://localhost:9200') {
    this.indexing = indexing;
    this.elasticsearchHost = elasticsearchHost;
  }
  async init() {
    if (!this.db) {
      this.client = new elasticsearch.Client({
        host: this.elasticsearchHost,
        log: 'info',
      });
      for (const eventType of Object.keys(this.indexing.events)) {
        const index = eventType.toLowerCase();
        const exists = await this.client.indices.exists({ index });
        if (!exists) {
          await createElasticsearchIndex(this.client, eventType, this.indexing.events[eventType]);
        }
      }
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
    for (const eventType of Object.keys(this.indexing.events)) {
      const index = eventType.toLowerCase();
      const exists = await this.client.indices.exists({ index });
      if (exists) {
        await this.client.indices.delete({ index });
      }
      await createElasticsearchIndex(this.client, eventType, this.indexing.events[eventType]);
    }
  }
  async put(events) {
    const byType = {};
    for (let i = 0; events.length > i; i += 1) {
      if (!byType[events[i].event]) byType[events[i].event] = [];
      byType[events[i].event].push(events[i]);
    }
    for (const eventType of Object.keys(byType)) {
      const index = eventType.toLowerCase();
      const serializedEvents = byType[eventType].map(event => serialize(event));
      const bulkOps = [];
      serializedEvents.forEach((body) => {
        bulkOps.push({ index: { _index: index, _type: index, _id: body.transactionHash } });
        bulkOps.push(body);
      });
      await this.client.bulk({ body: bulkOps });
    }
  }
  async refresh(eventType) {
    const index = eventType.toLowerCase();
    await this.client.indices.refresh({ index });
  }
  async get(eventType, indexId, value) {
    const index = eventType.toLowerCase();
    const term = {};
    term[`args.${indexId}`] = { value };
    const body = {
      query: {
        term,
      },
    };
    const response = await this.client.search({ index, body });
    return response.hits.hits.map(doc => unserialize(doc._source));
  }
}
