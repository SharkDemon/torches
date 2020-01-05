'use strict';

const { remote, ipcRenderer } = require('electron');
const mainProcess = remote.require('./main.js');
const currentWindow = remote.getCurrentWindow();

const path = require('path');
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

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = marked(markdown, { sanitize: true });
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

// 6.25
const renderFile = (file, content) => {
    filePath = file;
    originalContent = content;

    markdownView.value = content;
    renderMarkdownToHtml(content);

    updateUserInterface(false);
};

markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);
    updateUserInterface(currentContent !== originalContent);
});
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
    if (currentWindow.isDocumentEdited()) {
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
        // set the window to its unedited state because user opened a new file
        renderFile(file, content);
    }
    filePath = file;
    originalContent = content;
});

// 6.27
ipcRenderer.on('file-changed', (event, file, content) => {
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
