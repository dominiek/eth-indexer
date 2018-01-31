
import BigNumber from 'bignumber.js';

export const serialize = (event) => {
  const doc = Object.assign({}, event);
  for (const key in event.args) {
    if (event.args[key] && event.args[key].isBigNumber) {
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
