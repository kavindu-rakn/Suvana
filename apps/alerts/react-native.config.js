/**
 * react-native.config.js — Force-link native modules for EAS prebuild
 * ─────────────────────────────────────────────────────────────────────
 * EAS Build (developmentClient: true) runs `expo prebuild` in the cloud
 * before Gradle compilation.  Prebuild invokes the React Native autolinking
 * resolver, which reads this file to inject native packages into the
 * generated MainApplication.kt / PackageList.java.
 *
 * Packages listed here are guaranteed to be linked even if their own
 * package.json does not carry the `"reactNativeConfig"` key that some
 * autolinking versions require.
 *
 * onnxruntime-react-native:
 *   Without this entry, Expo's autolinking may silently skip the JSI
 *   installation, leaving OnnxruntimeModule null at runtime and causing:
 *     TypeError: Cannot read property 'install' of null
 *
 * react-native-live-audio-stream:
 *   This library predates the modern autolinking spec and may not be
 *   discovered automatically.  Explicit registration ensures AudioRecord
 *   is available from the first launch.
 */

module.exports = {
  dependencies: {
    'onnxruntime-react-native': {
      root: './node_modules/onnxruntime-react-native',
      platforms: {
        android: {
          sourceDir: './android',
          packageImportPath: 'import ai.onnxruntime.reactnative.OnnxruntimePackage;',
          packageInstance: 'new OnnxruntimePackage()',
        },
      },
    },
    'react-native-live-audio-stream': {
      root: './node_modules/react-native-live-audio-stream',
      platforms: {
        android: {
          sourceDir: './android',
          packageImportPath: 'import com.imxiqi.rnliveaudiostream.RNLiveAudioStreamPackage;',
          packageInstance: 'new RNLiveAudioStreamPackage()',
        },
      },
    },
  },
};
