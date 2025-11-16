// Quick script to verify IPC setup
const fs = require('fs');
const path = require('path');

console.log('Checking IPC setup...');
console.log('');

// Check if main.js has the IPC handler
const mainJs = fs.readFileSync('src/main/main.js', 'utf8');
if (mainJs.includes("ipcMain.handle('start-voice-listening'")) {
    console.log('✅ IPC handler found in main.js');
} else {
    console.log('❌ IPC handler NOT found in main.js');
}

// Check if preload.js exposes the API
const preloadJs = fs.readFileSync('src/main/preload.js', 'utf8');
if (preloadJs.includes("startListening: () => ipcRenderer.invoke('start-voice-listening')")) {
    console.log('✅ startListening API found in preload.js');
} else {
    console.log('❌ startListening API NOT found in preload.js');
}

// Check if rhea.js calls the IPC
const rheaJs = fs.readFileSync('src/renderer/scripts/rhea.js', 'utf8');
if (rheaJs.includes('window.dawrv.voice.startListening()')) {
    console.log('✅ startListening() call found in rhea.js');
} else {
    console.log('❌ startListening() call NOT found in rhea.js');
}

console.log('');
console.log('IPC setup check complete.');
