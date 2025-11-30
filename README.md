<!-----I want to build a react native app for secure multimedia creation and sharing. So there is initially logo screen, authentication screen (social emails as well as connect with wallet option, signup/creation or login if already registered in app using bsv/auth-express-middleware), then dashboard showing menu options like [camera which you can use to capture image or videos , the media after capture should be securedly uploaded to blockchain (media or metadata) and should have shareable link,there should be watermark generated (draggable watermark using react-native-gesture-handler so that even if someone takes a pic from another mobile as its non screenshot-able for other users, so the watermark wont be movable, it will be static)], gallery where previous media files are stored. I want the multimedia to be non-screenshot-able to whomsoever the media is shared and the media should be openable in app only and other than the Creator who created the media, the media should be non screenshot-able in app for other users to whom the media is shared, the metadata in the watermark should be traceable and verifiable. Using bsv blockchain tools like WhatsOnChain – blockchain transactions explorer
bsv desktop wallet which has  my identity key, wab server url (workshop practicals), https://github.com/bsv-blockchain/lars (LARS Local Automated Runtime System) (Command line interface) – test locally
https://github.com/bsv-blockchain/cars-cli (CARS Cloud Automated Runtime System) – deploy to production
 Both LARS and CARS use deployment-info.json to manage services​
bsv/sdk – npm library/package , core sdk of bsv blockchain
bsv/auth-express-middleware : npm library/package , protect API with auth (backend)
bsv/payment-express-middleware : npm library/package , monetize API (backend)
bsv/ofetch - npm library/package ,  (frontend)
MongoDB – store user data, public data
and react native dependencies like
    "@bsv/auth-express-middleware": "^1.2.3",
    "@bsv/cars-cli": "^1.2.9",
    "@bsv/lars": "^1.5.8",
    "@bsv/payment-express-middleware": "^1.2.3",
    "@bsv/sdk": "^1.9.11",
    "@expo/vector-icons": "^15.0.3",
    "@react-navigation/bottom-tabs": "^7.4.0",
    "@react-navigation/elements": "^2.6.3",
    "@react-navigation/native": "^7.1.8",
    "bsv-wallet": "^2.4.3",
    "buffer": "^6.0.3",
    "crypto-js": "^4.2.0",
    "date-fns": "^4.1.0",
    "expo": "~54.0.25",
    "expo-camera": "^17.0.9",
    "expo-constants": "~18.0.10",
    "expo-crypto": "^15.0.7",
    "expo-file-system": "^19.0.19",
    "expo-font": "~14.0.9",
    "expo-haptics": "~15.0.7",
    "expo-image": "~3.0.10",
    "expo-image-manipulator": "^14.0.7",
    "expo-image-picker": "^17.0.8",
    "expo-linking": "~8.0.9",
    "expo-location": "^19.0.7",
    "expo-media-library": "^18.2.0",
    "expo-router": "~6.0.15",
    "expo-secure-store": "^15.0.7",
    "expo-sharing": "^14.0.7",
    "expo-splash-screen": "~31.0.11",
    "expo-status-bar": "~3.0.8",
    "expo-symbols": "~1.0.7",
    "expo-system-ui": "~6.0.8",
    "expo-web-browser": "~15.0.9",
    "lodash": "^4.17.21",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-async-storage": "^0.0.1",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-randombytes": "^3.6.2",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-screenshot-prevent": "^1.2.1",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.5.1",
    "stream-browserify": "^3.0.0",
    "uuid": "^13.0.0"
  },----------->

