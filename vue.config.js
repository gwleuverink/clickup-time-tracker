module.exports = {
  configureWebpack: {
    devtool: "source-map",
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      preload: "src/preload.js",
      productName: "ClickUp Time Tracker",
      artifactName: "time-tracker-${version}-${os}-${arch}.${ext}",
      builderOptions: {
        buildVersion: 1,
        publish: [
          { provider: "github", private: false, releaseType: "release" },
        ],

        mac: {
          // target: [ "dmg", "mas" ],
          target: ["dmg"],
          hardenedRuntime: true,
          electronLanguages: ["en"],
          category: "public.app-category.productivity",
          entitlements: "./build/entitlements.mac.inherit.plist",
          entitlementsInherit: "./build/entitlements.mac.inherit.plist",
        },

        mas: {
          // asarUnpack: [],
          // asarUnpack: ['**/*.node'],
          type: "distribution",
          hardenedRuntime: false,
          gatekeeperAssess: false,
          provisioningProfile: "./build/embedded.provisionprofile",
          entitlements: "./build/entitlements.mas.plist",
          entitlementsInherit: "./build/entitlements.mas.inherit.plist",
        },

        linux: {
          target: ["AppImage"],
          executableName: "Time Tracker",
        },

        appId: "nl.gwleuverink.clickup-time-tracker",
        afterSign: "./notarize.js",
      },
    },
  },
  css: {
    loaderOptions: {
      sass: {
        implementation: require("sass"), // This line must in sass option
      },
    },
  },
};
