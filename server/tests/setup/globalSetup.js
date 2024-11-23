const { initialize } = require('../../src/config/database');

module.exports = async () => {
  await initialize();
  console.log('Database initialized for testing.');
};
