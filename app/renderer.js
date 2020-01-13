'use strict';

const { remote, ipcRenderer, shell } = require('electron');
const { Menu } = remote;
const path = require('path');
const mainProcess = remote.require('./main.js');
const currentWindow = remote.getCurrentWindow();
const marked = require('marked');

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

let filePath = null;
let originalContent = '';

const isDifferentContent = (content) => content !== markdownView.value;

const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = marked(markdown, { sanitize: true });
};

// 8.1
const renderFile = (file, content) => {
    filePath = file;
    originalContent = content;

    markdownView.value = content;
    renderMarkdownToHtml(content);

    // when file path has been sent to renderer process to be displayed,
    // we enable these buttons
    showFileButton.disabled = false;
    openInDefaultButton.disabled = false;

    updateUserInterface(false);
};

const updateUserInterface = (isEdited) => {
    let title = 'Torches';
    if (filePath) {
        title = `${title} - ${path.basename(filePath)}`;
    }
    if (isEdited) {
        title = `${title} (Edited)`;
    }
    currentWindow.setTitle(title);
    currentWindow.setDocumentEdited(isEdited);

    // if the document is unedited, disable Save button
    saveMarkdownButton.disabled = !isEdited;
    // if the document is unedited, disable Revert button
    revertButton.disabled = !isEdited;
};

markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);
    updateUserInterface(currentContent !== originalContent);
});

newFileButton.addEventListener('click', () => {
    mainProcess.createWindow();
});

openFileButton.addEventListener('click', () => {
    mainProcess.getFileFromUser(currentWindow);
});

saveMarkdownButton.addEventListener('click', () => {
    mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
});

revertButton.addEventListener('click', () => {
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
});

saveHtmlButton.addEventListener('click', () => {
    mainProcess.saveHtml(currentWindow, htmlView.innerHTML);
});

// 6.26
ipcRenderer.on('file-opened', (event, file, content) => {
    if (currentWindow.isDocumentEdited() && isDifferentContent(content)) {
        // use remote module to trigger dialog box from main process
        remote.dialog.showMessageBox(currentWindow, {
            type: 'warning',
            title: 'Overwrite Current Unsaved Changes?',
            message: 'Opening a new file in this window will overwrite your unsaved changes.  Open this file anyway?',
            buttons: [ 'Yes', 'Cancel' ],
            defaultId: 0,
            cancelId: 1
        }).then( (data) => {
            // if the user cancels, return early
            if (data.response === 1) return;
        });
    }
    // set the window to its unedited state because user opened a new file
    renderFile(file, content);
});

// 6.27
ipcRenderer.on('file-changed', (event, file, content) => {
    if (!isDifferentContent(content)) return;
    // in this situation, we don't care if the document has been edited; we want
    // to prompt the user regardless
    remote.dialog.showMessageBox(currentWindow, {
        type: 'warning',
        title: 'Overwrite Current Unsaved Changes?',
        message: 'Another application has changed this file.  Load changes?',
        buttons: [ 'Yes', 'Cancel' ],
        defaultId: 0,
        cancelId: 1
    });
    renderFile(file, content);
});

// implement drag and drop
document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

// will always be an array, because multiple file selection is
// supported; our app supports only one file at a time - grab
// the first in the array
const getDraggedFile = (event) => event.dataTransfer.items[0];
// similar to getDraggedFile, but when the user drops the file,
// we have access to the file itself instead of just metadata
const getDroppedFile = (event) => event.dataTransfer.files[0];

// this helper function returns true/false if the file's type is in
// the array of supported file types
const fileTypeIsSupported = (file) => {
    return ['text/plain', 'text/markdown'].includes(file.type)
};

markdownView.addEventListener('dragover', (event) => {
    const file = getDraggedFile(event);
    if (fileTypeIsSupported(file)) {
        // if we support the file type, add CSS class to indicate this is
        // a valid place to drop the file
        markdownView.classList.add('drag-over')
    } else {
        // if we don't support the file type, add CSS class to indicate
        // this file is not accepted
        markdownView.classList.add('drag-error');
    }
});
markdownView.addEventListener('dragleave', (event) => {
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});
markdownView.addEventListener('drop', (event) => {
    const file = getDroppedFile(event);
    if (fileTypeIsSupported(file)) {
        mainProcess.openFile(currentWindow, file.path);
    } else {
        alert('That file type is not supported');
    }
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

ipcRenderer.on('save-markdown', () => {
    mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
});

ipcRenderer.on('save-html', () => {
    mainProcess.saveHtml(currentWindow, htmlView.innerHTML);
});

const markdownContextMenu = Menu.buildFromTemplate([
    { label: 'Open File', click() {
        mainProcess.getFileFromUser(currentWindow);
    } },
    { type: 'separator' },
    { label: 'Cut', role: 'cut' },
    { label: 'Copy', role: 'copy' },
    { label: 'Paste', role: 'paste' },
    { label: 'Select All', role: 'selectall' },
]);

markdownView.addEventListener('contextmenu', () => {
    event.preventDefault();
    markdownContextMenu.popup();
});

const showFile = () => {
    if (!filePath) {
        return alert('This file has not been saved to the filesystem.');
    }
    // trigger OS native file browser to open new window with specified
    // path highlighted
    shell.showItemInFolder(filePath);
};

const openInDefaultApplication = () => {
    if (!filePath) {
        return alert('This file has not been saved to the filesystem.');
    }
    // requests that the file be opened by the OS, using the default
    // application as specified by the user
    shell.openItem(filePath);
};

showFileButton.addEventListener('click', showFile);
openInDefaultButton.addEventListener('click', openInDefaultApplication);

// 8.4
ipcRenderer.on('show-file', showFile);
ipcRenderer.on('open-in-default', openInDefaultApplication);
