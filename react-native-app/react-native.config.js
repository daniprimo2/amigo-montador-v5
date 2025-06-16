module.exports = {
  dependencies: {
    'react-native-sqlite-storage': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-sqlite-storage/platforms/android',
          packageImportPath: 'io.liteglue.SQLitePluginPackage',
        },
      },
    },
    'react-native-vector-icons': {
      platforms: {
        ios: {
          xcodeprojDir: 'ios',
          pbxprojPath: 'ios/AmigoMontadorNative.xcodeproj/project.pbxproj',
        },
      },
    },
  },
};