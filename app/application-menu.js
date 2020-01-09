'use strict';

const { app, dialog, BrowserWindow, Menu, shell } = require('electron');
const mainProcess = require('./main');

const template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New File',
                accelerator: 'CommandOrControl+N',
                click() {
                    mainProcess.createWindow();
                }
            },
            {
                label: 'Open File',
                accelerator: 'CommandOrControl+O',
                click(item, focusedWindow) {
                    if (focusedWindow) {
                        return mainProcess.getFileFromUser(focusedWindow);
                    }
                    const newWindow = mainProcess.createWindow();
                    newWindow.on('show', () => {
                        mainProcess.getFileFromUser(newWindow);
                    });
                }
            },
            {
                label: 'Save File',
                accelerator: 'CommandOrControl+S',
                click(item, focusedWindow) {
                    if (!focusedWindow) {
                        return dialog.showErrorBox('Cannot Save or Export',
                            'There is currently no active document to save or export.');
                    }
                    focusedWindow.webContents.send('save-markdown');
                }
            },
            {
                label: 'Export HTML',
                accelerator: 'Shift+CommandOrControl+S',
                click(item, focusedWindow) {
                    if (!focusedWindow) {
                        return dialog.showErrorBox('Cannot Save or Export',
                            'There is currently no active document to save or export.');
                    }
                    focusedWindow.webContents.send('save-html');
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            {
                label: 'Undo',
                accelerator: 'CommandOrControl+Z',
                role: 'undo'
            },
            {
                label: 'Redo',
                accelerator: 'Shift+CommandOrControl+C',
                role: 'redo'
            },
            {
                type: 'separator'
            },
            {
                label: 'Cut',
                accelerator: 'CommandOrControl+X',
                role: 'cut'
            },
            {
                label: 'Copy',
                accelerator: 'CommandOrControl+C',
                role: 'copy'
            },
            {
                label: 'Paste',
                accelerator: 'CommandOrControl+V',
                role: 'paste'
            },
            {
                label: 'Select All',
                accelerator: 'CommandOrControl+A',
                role: 'selectall'
            }
        ]
    },
    {
        label: 'Window',
        submenu: [
            {
                label: 'Minimize',
                accelerator: 'CommandOrControl+M',
                role: 'minimize'
            },
            {
                label: 'Close',
                accelerator: 'CommandOrControl+W',
                role: 'close'
            }
        ]
    },
    {
        label: 'Help',
        role: 'help',
        submenu: [
            {
                label: 'Visit Website',
                click() { /* TODO */ }
            },
            {
                label: 'Togger Developer Tools',
                click(item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
                }
            }
        ]
    }
];

// 7.3
// ask Node's process global what platform we're running on
// if MacOS, move new menu item to beginning of template array
if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
        label: name,
        submenu: [
            {
                label: `About ${name}`,
                role: 'about',
            },
            {
                type: 'separator'
            },
            {
                label: 'Services',
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                label: `Hide ${name}`,
                accelerator: 'Command+H',
                role: 'hide',
            },
            {
                label: `Hide Others`,
                accelerator: 'Command+Alt+H',
                role: 'hideothers',
            },
            {
                label: `Show All`,
                role: 'unhide',
            },
            {
                type: 'separator'
            },
            {
                label: `Quit ${name}`,
                accelerator: 'Command+Q',
                // there is no built-in role for quitting app; instead add a click method
                // that fires when menu item is clicked or keyboard shortcut used
                click() { app.quit(); }
            }
        ]
    });
}

const windowMenu = template.find(item => item.label === 'Window');
windowMenu.role = 'window';
windowMenu.submenu.push(
    { type: 'separator' },
    {
        label: 'Bring All to Front',
        role: 'front'
    }
);

// build a menu from the template, and export it so it can be used
// in the main process
module.exports = Menu.buildFromTemplate(template);
