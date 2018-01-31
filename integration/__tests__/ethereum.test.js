

import EtherdeltaABI from '../../examples/etherdelta/abi.json';
import Erc20Tokens from './../fixtures/erc20tokens.json';
import Ethereum from '../../src/ethereum';

test('Should get status of client', async () => {
  const ethereum = new Ethereum(EtherdeltaABI, '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819');
  const status = await ethereum.clientStatus();
  const { syncing, blockNumber } = status;
  expect(syncing).toBe(false);
  expect(blockNumber > 40000).toBe(true);
});

test('Should read all events from blockchain', async () => {
  const ethereum = new Ethereum(EtherdeltaABI, '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819');
  let events = [];
  await new Promise((accept) => {
    ethereum.readAllEvents(4744470, 4744471, {}, async (result) => {
      events = result;
      accept();
    });
  });
  expect(events.length).toBe(20);
});

test('Should read balances for a given user by calling contract method', async () => {
  jest.setTimeout(200 * 1000);
  const ethereum = new Ethereum(EtherdeltaABI, '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819');
  const ts = Date.now();
  const balances = {};
  for (const token of Erc20Tokens) {
    const balance = await ethereum.readContract.balanceOf(token.addr, '0x13d8d38421eb02973f3f923a71a27917bd483190');
    balances[token.name] = balance[0].toString();
  }
  console.log(`Getting balances for ERC20 tokens took ${Date.now() - ts}ms`);
  expect(balances.FUCK).toBe('40926686');
});

test.skip('Should manually read balances for a given user', async () => {
  jest.setTimeout(200 * 1000);
  const ethereum = new Ethereum(EtherdeltaABI, '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819');
  const options = { fromBlock: 3154100, toBlock: 'latest' };
  const filter = ethereum.readWeb3Contract.Deposit({ user: '0x13d8d38421eb02973f3f923a71a27917bd483190' }, options);
  filter.watch((error, event) => {
    console.log('watch', error, event);
  });
  // console.log(`Getting balances for ERC20 tokens took ${Date.now() - ts}ms`);
  // expect(balances.FUCK).toBe('40926686');
});
