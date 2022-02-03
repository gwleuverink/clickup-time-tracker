module.exports = {
    configureWebpack: {
        devtool: 'source-map'
    },
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            builderOptions: {
                publish: ['github']
            }
        }
    },
    css: {
        loaderOptions: {
            sass: {
                implementation: require('sass'), // This line must in sass option
            },
        },
    }
}
