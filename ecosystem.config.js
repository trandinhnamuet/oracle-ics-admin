module.exports = {
  apps: [
    {
      name: 'oracle-ics-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 2999,
      },
    },
  ],
};
