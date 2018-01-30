
export default class MemoryStore {
  constructor(indexing) {
    this.indexing = indexing;
  }
  init() {
    this.db = {};
  }
  async reset() {
    this.db = {};
  }
  async put(events) {
    events.forEach((event) => {
      const eventType = event.event;
      const config = this.indexing.events[eventType];
      if (config && config.keys) {
        config.keys.forEach((key) => {
          const indexKey = `${eventType}-${key}-${event.args[key]}`;
          if (!this.db[indexKey]) {
            this.db[indexKey] = [];
          }
          this.db[indexKey].push(event);
        });
      }
    });
  }
  async get(eventType, indexId, value) {
    const indexKey = `${eventType}-${indexId}-${value}`;
    return this.db[indexKey];
  }
}
