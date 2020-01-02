'use strict';

const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const windows = new Set();

app.on('ready', () => {
    createWindow();
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
        // pull the first file from the array
        openFile(targetWindow, data.filePaths[0]);
    } );
};

const openFile = exports.openFile = (targetWindow, file) => {
    // read the file, convert resulting buffer to a string
    const content = fs.readFileSync(file).toString();
    // send the file name and its content to the renderer process over
    // the file-opened channel
    targetWindow.webContents.send('file-opened', file, content);
};

const createWindow = exports.createWindow = () => {
    let newWindow = new BrowserWindow({ 
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
