const path = require("path");

module.exports = {
  packagerConfig: {
    asar:true,
    icon:path.join(process.cwd(), 'assets', 'favicon.ico'),
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl:path.join(process.cwd(), 'assets', 'favicon.ico'),
        setupIcon:path.join(process.cwd(), 'assets', 'favicon.ico'),
        loadingGif:path.join(process.cwd(), 'assets', 'spooder-loading.gif')
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon:path.join(process.cwd(), 'assets', 'favicon.png'),
          maintainer: 'Grey Sole',
          homepage: 'https://github.com/greysole'
        }
      },
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'GreySole',
          name: 'Spooder-Installer'
        },
        prerelease: true
      }
    }
  ]
};
