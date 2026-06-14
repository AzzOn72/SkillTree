# SkillGrid — Initialization Commands

## Step 1: Bootstrap Expo Project

```powershell
# From your project directory (c:\Users\tonia\Desktop\SkillTree)
npx create-expo-app@latest ./ --template blank-typescript
```

## Step 2: Install All Dependencies

```powershell
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

npx expo install react-native-gesture-handler react-native-reanimated

npx expo install react-native-mmkv

npm install zustand zod

npm install expo-haptics

npm install --save-dev @types/react @types/react-native
```

## Step 3: Configure Babel for Reanimated

Edit `babel.config.js` — Reanimated plugin MUST be last:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // ← must be last
    ],
  };
};
```

## Step 4: Configure `app.json` for Expo Router

```json
{
  "expo": {
    "name": "SkillGrid",
    "slug": "skillgrid",
    "scheme": "skillgrid",
    "version": "1.0.0",
    "orientation": "portrait",
    "plugins": [
      "expo-router",
      [
        "react-native-reanimated",
        { "relativeSourceLocation": true }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

## Step 5: Set Entry Point in `package.json`

```json
{
  "main": "expo-router/entry"
}
```

## Step 6: tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Step 7: Run

```powershell
npx expo start
```

---

## Exact Dependency Versions (as of June 2025)

| Package | Purpose |
|---|---|
| `expo@~52` | Expo SDK |
| `expo-router@~4` | File-based routing |
| `react-native-gesture-handler@~2.x` | Pan/zoom canvas |
| `react-native-reanimated@~3.x` | 60fps animations |
| `react-native-mmkv@^3` | Synchronous key-value storage |
| `zustand@^5` | State management |
| `zod@^3` | Runtime JSON schema validation |
| `expo-haptics` | Haptic feedback on node completion |

> **Note:** `react-native-mmkv` requires a development build (not Expo Go).
> Run `npx expo run:android` or `npx expo run:ios` after installing MMKV.
> Use `npx expo install expo-dev-client` to create a custom dev client.
