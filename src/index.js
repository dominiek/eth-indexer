
import logger from './logger';
import Ethereum from './ethereum';

import memoryStore from './stores/memory';
import fileStore from './stores/file';
import redisStore from './stores/redis';
import mongodbStore from './stores/mongodb';
import elasticsearchStore from './stores/elasticsearch';
import levelStore from './stores/level';
import { serialize, unserialize } from './utils';
import BigNumber from 'bignumber.js';

export const stores = {
  memory: memoryStore,
  file: fileStore,
  redis: redisStore,
  mongodb: mongodbStore,
  elasticsearch: elasticsearchStore,
  level: levelStore,
};

export const utils = {
  serialize, unserialize,
};

const waitForBlockchainSync = client => new Promise((accept) => {
  let i = 0;
  const getAndCheckStatus = (callback) => {
    client.clientStatus().then((status) => {
      if ((i % 10) === 0) {
        logger.log('info', `Waiting for Ethereum client to sync (block ${status.syncing.currentBlock}/${status.syncing.highestBlock})`);
      }
      if (status.syncing) {
        setTimeout(() => getAndCheckStatus(callback), 1000);
      } else {
        callback();
      }
      i += 1;
    });
  };
  getAndCheckStatus(() => accept());
});

export class Indexer {
  constructor(
    store,
    abi, contractAddress, readProviderUrl = 'http://127.0.0.1:8545',
  ) {
    this.store = store;
    this.store.init();
    this.blockchain = new Ethereum(abi, contractAddress, readProviderUrl);
  }
  async syncAll({ batchSize, fromBlock }) {
    const clientStatus = await this.blockchain.clientStatus();
    const { syncing, blockNumber } = clientStatus;
    const toBlock = blockNumber;
    logger.log('info', `Current status of Ethereum client: syncing=${JSON.stringify(syncing)}, blockNumber=${blockNumber}`);
    if (syncing) {
      await waitForBlockchainSync(this.blockchain);
    }
    console.log(`Syncing contract ${this.blockchain.contractAddress} from ${this.blockchain.readProviderUrl} (blocks ${fromBlock} to ${toBlock})`);

    // Track performance
    let eventsCount = 0;
    let blocksCount = 0;
    let previousEventsCount = 0;
    let previousBlocksCount = 0;
    let blocksAverages = [];
    let eventsAverages = [];
    setInterval(() => {
      if (previousEventsCount > 0 && blocksCount <= toBlock) {
        const eventsPerSecond = eventsCount - previousEventsCount;
        const blocksPerSecond = blocksCount - previousBlocksCount;
        eventsAverages.push(eventsPerSecond);
        blocksAverages.push(blocksPerSecond);
        const progress = Math.round((100 * (blocksCount - fromBlock)) / (toBlock - fromBlock));
        const stats = `events=${eventsPerSecond}/s, blocks=${blocksPerSecond}/s (blockNumber=${blocksCount}, totalEvents=${eventsCount}, progress=${progress}%`;
        logger.log('info', `Indexing Ethereum events (${stats})`);
        if (blocksAverages.length >= 20) {
          const blocksAverage = blocksAverages
            .reduce((total, num) => total + num, 0) / blocksAverages.length;
          const eventsAverage = eventsAverages
            .reduce((total, num) => total + num, 0) / eventsAverages.length;
          logger.log('info', `Averages: events=${eventsAverage}/s, blocks=${blocksAverage}/s`);
          blocksAverages = [];
          eventsAverages = [];
        }
      }
      previousEventsCount = eventsCount;
      previousBlocksCount = blocksCount;
    }, 1000);

    let skipBlocks = null;
    if (this.store.getBlockInfo) {
      const blockInfo = await this.store.getBlockInfo();
      if (blockInfo && blockInfo.blockNumber) {
        skipBlocks = { min: fromBlock, max: blockInfo.blockNumber };
      }
    }
    this.blockchain.readNewEvents(toBlock, async (event) => {
      logger.log('info', `Processing real-time Ethereum ${event.event} event`);
      const normalizeEvent = event;
      normalizeEvent.blockNumber = new BigNumber(normalizeEvent.blockNumber);
      normalizeEvent.transactionIndex = new BigNumber(normalizeEvent.transactionIndex);
      normalizeEvent.logIndex = new BigNumber(normalizeEvent.logIndex);
      this.store.put([normalizeEvent]);
    });
    this.blockchain.readAllEvents(
      fromBlock,
      toBlock,
      { skipBlocks, batchSize },
      async (events, status) => {
        if (events.length > 0) {
          await this.store.put(events);
        } else {
          // nothing
        }
        eventsCount += events.length;
        blocksCount = status.blockNumber;
        if (this.store.saveBlockInfo) {
          this.store.saveBlockInfo({ blockNumber: status.blockNumber }).then(() => {});
        }
      },
    );
  }
}
