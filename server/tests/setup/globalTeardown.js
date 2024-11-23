const { closePoolAndExit } = require('../../src/config/database');

module.exports = async () => {
  await closePoolAndExit();
};