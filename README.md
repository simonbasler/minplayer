# MinPlayer

A lightweight, modern audio player built with Tauri and React. MinPlayer offers a clean, minimalist interface for playing your favorite music with essential features and intuitive controls.

## Features

- **Drag & Drop Support**: Simply drag audio files into the app to add them to your playlist
- **Wide Format Support**: MP3, M4A, FLAC, WAV, OGG, Opus, AAC, and WMA
- **Smart Metadata**: Automatically extracts song titles, artists, album art, and duration
- **Playlist Management**:
  - Select tracks with Cmd+Click
  - Select all with Cmd+A
  - Delete selected tracks with Delete/Backspace
- **Keyboard Shortcuts**: Full keyboard control for playback and volume
- **Media Keys**: Control playback using your keyboard's media keys
- **Native Performance**: Built with Tauri for a small footprint and native performance
- **Clean UI**: Minimalist design focused on music, not clutter

## Installation

### Download Pre-built App

Download the latest `.dmg` file from the [Releases](https://github.com/simonbasler/minplayer/releases) page and install it on your Mac.

### Build from Source

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install)
- macOS (for macOS builds)

**Steps:**

1. Clone the repository:
```bash
git clone https://github.com/simonbasler/minplayer.git
cd minplayer
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri dev
```

4. Build for production:
```bash
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Usage

1. **Add Music**: Drag and drop audio files into the MinPlayer window
2. **Play**: Click on a track to play it, or use the play/pause button
3. **Navigate**: Use previous/next buttons or click tracks in the playlist
4. **Control Volume**: Adjust the volume slider at the bottom

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `←` | Seek backward 5 seconds |
| `→` | Seek forward 5 seconds |
| `↑` | Increase volume |
| `↓` | Decrease volume |
| `Cmd+A` | Select all tracks |
| `Cmd+Click` | Toggle track selection |
| `Delete` / `Backspace` | Remove selected tracks |

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Backend**: Rust (Tauri)
- **Build Tool**: Vite
- **UI**: Custom CSS with native macOS styling
- **Audio**: Web Audio API
- **Metadata**: lofty (Rust crate)

## Project Structure

```
minplayer/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── App.css            # Styling
│   └── utils/
│       └── AudioEngine.ts # Audio playback engine
├── src-tauri/             # Tauri/Rust backend
│   ├── src/
│   │   └── main.rs       # Rust backend with metadata extraction
│   └── tauri.conf.json   # Tauri configuration
└── package.json
```

## Development

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build frontend
- `npm run tauri dev` - Run app in development mode
- `npm run tauri build` - Build production app

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

Built with [Tauri](https://tauri.app/) and [React](https://react.dev/).

---

Made with ❤️ using [Claude Code](https://claude.com/claude-code)
