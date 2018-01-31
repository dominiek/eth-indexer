
import BigNumber from 'bignumber.js';
import ElasticsearchStore from '../elasticsearch';

let store;
beforeAll(() => {
  const indexing = {
    events: {
      Withdraw: {
        keys: ['user'],
      },
      Deposit: {
        keys: ['user'],
      },
      Trade: {
        keys: ['tokenGive', 'tokenGet', 'get', 'give'],
      },
    },
  };
  store = new ElasticsearchStore(indexing);
});

afterAll(() => {
  store.close();
});

test.skip('Should index events according to indexing settings', async () => {
  const depositEvent = {
    transactionHash: '1',
    args: {
      user: '0xD0M',
      amount: new BigNumber('1000'),
    },
    event: 'Deposit',
  };
  const depositEvent2 = {
    transactionHash: '2',
    args: {
      user: '0xD0M',
      amount: new BigNumber('1000'),
    },
    event: 'Deposit',
  };
  const depositEvent3 = {
    transactionHash: '3',
    args: {
      user: '0xD0M2',
      amount: new BigNumber('1000'),
    },
    event: 'Deposit',
  };
  const withdrawEvent = {
    transactionHash: '4',
    args: {
      user: '0xD0M',
      amount: new BigNumber('100'),
    },
    event: 'Withdraw',
  };
  await store.reset();
  await store.put([depositEvent, depositEvent2, depositEvent3, withdrawEvent]);
  await store.refresh('Deposit');
  await store.refresh('Withdraw');
  const depositEvents = await store.get('Deposit', 'user', '0xD0M');
  expect(depositEvents.length).toBe(2);
  expect(depositEvents[0].args.amount.toString()).toBe('1000');
  const withdrawEvents = await store.get('Withdraw', 'user', '0xD0M');
  expect(withdrawEvents.length).toBe(1);
});
