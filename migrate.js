#!/usr/bin/env node
import { exec } from 'child_process';

console.log('Pushing database schema to PostgreSQL...');
exec('npx drizzle-kit push', (error, stdout, stderr) => {
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