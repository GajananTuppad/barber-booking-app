const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// SDK 54's default Metro config auto-detects the pnpm workspace (via
// pnpm-workspace.yaml) and sets watchFolders/nodeModulesPaths/hierarchical
// lookup correctly on its own — no manual monorepo overrides needed anymore.
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
