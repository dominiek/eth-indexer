
import BigNumber from 'bignumber.js';

const isBigNumber = value =>
  (value.isBigNumber === true) ||
  (value instanceof BigNumber) ||
  (value.lte && value.toNumber);

const serializeBigNumber = (value) => {
  if (isBigNumber(value)) {
    return {
      type: 'BigNumber',
      value: value.toString(),
    };
  }
  return value;
};

const unserializeBigNumber = (value) => {
  if (value && value.type === 'BigNumber') {
    return new BigNumber(value.value);
  }
  return value;
};

export const serialize = (event) => {
  const doc = Object.assign({}, event);
  for (const key in event) {
    if (event[key]) {
      doc[key] = serializeBigNumber(event[key]);
    }
  }
  for (const key in event.args) {
    if (event.args[key]) {
      doc.args[key] = serializeBigNumber(event.args[key]);
    }
  }
  return doc;
};

export const unserialize = (doc) => {
  const event = Object.assign({}, doc);
  for (const key in doc) {
    if (doc[key]) {
      event[key] = unserializeBigNumber(doc[key]);
    }
  }
  for (const key in doc.args) {
    if (doc.args[key]) {
      event.args[key] = unserializeBigNumber(doc.args[key]);
    }
  }
  return event;
};
