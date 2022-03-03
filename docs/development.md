### Project setup
``` bash
npm install
```
### Compiles and hot-reloads for development
``` bash
npm run electron:serve
```
### Build for production
``` bash
npm run build:osx
npm run build:win
npm run build:linux
npm run build:all
```

### Build & publish a new release
``` bash
# Increment the version number in package.json first
# Note that the version tag needs to start with `v` in order for CI to trigger a new build

git commit -am "<VERSION_NUMBER>"
git tag <VERSION_NUMBER>
git push
git push --tags

# Github will trigger a build. A draft release will be created for review
```

### Lints and fixes files
``` bash
npm run lint
```

### Generating a new app icon
1. Install [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) globally
2. Replace the icon in `./src/assets/images/icon/icon.png` (must be at least 1024x1024)
3. Generate icon variants via the command line:

```
electron-icon-builder --input=src/assets/images/icon/icon.png --output=build/icons --flatten
```
4. The new icon will be used once a new build is triggered
