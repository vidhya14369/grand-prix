# The Silent Co-Driver: Team Guides & Action Plans

This document provides detailed guides for each of the 4 team members. Since 3 of the members are completely new to using Antigravity, these guides contain **hyper-detailed, context-rich copy-paste prompts**. When loaded into their respective Antigravity agents, these prompts give the AI a complete understanding of the entire project scope, the system architecture, what all other team members are doing, and the exact files/interfaces they are responsible for.

---

## 🏎️ MEMBER 1: Lead Backend & AI Engineer (You - The User)
*Role: Core Model loading, Audio Processing, and Real-Time Inference.*

### 1. Main Task
* Build the core FastAPI server.
* Load the **Hugging Face Whisper** model (for Speech-to-Text transcription) and the **Wav2Vec2** model (for vocal emotion/stress classification).
* Build the `/api/predict` endpoint: it takes an uploaded audio file, preprocesses it (resamples to 16kHz, mono WAV), runs it through both models, and returns the transcript and the stress score.

### 2. Things to Ask Your Antigravity Agent
* *"How do I install PyTorch, Transformers, and librosa on Windows safely so that the models load fast?"*
* *"Write a Python script that loads an audio file, resamples it to 16kHz, and runs it through `harshit345/xlsr-wav2vec-speech-emotion-recognition`."*
* *"How do I format the multi-part form upload in FastAPI to receive raw audio files from the frontend?"*

### 3. Key Details to Know
* **Audio Preprocessing**: Wav2Vec2 models require audio to be at a **16,000 Hz sample rate**, mono channel, and float32 format. Use `librosa` or `soundfile` in Python to convert incoming files before passing them to the model.
* **CPU Inference**: Make sure the models are initialized to run on CPU unless you have a CUDA-capable GPU. Use `torch.device("cpu")` explicitly.
* **Libraries to install**: `fastapi`, `uvicorn`, `transformers`, `torch`, `librosa`, `soundfile`, `python-multipart`.

### 4. Copy-Paste Antigravity Starter Prompt
```text
I am Member 1 and the Lead Backend & AI Engineer for our hackathon team. 
We are building "The Silent Co-Driver" — a premium F1 Pit Wall Dashboard that detects driver stress from team radio audio clips and correlates it with lap times. The deadline is August 12th.
You must help me build the core AI inference backend in Python using FastAPI.

Here is the context of our entire project so you understand the whole picture:
- Project Name: The Silent Co-Driver
- Tech Stack: Python/FastAPI (Backend), Vanilla HTML/CSS/JS (Frontend), Chart.js (Charts).
- Team Structure & API Contracts:
  1. Member 1 (Me): Responsible for FastAPI startup, loading Whisper and Wav2Vec2/HuBERT models, and exposing `/api/predict` (receives a file, returns transcription and stress score).
  2. Member 2: Responsible for static presets (under `/backend/presets`), local JSON data store (`session_db.json`), endpoint `/api/session` (GET all laps, POST add new lap), and `/api/session/insights` (GET strategy advice).
  3. Member 3: Responsible for UI design (`index.html`, `style.css`) using a dark, futuristic F1 aesthetic.
  4. Member 4: Responsible for JS integration (`app.js`), microphone audio recording, and Chart.js telemetry charts (visualizing lap times vs. stress level).

API CONTRACTS:
- `/api/predict`: POST endpoint accepting a `file: UploadFile`.
  Returns:
  {
    "transcript": "Transcribed text here...",
    "emotion": "Stressed" | "Tired" | "Calm",
    "stress_score": 85.5
  }

YOUR SPECIFIC INSTRUCTIONS:
1. Create a `requirements.txt` file in `c:/Users/vidhy/Desktop/Hackathons/GrandPrix/backend/` containing: fastapi, uvicorn, transformers, torch, librosa, soundfile, python-multipart.
2. Create `main.py` in `c:/Users/vidhy/Desktop/Hackathons/GrandPrix/backend/`.
3. In `main.py`, load the following models on CPU (using Hugging Face transformers pipelines):
   - Whisper model: "openai/whisper-tiny" or similar lightweight transcription model.
   - Speech Emotion Recognition (SER) model: "harshit345/xlsr-wav2vec-speech-emotion-recognition" or similar Wav2Vec2-based model.
4. Implement the `/api/predict` endpoint. It must:
   - Accept the raw uploaded audio file.
   - Preprocess the file: load it into float32 array, resample it to 16,000 Hz, convert to mono.
   - Pass the audio array to the Whisper pipeline to transcribe.
   - Pass the audio array to the Wav2Vec2 model. Map its raw emotion outputs (like anger, fear, sadness, calm, neutral) to our three target states: "Stressed" (angry/fear), "Tired" (sad/neutral-low-energy), "Calm" (calm/happy/neutral-high-energy).
   - Return the JSON response matching the API contract.
5. Set up CORS middleware so the frontend running on any local port can interact with our backend.
Ensure the code is robust and handles exceptions gracefully if audio loading fails.
```

---

## 🛠️ MEMBER 2: Backend API & Data Store Developer
*Role: Session Data persistence, Telemetry Insights, and Static Preset hosting.*

### 1. Main Task
* Build the state database (can be a simple local JSON file or SQLite database) to log the race session history lap-by-lap.
* Host the pre-saved **F1 Team Radio Audio Files** (the Calm, Tired, and Stressed presets) and serve them to the frontend.
* Write backend endpoints to retrieve the current session history and calculate correlation analytics.

### 2. Things to Ask Your Antigravity Agent
* *"How do I build a simple JSON database in Python to store Lap Number, Lap Time, transcript, and stress percentage?"*
* *"Create an endpoint `/api/session/insights` that calculates whether lap times are rising alongside stress levels."*
* *"How do I serve static audio files from a folder in FastAPI so the frontend can play them?"*

### 3. Key Details to Know
* **Time Conversion**: Lap times will be uploaded as strings (like `1:21.340`). To calculate correlation or trends mathematically, you must parse these strings into seconds (e.g., `1:21.340` = `81.34` seconds).
* **Static Files**: Use `fastapi.staticfiles.StaticFiles` to serve the preset audio clips (e.g. `presets/calm.wav`) so they can be played on the dashboard.

### 4. Copy-Paste Antigravity Starter Prompt
```text
I am Member 2 and the Backend API & Data Store Developer for our hackathon team. 
We are building "The Silent Co-Driver" — a premium F1 Pit Wall Dashboard that detects driver stress from team radio audio clips and correlates it with lap times. The deadline is August 12th.
You must help me build the data layer, presets, and statistical insights in our Python FastAPI backend.

Here is the context of our entire project so you understand the whole picture:
- Project Name: The Silent Co-Driver
- Tech Stack: Python/FastAPI (Backend), Vanilla HTML/CSS/JS (Frontend), Chart.js (Charts).
- Team Structure & API Contracts:
  1. Member 1: Responsible for FastAPI startup, loading Whisper and Wav2Vec2/HuBERT models, and exposing `/api/predict` (receives a file, returns transcription and stress score).
  2. Member 2 (Me): Responsible for static presets (under `/backend/presets`), local JSON data store (`session_db.json`), endpoint `/api/session` (GET all laps, POST add new lap), and `/api/session/insights` (GET strategy advice).
  3. Member 3: Responsible for UI design (`index.html`, `style.css`) using a dark, futuristic F1 aesthetic.
  4. Member 4: Responsible for JS integration (`app.js`), microphone audio recording, and Chart.js telemetry charts (visualizing lap times vs. stress level).

DATA SCHEMAS & CONTRACTS:
- GET `/api/session`: Returns all logged laps in the session database.
  Response:
  [
    { "lap_number": 1, "lap_time_str": "1:21.400", "lap_time_seconds": 81.40, "transcript": "Car feels good.", "stress_score": 12.5, "detected_emotion": "Calm" },
    ...
  ]
- POST `/api/session/add`: Adds a new lap record.
  Body:
  {
    "lap_number": int,
    "lap_time_str": string,
    "transcript": string,
    "stress_score": float,
    "detected_emotion": string
  }
- GET `/api/session/insights`: Analyze lap time and stress trends.
  Response:
  {
    "correlation_coefficient": float,
    "average_stress": float,
    "advisory_message": "Strategic advice message here..."
  }

YOUR SPECIFIC INSTRUCTIONS:
1. We are modifying `main.py` created by Member 1 in `c:/Users/vidhy/Desktop/Hackathons/GrandPrix/backend/`.
2. Implement a local JSON database file `session_db.json` to store the lap records. Write helper functions to read and write to this file safely.
3. Expose the GET `/api/session` and POST `/api/session/add` endpoints. When adding a lap, automatically parse `lap_time_str` (e.g. "1:22.500" or "82.50") into float seconds `lap_time_seconds` and save it.
4. Mount a static files folder `/backend/presets` containing F1 preset audio clips (e.g. `calm.wav`, `tired.wav`, `stressed.wav`) so the frontend can retrieve and play them directly.
5. Implement the `/api/session/insights` endpoint. It must:
   - Read the history from `session_db.json`.
   - Calculate if lap times are increasing as stress increases (e.g., compare average lap times when stress is > 60% vs when stress is < 40%).
   - Return a custom strategic advisory message (e.g. "On laps with stress exceeding 60%, lap times dropped by 2.1 seconds on average. Pit intervention recommended.").
6. Make sure all database reads and writes are non-blocking or safe.
```

---

## 🎨 MEMBER 3: Frontend UI Developer
*Role: Designing a premium, dark-themed glassmorphic dashboard interface.*

### 1. Main Task
* Design and build the visual layout of the F1 Pit Wall Dashboard.
* Create glowing glassmorphic cards, standard grid panels, and telemetry widgets.
* Design the audio control panel (record button, file upload area), the scrolling text transcript container, the stress gauge (a circular SVG dial), and the session data table.

### 2. Things to Ask Your Antigravity Agent
* *"How can I make a glassmorphic dashboard card with a dark slate background, neon borders, and glowing drop shadows using vanilla CSS?"*
* *"Create a circular SVG progress gauge that turns green for low numbers (Calm), yellow for medium (Tired), and red for high numbers (Stressed)."*
* *"Provide a CSS grid layout that fits perfectly on a standard 1080p screen without scrolling, like an F1 pit wall monitor."*

### 3. Key Details to Know
* **Aesthetics are Critical**: Do not use browser defaults. Use a dark theme palette: background `#0a0b10`, card backgrounds `#121420` with semi-transparency and blur (`backdrop-filter`), and bright neon colors for alerts (Cyan `#00f3ff`, Lime `#00ff88`, Amber `#ffae00`, and Hot Pink/Red `#ff0055`).
* **Fonts**: Import a sporty, technical font like **Orbitron**, **Outfit**, or **Inter** from Google Fonts.

### 4. Copy-Paste Antigravity Starter Prompt
```text
I am Member 3 and the Frontend UI Developer for our hackathon team. 
We are building "The Silent Co-Driver" — a premium F1 Pit Wall Dashboard that detects driver stress from team radio audio clips and correlates it with lap times. The deadline is August 12th.
You must help me build a stunning, premium frontend UI using vanilla HTML5 and CSS3 (no frameworks, no Tailwind).

Here is the context of our entire project so you understand the whole picture:
- Project Name: The Silent Co-Driver
- Tech Stack: Python/FastAPI (Backend), Vanilla HTML/CSS/JS (Frontend), Chart.js (Charts).
- Team Structure & API Contracts:
  1. Member 1: Responsible for FastAPI startup, loading Whisper and Wav2Vec2/HuBERT models, and exposing `/api/predict` (receives a file, returns transcription and stress score).
  2. Member 2: Responsible for static presets (under `/backend/presets`), local JSON data store (`session_db.json`), endpoint `/api/session` (GET all laps, POST add new lap), and `/api/session/insights` (GET strategy advice).
  3. Member 3 (Me): Responsible for UI design (`index.html`, `style.css`) using a dark, futuristic F1 aesthetic.
  4. Member 4: Responsible for JS integration (`app.js`), microphone audio recording, and Chart.js telemetry charts (visualizing lap times vs. stress level).

YOUR SPECIFIC INSTRUCTIONS:
1. Create `index.html` in `c:/Users/vidhy/Desktop/Hackathons/GrandPrix/frontend/`.
2. Create `style.css` in `c:/Users/vidhy/Desktop/Hackathons/GrandPrix/frontend/`.
3. In `style.css`, implement a premium, high-fidelity F1 Pit Wall style. Use deep charcoal/carbon-fiber colors (`#0c0d12`, `#161925`), glassmorphic panels with blur and thin glowing border borders, neon indicator lights, and modern typography (import "Orbitron" and "Inter" from Google Fonts).
4. In `index.html`, build the layout:
   - **Header**: F1 Pit Wall Dashboard title, Status Indicators (System Online, AI connected), and a ticking F1 session timer.
   - **Main Layout Grid**:
     - **Telemetry & Presets Control Panel**: A panel to select and play preset audio files (Calm, Tired, Stressed) or upload/record custom audio. It must include fields to input "Lap Number" and "Lap Time" before analyzing.
     - **Live Transcript & Waveform Widget**: A panel showing scrolling text transcripts from the driver's radio with a terminal typing animation, alongside a mock glowing audio waveform.
     - **Biometric Stress Gauge**: A card containing a circular SVG gauge showing a "Vocal Stress Index %" indicator. The gauge stroke outline must dynamically transition colors (Green for 0-40%, Yellow/Orange for 41-70%, Red for 71-100%).
     - **Live Telemetry Chart Card**: A canvas element (`<canvas id="telemetryChart"></canvas>`) configured for Member 4's Chart.js visualization.
     - **Race Session Log Log**: A grid showing a clean table of all analyzed laps with columns: Lap #, Lap Time, Stress Index %, Emotion, Transcript.
     - **AI Strategic Advisory Widget**: A glowing card with a robot icon that displays real-time racing strategic suggestions generated by the AI.
5. All interactive elements (buttons, inputs) must have unique, descriptive IDs, clean active/hover states, and smooth CSS transitions. Make sure there are no placeholders.
```

---

## 📈 MEMBER 4: Frontend JS & Charting Integrator
*Role: Application state manager, API integrations, and Chart.js visuals.*

### 1. Main Task
* Write the JavaScript logic (`app.js`) to handle file uploads and audio recording.
* Integrate **Chart.js** to display a line chart with two lines: Lap Times on one side and Driver Stress on the other.
* Query the backend API endpoints to update the UI (fill the transcript, update the stress gauge, populate the lap table, and show the AI strategic advisory).

### 2. Things to Ask Your Antigravity Agent
* *"How do I initialize a Chart.js dual-axis line chart in vanilla JavaScript?"*
* *"Write the JavaScript code to capture audio from the user's microphone, save it as a Blob, and upload it via `fetch` to a FastAPI backend."*
* *"How do I update an SVG circular progress meter's stroke offset to match a stress percentage dynamically?"*

### 3. Key Details to Know
* **Chart.js Dual-Axis**: You must specify `yAxisID: 'y-axis-laps'` for the lap time dataset and `yAxisID: 'y-axis-stress'` for the stress dataset. One axis should be on the left, the other on the right.
* **Recording Audio**: Use the HTML5 `MediaRecorder` API to capture microphone inputs.

### 4. Copy-Paste Antigravity Starter Prompt
```text
I am Member 4 and the Frontend JS & Charting Integrator for our hackathon team. 
We are building "The Silent Co-Driver" — a premium F1 Pit Wall Dashboard that detects driver stress from team radio audio clips and correlates it with lap times. The deadline is August 12th.
You must help me build the dynamic JavaScript logic (`app.js`) to handle API requests, audio recording, UI state changes, and render telemetry charts using Chart.js.

Here is the context of our entire project so you understand the whole picture:
- Project Name: The Silent Co-Driver
- Tech Stack: Python/FastAPI (Backend), Vanilla HTML/CSS/JS (Frontend), Chart.js (Charts).
- Team Structure & API Contracts:
  1. Member 1: Responsible for FastAPI startup, loading Whisper and Wav2Vec2/HuBERT models, and exposing `/api/predict` (receives a file, returns transcription and stress score).
  2. Member 2: Responsible for static presets (under `/backend/presets`), local JSON data store (`session_db.json`), endpoint `/api/session` (GET all laps, POST add new lap), and `/api/session/insights` (GET strategy advice).
  3. Member 3: Responsible for UI design (`index.html`, `style.css`) using a dark, futuristic F1 aesthetic.
  4. Member 4 (Me): Responsible for JS integration (`app.js`), microphone audio recording, and Chart.js telemetry charts (visualizing lap times vs. stress level).

YOUR SPECIFIC INSTRUCTIONS:
1. Create `app.js` in `c:/Users/vidhy/Desktop/Hackathons/GrandPrix/frontend/`.
2. Implement local state variables to track the current race session laps.
3. Integrate **Chart.js** on the `<canvas id="telemetryChart">` element. Configure it as a line chart with:
   - X-Axis: Lap numbers.
   - Left Y-Axis: Lap times (represented in seconds, but formatted on the axis labels and tooltips as "mm:ss.SSS").
   - Right Y-Axis: Stress level (percentage, 0% to 100%).
   - Color code the lines: neon blue for lap time, neon red/magenta for stress level.
4. Implement audio capture using the browser's `Navigator.mediaDevices.getUserMedia` and `MediaRecorder` APIs. Allow the user to record, stop, preview the audio, and then upload it.
5. Create helper functions to make HTTP `fetch` requests:
   - When a user uploads/records audio, send it to `/api/predict` to get the transcript and stress score.
   - Send the results along with user-inputted Lap Number and Lap Time to `/api/session/add`.
   - Re-fetch GET `/api/session` to get all laps and update the Chart.js dataset and the HTML data table.
   - Fetch GET `/api/session/insights` and animate the returned strategic advice inside the AI recommendation box.
6. Write smooth UI update animations: animate the circular SVG stress gauge (adjusting the `stroke-dashoffset` according to the score) and typing text transitions for the radio transcripts.
Ensure your code is clean, well-commented, and robust against backend fetch failures.
```
