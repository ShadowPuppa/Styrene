#!/usr/bin/env node
const { exec } = require('child_process');

console.log('Pushing database schema to PostgreSQL...');
exec('npx drizzle-kit push:pg --schema "./shared/schema.ts"', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`${stdout}`);
  console.log('Database schema successfully pushed!');
});