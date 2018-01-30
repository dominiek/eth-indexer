
import Eth from 'ethjs';
import EthQuery from 'ethjs-query';
import EthAbi from 'ethjs-abi';
import Web3 from 'web3';
import logger from './logger';

const sleep = timeout => new Promise(accept => setTimeout(() => accept(), timeout));

export default class Ethereum {
  constructor(abi, contractAddress, readProviderUrl = 'http://127.0.0.1:8545') {
    this.readProviderUrl = readProviderUrl;
    this.contractAddress = contractAddress;
    this.readEth = new Eth(new Eth.HttpProvider(readProviderUrl));
    this.readContract = this.readEth.contract(abi).at(contractAddress);
    this.readEthQuery = new EthQuery(new Eth.HttpProvider(readProviderUrl));
    this.readWeb3 = new Web3(new Web3.providers.HttpProvider(readProviderUrl));
    const EtherdeltaContract = this.readWeb3.eth.contract(abi);
    this.readWeb3Contract = EtherdeltaContract.at(contractAddress);
    this.logDecoder = EthAbi.logDecoder(abi);
  }
  async getEventsForBlock(blockNumber, numRetries = 0) {
    const params = {
      address: this.contractAddress,
      fromBlock: blockNumber,
      toBlock: blockNumber,
    };
    try {
      await sleep(1); // To prevent race condition in XHR2 lib below
      const result = await this.readEthQuery.getLogs(params);
      const decodedResults = this.logDecoder(result);
      for (let i = 0; result.length > i; i += 1) {
        result[i].args = Object.assign({}, decodedResults[i]);
        result[i].event = result[i].args._eventName;
      }
      return result;
    } catch (error) {
      if (numRetries < 100) {
        logger.log('warn', `Warning, error happened while contacting RPC, retrying (attempt ${numRetries})`);
        await sleep(1200);
        return this.getEventsForBlock(blockNumber, numRetries + 1);
      }
      throw error;
    }
  }
  readNewEvents(fromBlock, fn) {
    const options = { fromBlock, toBlock: 'latest' };
    const filter = this.readWeb3Contract.allEvents({}, options);
    filter.watch((error, event) => {
      // console.log('watch', error, event);
      if (error) {
        logger.log('warn', `Got error while reading realtime events from contract: ${error.message}`);
      } else {
        fn(event).then(() => {});
      }
    });
  }
  async clientStatus() {
    const syncing = await this.readEthQuery.syncing();
    const blockNumber = await this.readEthQuery.blockNumber();
    return {
      syncing,
      blockNumber,
    };
  }
  async readAllEvents(fromBlock, toBlock, { skipBlocks }, fn) {
    const jobs = [];
    if (skipBlocks) {
      logger.log('info', `Skipping blocks ${skipBlocks.min} to ${skipBlocks.max} (already synced)`);
    }
    for (let blockNumber = fromBlock; toBlock > blockNumber; blockNumber += 1) {
      if (skipBlocks && blockNumber >= skipBlocks.min && blockNumber <= skipBlocks.max) {
        // logger.log('info', `Skipping block ${blockNumber}, already synced`);
        // Nothing
      } else {
        jobs.push({
          total: toBlock - fromBlock,
          current: blockNumber - fromBlock,
          blockNumber,
        });
      }
    }
    for (const job of jobs) {
      const result = await this.getEventsForBlock(job.blockNumber);
      await fn(result, job);
    }
  }
}
