const { loadEnv } = require('../src/loadEnv');
const { createApp } = require('../src/createApp');

loadEnv();

const app = createApp();

module.exports = app;
