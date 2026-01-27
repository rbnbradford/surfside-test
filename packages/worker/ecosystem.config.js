module.exports = {
  apps: [
    {
      name: 'surfside-test-api',
      script: './dist/index.js',
      instances: 8,
      exec_mode: 'cluster',
      node_args: '--env-file=./env/.env',
    },
  ],
};
