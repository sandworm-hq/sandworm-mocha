const logWithColor = (message, color) => {
  const prefixedMessage = `[🪱 Sandworm]: ${message}`;
  if (color) {
    // eslint-disable-next-line no-console
    console.log(`${color}%s\x1b[0m`, prefixedMessage);
  } else {
    // eslint-disable-next-line no-console
    console.log(prefixedMessage);
  }
};

const log = (message) => {
  logWithColor(message);
};

const warn = (message) => {
  logWithColor(message, '\x1b[33m');
};

const error = (message) => {
  logWithColor(message, '\x1b[31m');
};

const success = (message) => {
  logWithColor(message, '\x1b[32m');
};

module.exports = {
  log,
  warn,
  error,
  success,
};
