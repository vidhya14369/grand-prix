# Walkthrough - 'The Silent Co-Driver' Core Backend & Frontend Integration

We have successfully set up the codebase, loaded the Hugging Face AI models, integrated them with the FastAPI backend, merged the Next.js visual interface created by your team, and connected the frontend widgets to the live backend endpoints.

---

## 🛠️ Changes Implemented

### 1. Python AI Backend (`/backend`)
* **[NEW] [requirements.txt](file:///c:/Users/vidhy/Desktop/Hackathons/GrandPrix/backend/requirements.txt)**: Configured backend dependencies (`fastapi`, `uvicorn`, `transformers`, `torch`, `librosa`, `soundfile`).
* **[NEW] [main.py](file:///c:/Users/vidhy/Desktop/Hackathons/GrandPrix/backend/main.py)**:
  * Setup a FastAPI app with CORS middleware enabled for local development.
  * Lazily loads Hugging Face pipelines for **Whisper** (Speech-to-Text) and **Wav2Vec2** (Speech Emotion Recognition) on CPU.
  * Implemented `/api/predict` to receive custom uploaded audio files, resample them to 16kHz mono, and run inference.
  * Implemented `/api/predict/preset` to process the F1 historical presets locally.
  * Implemented `/api/session` and `/api/session/add` to manage the lap-by-lap race logs in `session_db.json`.
  * Implemented `/api/session/insights` to compute correlation coefficients between stress levels and lap times, generating strategic F1 advisory text.
* **[NEW] [generate_presets.py](file:///c:/Users/vidhy/Desktop/Hackathons/GrandPrix/backend/generate_presets.py)**: A utility script to programmatically write F1-mapped `.wav` files into the `/backend/presets` directory so the server can test presets immediately without throwing file-not-found errors.

### 2. Next.js Frontend Integration
* **[MODIFY] [app/page.tsx](file:///c:/Users/vidhy/Desktop/Hackathons/GrandPrix/app/page.tsx)**:
  * Modified to statefully manage the list of laps (`sessionLaps`) and active clip.
  * Fetches telemetry logs and strategic advisory text from FastAPI endpoints upon component mounting.
  * Dispatches raw file payloads to `/api/predict` for custom uploads and `/api/predict/preset` for preset selections.
  * Added a robust fallback mechanism: if the backend server is offline, it gracefully falls back to local simulated mock timeouts (preventing crashes during demo pitches!).
  * Integrated a glowing **AI Strategic Advisory** card at the bottom right of the telemetry view.
* **[MODIFY] [lap-stress-chart.tsx](file:///c:/Users/vidhy/Desktop/Hackathons/GrandPrix/components/lap-stress-chart.tsx)**: Refactored the recharts line plot to receive telemetry datasets dynamically as a prop rather than importing static arrays.
* **[MODIFY] [audio-player-card.tsx](file:///c:/Users/vidhy/Desktop/Hackathons/GrandPrix/components/audio-player-card.tsx)**: Upgraded the `onSelectClip` callback signature to bubble up the actual JavaScript binary `File` object when a custom sound file is dragged or chosen.

---

## 🔬 Verification Results

### 1. Python Environment Installation
* Virtual environment created in `/backend/.venv`.
* Installed all required packages successfully.

### 2. Preset File Generation
* Generated 4 dummy audio presets in `/backend/presets`:
  * `radio_lap03_turn1.wav`
  * `radio_lap07_pitentry.wav`
  * `radio_lap09_turn4.wav`
  * `radio_lap12_backstraight.wav`

### 3. Server Startup
* **FastAPI Backend**: Successfully booted on `http://127.0.0.1:8000`. Startup complete with no errors.
* **Next.js Dev Server**: Successfully booted and serving the dashboard. Connected to the backend.
