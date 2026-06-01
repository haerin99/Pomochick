# 🐣 Pomochick

A Pomodoro timer with a pixel art chick — built with Electron.

## Download

Go to the [Releases](https://github.com/haerin99/Pomochick/releases) page to download the latest version:

- **Windows** → `Pomochick.Setup.1.0.0.exe`
- **Mac** → `Pomochick-1.0.0-arm64.dmg`
- **Linux** → `Pomochick-1.0.0.AppImage`

## Features

- Pomodoro timer (customizable in settings)
  - Sound effects when pomoodoro or break ends
- Pixel art chick reacts to your progress
  - 3 states: happy, neutral, sad
  - Completing a pomodoro feeds the chick
  - Hunger increases daily ("POMOS/SESSION" * "HUNGER -/POMO" * "SESSIONS/DAY" / 2)
  - When hunger reaches 100, the chick will die
- Minimal and cute UI
- Stats
- Settings
  - Pomodoro and break lengths
  - Pause hunger (stops it from increasing)
  - Reset chick status & stats

<img width="394" height="456" alt="Screenshot 2026-06-01 at 12 41 05 AM" src="https://github.com/user-attachments/assets/1d507916-5fd1-496e-9d1f-eaf3068e252b" />

<img width="391" height="454" alt="Screenshot 2026-06-01 at 12 45 48 AM" src="https://github.com/user-attachments/assets/d70442d8-ffa7-433d-9757-059b4ab026a6" />

<img width="396" height="455" alt="Screenshot 2026-06-01 at 12 47 29 AM" src="https://github.com/user-attachments/assets/8d172157-b75c-4185-ba41-fee669ac7766" />
<img width="394" height="373" alt="Screenshot 2026-06-01 at 12 47 39 AM" src="https://github.com/user-attachments/assets/cc82a971-391c-42fc-ac49-8bf7e5e667f1" />

<br>
<img width="201" height="200" alt="sad_chick" src="https://github.com/user-attachments/assets/c8f6df0d-3718-428e-bba9-8b89b7731b48" />
<img width="213" height="213" alt="happy_chick" src="https://github.com/user-attachments/assets/b3182eb8-c285-495c-b5e4-8c68f2ad1311" />



## Development

```bash
npm install
npm start
```

## License

MIT © Hae Rin Kim
