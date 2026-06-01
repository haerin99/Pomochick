# 🐣 Pomochick

A Pomodoro timer with a pixel art chick — built with Electron.

## Download

Go to the [Releases](https://github.com/haerin99/Pomochick/releases) page to download the latest version:

- **Windows** → `Pomochick.Setup.1.0.0.exe`
- **Mac** → `Pomochick-1.0.0-arm64.dmg`
- **Linux** → `Pomochick-1.0.0.AppImage`

## Features

### 🍅 Pomodoro Timer
- Customizable pomodoro and break lengths
- Sound effects when a pomodoro or break ends

### 🐥 Pixel Art Chick
- 3 states: happy, neutral, and sad <br>
<img src="assets/happy_chick.png" width="60"> <img src="assets/neutral_chick.png" width="60"> <img src="assets/sad_chick.png" width="60">
- Completing a pomodoro feeds the chick
- Hunger increases daily based on your goals:
  $$\frac{HUNGER/POMO \times POMOS/SESSION \times SESSIONS/DAY}{2}$$
  Complete at least half your planned sessions each day to keep the chick fed
- When hunger reaches 100, the chick dies — use **Pause Hunger** to prevent this, or **Reset Chick** to start over <br>
  <img src="assets/dead_chick.png" width="60">

### 📊 Stats
- Days alive, total focus time, and weekly activity

### ⚙️ Settings
- Pomodoro and break lengths
- Hunger per pomo, pomos per session, sessions per day
- Pause hunger (stops the daily increase)
- Reset chick status & stats

## Screenshots

<img width="394" height="456" alt="Timer" src="https://github.com/user-attachments/assets/1d507916-5fd1-496e-9d1f-eaf3068e252b" />
<img width="391" height="454" alt="Chick states" src="https://github.com/user-attachments/assets/d70442d8-ffa7-433d-9757-059b4ab026a6" />
<img width="396" height="455" alt="Stats" src="https://github.com/user-attachments/assets/8d172157-b75c-4185-ba41-fee669ac7766" />
<img width="394" height="373" alt="Settings" src="https://github.com/user-attachments/assets/cc82a971-391c-42fc-ac49-8bf7e5e667f1" />

## Development

```bash
npm install
npm start
```

## License

MIT © Hae Rin Kim
