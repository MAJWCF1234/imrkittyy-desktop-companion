# MrKittysAI / Mai Desktop Companion

## Quick Start on Windows 11

1. Install [Node.js LTS](https://nodejs.org/).
2. Install [LM Studio](https://lmstudio.ai/).
3. Clone or download this repository.
4. Open the folder and run `Start-Mai.cmd`.

## What the launcher does

- Checks whether LM Studio is already running and skips relaunching it if the local server is already reachable.
- Looks for an existing LM Studio install in common Windows locations and the uninstall registry.
- Falls back to the bundled Electron app when Node.js and npm are available.
- Installs dependencies with `npm install` the first time it needs them.

## If LM Studio is already installed

You do not need to reinstall it. The launcher will detect it and skip straight to checking the local server.

## If this is a fresh PC

- If Node.js and npm are installed, `Start-Mai.cmd` can install dependencies and launch the app.
- If Node.js is not installed, the launcher will still work only when the repo includes the bundled Electron runtime and a built `dist` folder.

## Notes

- The animation library now scans the local `animations` folder recursively.
- The avatar picks from a wider set of motion buckets so it does not get stuck cycling the same few poses.
