
const { app, BrowserWindow } = require('electron');

let mainWindow = null;

app.on('ready', () => {
    mainWindow = new BrowserWindow();
    mainWindow.loadFile('index.html');
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});
