
import BigNumber from 'bignumber.js';

const isBigNumber = value =>
  (value && value.isBigNumber === true) ||
  (value && value instanceof BigNumber) ||
  (value && value.lte && value.toNumber);

export const serialize = (event) => {
  const doc = Object.assign({}, event);
  for (const key in event.args) {
    if (isBigNumber(event.args[key])) {
      doc.args[key] = {
        type: 'BigNumber',
        value: event.args[key].toString(),
      };
    }
  }
  return doc;
};

export const unserialize = (doc) => {
  const event = Object.assign({}, doc);
  for (const key in doc.args) {
    if (doc.args[key] && doc.args[key].type === 'BigNumber') {
      event.args[key] = new BigNumber(doc.args[key].value);
    }
  }
  return event;
};
