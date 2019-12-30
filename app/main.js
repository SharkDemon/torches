
const { app, BrowserWindow } = require('electron');

let mainWindow = null;

app.on('ready', () => {

    mainWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('app/index.html');

    // add a single event listener to the window's ready-to-show event
    mainWindow.once('ready-to-show', () => {
        // show the window when the DOM is ready
        mainWindow.show();
        //mainWindow.webContents.openDevTools();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});
