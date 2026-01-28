# audio-video-transcript-backend

A scalable backend service for uploading audio/video files, extracting audio, generating timestamped transcriptions using open-source speech-to-text models, and exposing REST APIs for transcription retrieval and synchronized playback.

# Audio/Video Transcription Service

A full-stack application that allows users to upload audio/video files, transcribe them using local open ai whisper, and view synchronized playback with transcript segments.

## Features

- **Streaming file upload** (supports large files efficiently — no full buffering)
- **Audio extraction** with fluent-ffmpeg
- **Offline transcription** using open ai -whisper (Python)
- **Segment-wise storage** in PostgreSQL (start_time, end_time, content)
- **Background processing** (non-blocking HTTP responses)
- **Dashboard** — list all files (Video / Audio tabs), clickable rows to view player + synced transcript
- **Upload page** — compact drag & drop area + history table with refresh
- **Modal player** — native HTML5 video with clickable, time-synced transcript

## Tech Stack

**Backend**

- Node.js + Express
- PostgreSQL (pg)
- Busboy (streaming upload)
- fluent-ffmpeg + ffmpeg binary
- openai whisper

**Database**

- PostgreSQL (tables: media_files, transcriptions, transcription_segments)

## Backend Setup

### Prerequisites

- Node.js ≥ 20
- PostgreSQL
- Python 3.9+ for open ai whisper
- ffmpeg installed (`brew install ffmpeg` or equivalent)

### Install OpenAI whisper and ffmpeg -- Below is for mac

```bash
brew install ffmpeg
pip install --upgrade pip
pip install openai-whisper
```

## Install Postgres sql

```bash
brew install postgresql
psql --version
```

### Steps

1. **Clone repo & install**
   ```bash
   cd projectDir
   npm install
   ```

### Create the PostgreSQL database:

```bash
createdb transcription_db

# Run projectDir/sqlMigration.sql
psql -f sqlMigration.sql

```

2. **Start the server**
   ```bash
   npm start
   ```

Arhcitecture Diagram

graph TD
A[Frontend - React + Vite] -->|HTTP POST /api/upload| B[Express Backend]
B -->|Streaming| C[Uploads Service/temp disk]
C -->|Save metadata| D[PostgreSQL]
C -->|Background trigger| E[Processing Service]
E -->|extract audio| F[ffmpeg]
F -->|WAV file| G[openai-whisper]
G -->|JSON segments| E
E -->|Save segments + metadata| D
A -->|GET /api/files| D
A -->|GET /api/transcription/:id| D
D -->|Return data| A
A -->|Modal player + transcript sync| User
