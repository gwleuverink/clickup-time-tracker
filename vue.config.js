module.exports = {
    configureWebpack: {
        devtool: 'source-map'
    },
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            preload: 'src/preload.js',
            productName: 'ClickUp Time Tracker',
            artifactName: 'time-tracker-${version}-${os}-${arch}.${ext}',
            builderOptions: {
                publish: [
                    { provider: 'github', private: false, releaseType: 'release' },
                ],

                mac: {
                    target: [ "dmg" ],
                    hardenedRuntime: true,
                    category: "public.app-category.productivity",
                    entitlements: "./build/entitlements.mac.inherit.plist",
                    entitlementsInherit: "./build/entitlements.mac.inherit.plist",
                },

                linux: {
                    target: ["AppImage"],
                    executableName: 'Time Tracker',
                },

                appId: 'nl.gwleuverink.clickup-time-tracker',
                afterSign: './notarize.js'
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
