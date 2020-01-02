'use strict';

const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const windows = new Set();

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    // checks to see if the app is running on MacOS
    if (process.platform === 'darwin') {
        // if it is, returns false to prevent the default action
        return false;
    }
    // if it isn't, quit the app
    app.quit();
});

// activate event fires only on MacOS
app.on('activate', (event, hasVisibleWindows) => {
    // if there are no visible windows when the user activates the app, create one
    if (!hasVisibleWindows) {
        createWindow();
    }
});

// triggers the operating system's Open File dialog box
const getFileFromUser = exports.getFileFromUser = (targetWindow) => {
    dialog.showOpenDialog(targetWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
    }).then( (data) => {
        if (!data.canceled) {
            // pull the first file from the array
            openFile(targetWindow, data.filePaths[0]);
        }
    });
};

const openFile = exports.openFile = (targetWindow, file) => {
    // read the file, convert resulting buffer to a string
    const content = fs.readFileSync(file).toString();
    // send the file name and its content to the renderer process over
    // the file-opened channel
    targetWindow.webContents.send('file-opened', file, content);
};

const createWindow = exports.createWindow = () => {
    let x, y;
    const currentWindow = BrowserWindow.getFocusedWindow();
    // if there's a currently active window from the previous step, sets the
    // coords of the next window down/right from currently active window
    if (currentWindow) {
        const [ currentWindowX, currentWindowY ] = currentWindow.getPosition();
        x = currentWindowX + 10;
        y = currentWindowY + 10;
    }

    let newWindow = new BrowserWindow({ 
        x, y,
        show: false,
        webPreferences: {
            // need to figure out security settings to finally get this to false
            nodeIntegration: true
        }
    });
    newWindow.loadURL( path.join('file://', __dirname, 'index.html') );
    newWindow.once('ready-to-show', () => {
        newWindow.show();
    });
    newWindow.on('closed', () => {
        windows.delete(newWindow);
        newWindow = null;
    });
    windows.add(newWindow);
    return newWindow;
};
