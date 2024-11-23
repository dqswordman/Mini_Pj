const { createTestData, cleanTestData } = require('./fixtures/init');

beforeAll(async () => {
  await cleanTestData();
  await createTestData();
});

afterAll(async () => {
  await cleanTestData();
});