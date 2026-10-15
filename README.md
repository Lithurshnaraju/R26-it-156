# AquaGuard Windows Setup Guide

This project is two systems linked together:

| System | What it does | Backend | Frontend |
|---|---|---|---|
| **AquaGuard** | Garbage / water pollution detection dashboard | FastAPI, port **8000** | Next.js, port **3000** |
| **Vision Sentry AI** | Drowning detection and animal-human threat surveillance | FastAPI, port **8001** | React (Vite), port **5173** |

The AquaGuard sidebar has a **Vision Sentry AI** button that opens Vision Sentry in a new browser tab.

**You must run all four services at the same time.**

---

## 1. Folder structure

```
aquaguard\
├── aquaguard-backend\          (AquaGuard API, app\main.py, best.pt)
├── aquaguard-frontend\         (AquaGuard dashboard, Next.js)
└── R26-it-156-Nuzri-dev\
    ├── backend\                (Vision Sentry API, main.py)
    ├── frontend\               (Vision Sentry dashboard, Vite)
    ├── drowning _best.pt       (drowning model)
    ├── Animaldetect.pt         (animal model)
    ├── Human.pt                (human model)
    ├── animal human detextion video.mp4
    └── drowning sample.mp4
```

Make sure the model (`.pt`) and sample video files are present in the folders above, or the backends will fail to start.

---

## 2. Prerequisites (install once)

| Tool | Version | Download |
|---|---|---|
| Python | 3.10 or 3.11 (64-bit) | https://www.python.org/downloads/ |
| Node.js | 18 or newer (LTS) | https://nodejs.org |
| pnpm | latest | installed in step 3 |

During the Python install, **tick "Add python.exe to PATH"**.

Check everything in Command Prompt or PowerShell:

```bat
python --version
node -v
npm -v
```

---

## 3. One-time setup

Open **Command Prompt** and run each block. Replace `C:\path\to` with the folder that contains `aquaguard`.

### 3.1 Install pnpm

```bat
npm install -g pnpm
```

### 3.2 AquaGuard backend (port 8000)

```bat
cd C:\path\to\aquaguard\aquaguard-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
deactivate
```

### 3.3 AquaGuard frontend (port 3000)

```bat
cd C:\path\to\aquaguard\aquaguard-frontend
pnpm install
```

### 3.4 Vision Sentry backend (port 8001)

Use its own virtual environment so its packages don't clash with AquaGuard's.

```bat
cd C:\path\to\aquaguard\R26-it-156-Nuzri-dev
python -m venv venv
venv\Scripts\activate
pip install -r backend\requirements.txt
pip install "numpy<2" "opencv-python<4.11"
deactivate
```

> **Important:** `numpy<2` and `opencv-python<4.11` must stay pinned. Torch 2.2 needs numpy 1.x, and newer OpenCV versions require numpy 2, which breaks the models.

If `backend\requirements.txt` does not exist, install these instead:

```bat
pip install fastapi "uvicorn[standard]" ultralytics torch torchvision pydantic websockets python-multipart "numpy<2" "opencv-python<4.11"
```

### 3.5 Vision Sentry frontend (port 5173)

```bat
cd C:\path\to\aquaguard\R26-it-156-Nuzri-dev\frontend
pnpm install
```

---

## 4. Required configuration (check once)

### 4.1 Vision Sentry frontend must proxy to port 8001

File: `R26-it-156-Nuzri-dev\frontend\vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api':    { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/static': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/ws':     { target: 'ws://127.0.0.1:8001', ws: true },
    },
  },
})
```

### 4.2 AquaGuard sidebar button

File: `aquaguard-frontend\components\AppLayout.js`

```jsx
const SENTRY_URL = 'http://localhost:5173';
```

and the sidebar button:

```jsx
<button className="sb-item" onClick={() => window.open(SENTRY_URL, '_blank', 'noopener,noreferrer')}>
  <span className="icon">🛡️</span> Vision Sentry AI <span style={{marginLeft:'auto',opacity:0.6}}>↗</span>
</button>
```

---

## 5. Running the system

### Option A: Four terminals (manual)

Open **four** Command Prompt windows and run one command block in each.

**Terminal 1: AquaGuard backend**
```bat
cd C:\path\to\aquaguard\aquaguard-backend
venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2: AquaGuard frontend**
```bat
cd C:\path\to\aquaguard\aquaguard-frontend
pnpm dev
```

**Terminal 3: Vision Sentry backend**
```bat
cd C:\path\to\aquaguard\R26-it-156-Nuzri-dev
venv\Scripts\activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

**Terminal 4: Vision Sentry frontend**
```bat
cd C:\path\to\aquaguard\R26-it-156-Nuzri-dev\frontend
pnpm dev
```

Wait for the Vision Sentry backend to print `Application startup complete` (it loads three AI models, which can take a minute).

### Option B: One-click scripts

Save each file below into the folder shown, then double-click `start_all.bat`.

**`aquaguard\start_all.bat`**
```bat
@echo off
title AquaGuard + Vision Sentry Launcher
set "ROOT=%~dp0"

start "AquaGuard Backend (8000)" cmd /k "cd /d "%ROOT%aquaguard-backend" && venv\Scripts\activate && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "AquaGuard Frontend (3000)" cmd /k "cd /d "%ROOT%aquaguard-frontend" && pnpm dev"
start "Vision Sentry Backend (8001)" cmd /k "cd /d "%ROOT%R26-it-156-Nuzri-dev" && venv\Scripts\activate && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001"
start "Vision Sentry Frontend (5173)" cmd /k "cd /d "%ROOT%R26-it-156-Nuzri-dev\frontend" && pnpm dev"

timeout /t 15 >nul
start http://localhost:3000
```

Place `start_all.bat` in the `aquaguard` folder (the one that contains `aquaguard-backend`). It opens four windows and then your browser.

To stop everything, close the four windows or press `Ctrl + C` in each.

---

## 6. Using the system

1. Open **http://localhost:3000** (AquaGuard dashboard).
2. Log in. Use **Take Photo** or **Analyze Image** for garbage scans.
3. Click **Vision Sentry AI** in the sidebar. It opens **http://localhost:5173** in a new tab at full size.
4. In Vision Sentry, choose a mode at the top: **Wildlife Threat Mode**, **Water Rescue Mode** or **Dual Monitor Grid**. You can use **Upload Video** to analyze your own footage.

Useful addresses:

| URL | What it is |
|---|---|
| http://localhost:3000 | AquaGuard dashboard |
| http://localhost:8000/docs | AquaGuard API docs |
| http://localhost:5173 | Vision Sentry dashboard |
| http://localhost:8001/docs | Vision Sentry API docs |

---

## 7. Troubleshooting

| Problem | Cause and fix |
|---|---|
| `'python' is not recognized` | Python is not on PATH. Reinstall it and tick "Add to PATH", or try `py` instead of `python`. |
| `'pnpm' is not recognized` | Run `npm install -g pnpm` and reopen the terminal. |
| `Address already in use` / port busy | Another program uses the port. Find it with `netstat -ano \| findstr :8001`, then stop it with `taskkill /PID <pid> /F`. |
| `No module named 'backend'` | You started uvicorn from the wrong folder. Run it from `R26-it-156-Nuzri-dev` (not from inside `backend`). |
| `No module named 'app'` | Run the AquaGuard backend from inside `aquaguard-backend`. |
| Vision Sentry shows no video, 404 errors on port 8000 | The frontend is calling the wrong backend. Check `vite.config.js` (section 4.1), restart Vite, and close old browser tabs. |
| `ECONNREFUSED` in the Vite terminal | The Vision Sentry backend is not running on 8001, or the proxy uses `localhost`. Use `127.0.0.1` as in section 4.1. |
| `A module compiled using NumPy 1.x cannot be run in NumPy 2.x` | Run `pip install "numpy<2" "opencv-python<4.11"` inside the Vision Sentry virtual environment. |
| `Could not load model` / file not found | The `.pt` model files or the sample `.mp4` videos are missing from `R26-it-156-Nuzri-dev`. File names contain spaces, so keep them exactly as they are. |
| Vision Sentry video is slow | Without an NVIDIA GPU, three YOLO models run on the CPU. Lower the video resolution or use a shorter clip. |
| Sidebar button not visible | Save `AppLayout.js` and hard-refresh the browser with `Ctrl + Shift + R`. Check the `pnpm dev` terminal for compile errors. |
| `Expected '}', got ':'` in `Dashboard.js` | A stray line was pasted into `Dashboard.js`. Remove any `{ label: ..., href: ..., icon: ... }` line from it. |
| Popup or new tab blocked | Allow popups for `localhost:3000` in the browser address bar. |

---

## 8. Startup order (summary)

1. Vision Sentry backend (8001), the slowest to start
2. Vision Sentry frontend (5173)
3. AquaGuard backend (8000)
4. AquaGuard frontend (3000)

Then open **http://localhost:3000**.

---

## 9. Security notes

- All services above bind to `127.0.0.1`, so they are only reachable from the same computer. Do not change this to `0.0.0.0` unless you need other devices on your network, and add authentication first.
- Keep `--reload` off for the Vision Sentry backend. It reloads all three AI models on every file save.
