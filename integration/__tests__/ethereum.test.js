

import EtherdeltaABI from '../../examples/etherdelta/abi';
import Ethereum from '../../src/ethereum';

test('Should get status of client', async () => {
  const ethereum = new Ethereum(EtherdeltaABI, '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819')
  const status = await ethereum.clientStatus();
  const { syncing, blockNumber } = status;
  expect(syncing).toBe(false);
  expect(blockNumber > 40000).toBe(true);
});

test('Should read all events from blockchain', async () => {
  const ethereum = new Ethereum(EtherdeltaABI, '0x8d12a197cb00d4747a1fe03395095ce2a5cc6819')
  let events = [];
  await new Promise((accept) => {
    ethereum.readAllEvents(4744470, 4744471, {}, async (result) => {
      events = result;
      accept();
    });
  });
  expect(events.length).toBe(20);
});
