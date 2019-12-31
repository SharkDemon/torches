
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');

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
        getFileFromUser();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

// triggers the operating system's Open File dialog box
const getFileFromUser = () => {

    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
    }).then( (data) => {
        // pull the first file from the array
        const file = data.filePaths[0];
        // read the file, convert resulting buffer to a string
        const content = fs.readFileSync(file).toString();
        console.log(content);
    } );
};
