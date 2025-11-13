
const { spawn } = require('child_process');

console.log('🚀 Starting unified Discord bot and dashboard...');

// Start the Discord bot
const bot = spawn('node', ['index.js'], {
  stdio: 'inherit',
  env: process.env
});

// Start the dashboard
const dashboard = spawn('node', ['dashboard.js'], {
  stdio: 'inherit',
  env: process.env
});

bot.on('error', (error) => {
  console.error('❌ Bot error:', error);
});

dashboard.on('error', (error) => {
  console.error('❌ Dashboard error:', error);
});

bot.on('exit', (code) => {
  console.log(`⚠️  Bot process exited with code ${code}`);
  if (code !== 0) {
    console.log('Restarting bot...');
    process.exit(1);
  }
});

dashboard.on('exit', (code) => {
  console.log(`⚠️  Dashboard process exited with code ${code}`);
  if (code !== 0) {
    console.log('Restarting dashboard...');
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  bot.kill();
  dashboard.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  bot.kill();
  dashboard.kill();
  process.exit(0);
});

console.log('✅ Both services started successfully');
