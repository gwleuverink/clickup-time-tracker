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
