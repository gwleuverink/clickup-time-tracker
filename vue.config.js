module.exports = {
    configureWebpack: {
        devtool: 'source-map'
    },
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            builderOptions: {
                publish: ['github'],

                mac: {
                    hardenedRuntime: false,
                    category: "public.app-category.productivity",
                    target: [ "zip", "dmg" ],
                },

                linux: {
                    target: ["AppImage"]
                },
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
