const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'node_modules', 'concurrently'))) {
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
}

if (!fs.existsSync(path.join(__dirname, 'frontend', 'node_modules'))) {
  console.log('Installing frontend dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, 'frontend') });
}

const venvPath = path.join(__dirname, 'backend', 'venv');
const venvPython = process.platform === 'win32'
  ? path.join(venvPath, 'Scripts', 'python.exe')
  : path.join(venvPath, 'bin', 'python');

if (!fs.existsSync(venvPython)) {
  console.log('Setting up backend virtual environment...');
  try {
    execSync('python -m venv venv', { stdio: 'inherit', cwd: path.join(__dirname, 'backend') });
  } catch (err) {
    execSync('py -m venv venv', { stdio: 'inherit', cwd: path.join(__dirname, 'backend') });
  }
  
  console.log('Installing backend requirements...');
  execSync('"' + venvPython + '"' + ' -m pip install -r requirements.txt', { stdio: 'inherit', cwd: path.join(__dirname, 'backend') });
}

console.log('Starting MedSign AI (Backend & Frontend)...');
const concurrently = require('concurrently');

concurrently([
  {
    command: process.platform === 'win32'
      ? 'venv\\\\Scripts\\\\python.exe -m app.main'
      : 'venv/bin/python -m app.main',
    name: 'BACKEND',
    prefixColor: 'blue',
    cwd: path.join(__dirname, 'backend')
  },
  {
    command: 'npm run dev',
    name: 'FRONTEND',
    prefixColor: 'green',
    cwd: path.join(__dirname, 'frontend')
  }
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 0,
}).result.then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);