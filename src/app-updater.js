import { dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'


let updater
autoUpdater.autoDownload = true;

autoUpdater.on('error', (error) => {
    dialog.showMessageBox({
        type: 'error',
        title: 'Something went wrong whilst updating the app',
        message: 'Unable to check for updates',
        buttons: ['Download manually', 'Cancel']
    }).then(result => {
        if(result.response === 0) {
            shell.openExternal('https://github.com/gwleuverink/clickup-time-tracker/releases/latest')
        }
    });

    console.error(error)
})

autoUpdater.on('update-available', () => {

    dialog.showMessageBox({
        type: 'info',
        title: 'Update available',
        message: `
        Looks like there is an update available

        Click below to head over to the downloads page

        Thanks for using Time Tracker! ♥

        If you like this app and want to support future development I would greatly appreciate it if you'd consider sponsoring this project
        `,
        buttons: ['Download update', 'Sponsor the project', 'Cancel']
    }).then(result => {
        updater.enabled = true
        switch(result.response) {
            case 0:
                shell.openExternal('https://github.com/gwleuverink/clickup-time-tracker/releases/latest')
                break;
            case 1:
                shell.openExternal('https://github.com/sponsors/gwleuverink')
                break;
          }
    });
})

autoUpdater.on('update-not-available', () => {
    dialog.showMessageBox({
        title: 'No Updates',
        message: 'Current version is up-to-date.'
    })
    updater.enabled = true
    updater = null
})

// export this to MenuItem click callback
function checkForUpdates(menuItem) {
    updater = menuItem
    updater.enabled = false
    autoUpdater.checkForUpdates()
}

export default {
    checkForUpdates,
    checkForUpdatesAndNotify: autoUpdater.checkForUpdatesAndNotify,
}
