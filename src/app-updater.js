import { dialog } from 'electron'
import { autoUpdater } from 'electron-updater'


let updater
autoUpdater.autoDownload = true;

autoUpdater.on('error', (error) => {
    dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString())
})

autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Found Updates',
        message: 'Found updates, do you want update now?',
        buttons: ['Sure', 'No']
    }).then((buttonIndex) => {

        if (buttonIndex === 0) {
            autoUpdater.downloadUpdate()
            updater.enabled = false
        }
        else {
            updater.enabled = true
            updater = false
        }
    })
})

autoUpdater.on('update-not-available', () => {
    dialog.showMessageBox({
        title: 'No Updates',
        message: 'Current version is up-to-date.'
    })
    updater.enabled = true
    updater = null
})

autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
        title: 'Install Updates',
        message: 'Updates downloaded, application will be quit for update...'
    }).then(() => {
        setImmediate(() => autoUpdater.quitAndInstall())
    })
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
