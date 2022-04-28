import { app, shell, Menu } from 'electron'
import updater from '@/app-updater'

// const template = []
const name = app.getName()
const isMac = process.platform === 'darwin'

const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
        label: name,
        submenu: [
            {
                label: 'About ' + name,
                role: 'about'
            },
            {
                label: 'Check for updates',
                click: async (menuItem) => {
                    await updater.checkForUpdates(menuItem)
                }
            },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            {
                label: 'Quit',
                accelerator: 'Command+Q',
                click() { app.quit(); }
            },
        ]
    }] : []),
    // { role: 'viewMenu' }
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    // { role: 'editMenu' }
    {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]
    },
    // { role: 'windowMenu' }
    {
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            ...(isMac ? [
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
            ] : [
                { role: 'close' }
            ])
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Check out the public repository',
                click: async () => await shell.openExternal('https://github.com/gwleuverink/clickup-time-tracker')
            },
            {
                label: 'Sponsor me on GitHub  ❤',
                click: async () => await shell.openExternal('https://github.com/sponsors/gwleuverink')
            }
        ]
    }
]

export async function createMenu() {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
