'use strict';

const { app, BrowserWindow, dialog, Menu } = require('electron');
const applicationMenu = require('./application-menu');
const fs = require('fs');
const path = require('path');

// collection of active BrowserWindows
const windows = new Set();
// map of active BrowserWindows and the file watchers
const openFiles = new Map();

app.on('ready', () => {
    Menu.setApplicationMenu(applicationMenu);
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

// listens for the open-file event, which provides the path of the externally
// opened file, and then passes that file path to our openFile() function
app.on('will-finish-launching', () => {
    app.on('open-file', (event, file) => {
        const win = createWindow();
        win.once('ready-to-show', () => {
            openFile(win, file);
        });
    });
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
        if (data.canceled) return;
        // pull the first file from the array
        openFile(targetWindow, data.filePaths[0]);
    }).catch( (e) => console.error(e) );
};

const openFile = exports.openFile = (targetWindow, file) => {
    // read the file, convert resulting buffer to a string
    const content = fs.readFileSync(file).toString();
    // append the file to the operating system's list of recently opened docs
    app.addRecentDocument(file);
    // BrowserWindow instances have a method that allows you to set the
    // represented file (for MacOS)
    targetWindow.setRepresentedFilename(file);
    // send the file name and its content to the renderer process over
    // the file-opened channel
    targetWindow.webContents.send('file-opened', file, content);
    startWatchingFile(targetWindow, file);
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
    newWindow.on('close', (event) => {
        if (newWindow.isDocumentEdited()) {
            event.preventDefault();
            dialog.showMessageBox(newWindow, {
                type: 'warning',
                title: 'Quit with Unsaved Changes?',
                message: 'Your changes will be lost permanently if you do not save.',
                buttons: [ 'Quit Anyway', 'Cancel' ],
                defaultId: 0,
                cancelId: 1
            }).then( (data) => {
                // if the user selects Quit Anyway, force window to close
                if (data.response === 0) newWindow.destroy();
            });
        }
    });
    newWindow.on('closed', () => {
        windows.delete(newWindow);
        // when the window is closed, stop watching the file associated with the window
        stopWatchingFile(newWindow);
        newWindow = null;
    });
    windows.add(newWindow);
    return newWindow;
};

const saveMarkdown = exports.saveMarkdown = (targetWindow, file, content) => {
    if (!file) {
        dialog.showSaveDialog(targetWindow, {
            title: 'Save Markdown',
            // defaults to the user's documents directory, as defined by the OS
            defaultPath: app.getPath('documents'),
            filters: [
                { name: 'Markdown Files', extensions: ['md', 'markdown'] }
            ]
        }).then( (data) => {
            if (data.canceled) return;
            file = data.filePaths[0];
        });
    }
    // writes the contents of the buffer to the file system
    fs.writeFileSync(file, content);
    openFile(targetWindow, file);
};

const saveHtml = exports.saveHtml = (targetWindow, content) => {
    dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        // defaults to the user's documents directory, as defined by the OS
        defaultPath: app.getPath('documents'),
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] }
        ]
    }).then( (data) => {
        if (data.canceled) return;
        fs.writeFileSync(data.filePath, content);
    });
};

// 6.28
const startWatchingFile = (targetWindow, file) => {
    // close any existing file watcher
    stopWatchingFile(targetWindow);
    const watcher = fs.watchFile(file, (event) => {
        // if the watcher fires a change event, re-read the file
        if (event === 'change') {
            const content = fs.readFileSync(file).toString();
            // send message to the renderer process with the content
            // of the file
            targetWindow.webContents.send('file-changed', file, content);
        }
    });
    // track the file watcher so we can stop it later
    openFiles.set(targetWindow, watcher);
};

const stopWatchingFile = (targetWindow) => {
    if (openFiles.has(targetWindow)) {
        // stop the file watcher
        openFiles.get(targetWindow).stop();
        // delete the file watcher from the map of open windows
        openFiles.delete(targetWindow);
    }
};
