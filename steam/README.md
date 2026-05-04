# Steam Distribution — Platformer Engine

This directory contains the scaffolding for packaging the game as a standalone desktop application using Electron.

## Packaging for Steam (via Electron)

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm or yarn

### Quick Start

```bash
# From the project root (game-engine/)
cd ..

# Initialize the Electron project
npm init -y
npm install electron --save-dev

# Copy the steam/electron-main.js to the root as main.js
cp steam/electron-main.js main.js
```

### Package Structure

```
steam-platformer/
├── game-engine/           # Engine source (this directory)
│   ├── index.html
│   ├── engine.js
│   ├── physics.js
│   ├── entities.js
│   ├── renderer.js
│   ├── levels.js
│   └── audio.js
├── steam/
│   ├── README.md          # This file
│   └── electron-main.js   # Electron entry point
├── package.json
└── main.js → steam/electron-main.js (symlink or copy)
```

### Building for Steam

1. **Configure `package.json`:**

```json
{
  "name": "steam-platformer",
  "version": "1.0.0",
  "description": "A Steam platformer game",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  }
}
```

2. **Build binaries:**

```bash
npx electron-builder --win --x64
```

### Integrating with Steam

For Steam distribution:

1. **Steamworks SDK**: Use [greenworks](https://github.com/greenheartgames/greenworks) or [steamworks.js](https://github.com/ceifa/steamworks.js) for Steam API integration.

2. **Steam Achievements**: Add achievement tracking via steamworks.js.

3. **Steam Cloud Saves**: Store save data in the user's Steam Cloud directory.

4. **Steam Input**: Map gamepad controls via the Steam Input API.

5. **Steam Overlay**: The Electron window should be configured to support the Steam overlay.

### Recommended electron-builder config

```yaml
appId: com.yourstudio.steamplatformer
productName: Steam Platformer
directories:
  output: dist
files:
  - game-engine/**/*
  - main.js
  - package.json
win:
  target: nsis
mac:
  target: dmg
linux:
  target: AppImage
```

### Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [Steamworks Documentation](https://partner.steamgames.com/doc/home)
- [steamworks.js](https://github.com/ceifa/steamworks.js)

---

*This is a template. Fill in your actual app ID, name, and Steamworks configuration when you're ready to publish.*
