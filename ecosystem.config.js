module.exports = {
  apps: [
    {
      name: 'api',
      script: '/usr/lib/node_modules/ts-node/dist/bin.js', // Caminho completo para o ts-node
      args: './src/index.ts', // Adicione esta linha
      watch: true,
      ignore_watch: ['node_modules', 'logs'],
        env: {
        NODE_ENV: 'production',
        PORT: 3023, // Substitua pela porta do seu aplicativo
      },
    },
  ],
};
