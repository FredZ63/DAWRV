const { spawn } = require('child_process');
const path = require('path');

console.log('Testing Python from Node.js...');

// Test 1: Simple Python command
const test1 = spawn('python3', ['-c', 'print("Python works!")']);
test1.stdout.on('data', (data) => console.log('Test 1 stdout:', data.toString()));
test1.stderr.on('data', (data) => console.log('Test 1 stderr:', data.toString()));
test1.on('close', (code) => console.log('Test 1 exit code:', code));

// Test 2: Check if speech_recognition is available
const test2 = spawn('python3', ['-c', 'import speech_recognition; print("speech_recognition OK")']);
test2.stdout.on('data', (data) => console.log('Test 2 stdout:', data.toString()));
test2.stderr.on('data', (data) => console.log('Test 2 stderr:', data.toString()));
test2.on('close', (code) => console.log('Test 2 exit code:', code));

// Test 3: Run the actual script
const scriptPath = path.resolve(__dirname, 'rhea_voice_listener.py');
console.log('Script path:', scriptPath);
const test3 = spawn('python3', [scriptPath]);
test3.stdout.on('data', (data) => console.log('Test 3 stdout:', data.toString()));
test3.stderr.on('data', (data) => console.log('Test 3 stderr:', data.toString()));
test3.on('close', (code, signal) => {
    console.log('Test 3 exit code:', code, 'signal:', signal);
    process.exit(0);
});

setTimeout(() => {
    console.log('Killing test 3...');
    test3.kill();
}, 3000);
