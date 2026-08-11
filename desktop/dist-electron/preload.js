import { contextBridge } from 'electron';
// Expose a minimal API to the renderer process
// This is the secure bridge between Electron main and React
contextBridge.exposeInMainWorld('electron', {
    app: {
        name: 'AI Assistant',
    },
});
