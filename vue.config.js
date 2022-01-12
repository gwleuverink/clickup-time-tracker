module.exports = {
    configureWebpack: {
        devtool: 'source-map'
    },
    pluginOptions: {
      electronBuilder: {
        nodeIntegration: true,
        builderOptions: {
            extraResources: ['database.sqlite']
        }
      }
    }
  }
