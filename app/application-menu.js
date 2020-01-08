'use strict';

const { app, BrowserWindow, Menu, shell } = require('electron');
const mainProcess = require('./main');

const template = [
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
            }
        ]
    });
}

// build a menu from the template, and export it so it can be used
// in the main process
module.exports = Menu.buildFromTemplate(template);
