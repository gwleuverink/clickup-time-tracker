module.exports = {
    configureWebpack: {
        devtool: 'source-map'
    },
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            productName: 'Time Tracker',
            artifactName: 'time-tracker-${version}-${os}-${arch}.${ext}',
            builderOptions: {
                publish: [
                    { provider: 'github', private: false, releaseType: 'release' },
                ],

                mac: {
                    hardenedRuntime: true,
                    category: "public.app-category.productivity",
                    target: [ "dmg" ],
                },

                linux: {
                    target: ["AppImage"],
                    executableName: 'Time Tracker',
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
