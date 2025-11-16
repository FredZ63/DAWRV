// Quick test to see if IPC is working
const { app, BrowserWindow, ipcMain } = require('electron');

console.log('Testing IPC handler registration...');

ipcMain.handle('test-ipc', () => {
    console.log('✅ Test IPC handler called');
    return { success: true, message: 'IPC is working' };
});

console.log('IPC handler registered. Start Electron and call: window.dawrv.voice.startListening()');
