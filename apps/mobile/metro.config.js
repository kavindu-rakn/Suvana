/**
 * Metro configuration for SoundGuard
 *
 * Registers `.onnx` (and the optional `.ort` ORT format) as asset extensions
 * so that Metro bundles them alongside images and other static files.
 * Without this, `require('../assets/model/sound_model.onnx')` would throw
 * "Unable to resolve module" at runtime even though the file exists on disk.
 *
 * Reference: https://docs.expo.dev/guides/customizing-metro/
 */

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Append .onnx / .ort to the list of recognised asset file extensions.
// Metro will copy them into the APK's assets directory and make them
// accessible via Asset.fromModule() / require().
config.resolver.assetExts = [
  ...(config.resolver.assetExts ?? []),
  'onnx',
  'ort',
];

module.exports = config;
