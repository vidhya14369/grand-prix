# GrandPrix Pit Wall — Driver Vocal Stress & Telemetry Analytics

Welcome to the **GrandPrix Pit Wall Dashboard**, a real-time vocal emotion and race telemetry analytics platform designed for Formula 1 race engineers. 

This platform uses AI audio classification to analyze real-time team radio calls from the cockpit, correlate vocal stress levels against lap times, and generate live strategic pit advisories (the "Silent Co-Driver").

---

## 🏎️ Key Features

* **Real-Time Voice Analytics**: Automatically transcribes driver radio calls using **OpenAI Whisper-small** and classifies vocal emotions using a calibrated **Wav2Vec2** speech emotion recognition model.
* **Dual-Axis Telemetry Correlation Chart**: Visualizes lap times (in seconds) on the left axis and vocal stress levels (0-100%) on the right axis across the entire stint.
* **AI Strategic Advisory**: Automatically generates contextual pit wall recommendations by detecting sudden lap-to-lap stress increases and pace drops (e.g. recommending a switch to Intermediates/Wet tyres during stress peaks).
* **Driver & Session Selector Caching**: Fully functional client-side caching of stint telemetry data when switching between different drivers (Verstappen, Leclerc, Hamilton, Piastri) and sessions.
* **Audio Input & Recorder**: Record team radio live from your microphone or upload custom `.wav`/`.mp3` files, with full control over the target lap and lap time configuration.
* **Robust Offline Demo Mode**: If the Hugging Face AI pipeline is offline, the dashboard automatically transitions to a mock fallback badges/heuristic parser to protect the presentation.

---

## 📁 Repository Structure

```
├── app/                  # Next.js 15 pages and app router layout
├── backend/              # FastAPI Python backend server
│   ├── main.py           # FastAPI entrypoint and prediction endpoints
│   ├── utils.py          # Lap-to-lap delta calculation and strategic advice logic
│   ├── test_backend.py   # Python backend unit tests
│   └── requirements.txt  # Python package requirements
├── components/           # Reusable Tailwind UI components
│   ├── audio-player-card.tsx
│   ├── lap-stress-chart.tsx
│   ├── metrics-overview.tsx
│   ├── mood-badge-card.tsx
│   ├── top-nav.tsx
│   └── transcript-card.tsx
├── lib/                  # Shared TypeScript helpers and preset metadata
└── public/               # Static assets & preset F1 audio clips
```

---

## 🚀 Setup & Installation

Follow these steps to run the application locally.

### 1. Run the FastAPI Backend (AI Inference)

Go to the `backend/` directory and configure the environment:

```bash
cd backend
```

Create a Python virtual environment and activate it:
* **Windows**:
  ```bash
  python -m venv .venv
  .venv\Scripts\activate
  ```
* **macOS/Linux**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

Install dependencies:
```bash
pip install -r requirements.txt
```

Start the backend:
```bash
python main.py
```
The backend server will run at [http://127.0.0.1:8000](http://127.0.0.1:8000). *(Note: On first startup, it will fetch Whisper-small and Wav2Vec2 weights directly from the Hugging Face Hub).*

---

### 2. Run the Next.js Frontend (Dashboard)

Open a new terminal at the root of the project:

Install frontend packages:
```bash
npm install
```

Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧪 Running Tests

To verify backend telemetry logic and calculation delta formulas, run the Python test suite:

```bash
cd backend
python -m unittest test_backend.py
```
