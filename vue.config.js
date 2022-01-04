module.exports = {
    configureWebpack: {
        devtool: 'source-map'
    },
    pluginOptions: {
      electronBuilder: {
        nodeIntegration: true,
        builderOptions: {
          // options placed here will be merged with default configuration and passed to electron-builder
        }
      }
    }
  }
