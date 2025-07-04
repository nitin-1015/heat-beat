# Heart Rate Monitor

This web app estimates a user's heart rate (BPM) in real time using a regular webcam and facial detection. 

Built with React, TypeScript, and TensorFlow.js, it uses the MediaPipe Face Mesh model to track facial landmarks and measure subtle changes in skin tone. By analyzing green-channel intensity through remote photoplethysmography (rPPG), it calculates BPM without any physical contact.

## Features

- Real-time heart rate monitoring using webcam
- Visual overlay showing the face region being monitored
- Historical BPM graph showing last 20 readings
- Updates every 3 seconds for accurate measurements
- User-friendly interface with clear visual feedback

## Deployment

### Prerequisites
- Docker installed on your machine
- Docker Hub account with repository access
- Docker Hub access token with push permissions

### Deployment Steps

1. **Set up environment variables**
   Create a `.env` file in the project root with the following variables:
   ```
   VITE_API_URL=https://your-backend-api-url.com
   VITE_WS_URL=wss://your-websocket-url.com
   DOCKER_TOKEN=your_docker_hub_token
   ```

2. **Make the deployment script executable**
   ```bash
   chmod +x deploy.sh
   ```

3. **Run the deployment script**
   ```bash
   ./deploy.sh
   ```

   This will:
   - Build the Docker image
   - Tag it with your Docker Hub username
   - Log in to Docker Hub
   - Push the image to your repository
   - Trigger the deployment webhook

4. **Verify deployment**
   Check your deployment platform (e.g., Render.com) to monitor the deployment status.

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Chart.js & Recharts for data visualization
- React Router for navigation
- Tailwind CSS for styling

### Backend
- Python 3.x
- FastAPI (with Uvicorn ASGI server)
- MediaPipe for face mesh detection
- NumPy for signal processing

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- npm or yarn

### Backend Setup

1. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install Python dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The frontend will be available at `http://localhost:5173`

## Usage

1. Open the application in a modern web browser
2. Allow camera access when prompted
3. Position your face within the frame
4. The app will automatically start monitoring your heart rate
5. View your current BPM and historical data in the graph

## Note
For best results:
- Ensure good lighting conditions
- Keep your face well-lit and visible to the camera
- Remain relatively still during measurement
- A mobile device camera often provides better accuracy than a webcam
