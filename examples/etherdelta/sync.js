
import EtherdeltaABI from './abi';
import LevelStore from '../../src/stores/level';
import { Indexer } from '../../src/index';

const sync = async () => {
  const indexing = {
    events: {
      Withdrawal: {
        keys: ['user'],
      },
      Trade: {
        keys: ['tokenGive', 'tokenGet', 'get', 'give'],
      },
    },
  };
  const store = new LevelStore(indexing, './etherdelta');
  await store.reset();
  const indexer = new Indexer(store, EtherdeltaABI, '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819');
  await indexer.syncAll({
    fromBlock: 4906764,
  });
};

sync().then(() => {}).catch((error) => { console.error('Fatal error', error); });
