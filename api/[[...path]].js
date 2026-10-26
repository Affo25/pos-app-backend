const { loadEnv } = require('../src/loadEnv');
const { createApp } = require('../src/createApp');

loadEnv();

module.exports = createApp();
