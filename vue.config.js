module.exports = {
    configureWebpack: {
        devtool: 'source-map'
    },
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            builderOptions: {
                publish: ['github'],
                afterSign: './after-sign-hook.js',
                appId: 'ink.leuver.clickup-time-tracker',

                mac: {
                    hardenedRuntime: true,
                    target: [ "zip", "dmg" ],
                    category: "public.app-category.productivity",
                    entitlements: "./build/entitlements.mac.inherit.plist",
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
