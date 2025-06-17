from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
from .services.heart_rate_service import HeartRateService

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS with more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Initialize heart rate service
logger.info("Initializing FastAPI application...")
heart_rate_service = HeartRateService()
logger.info("Heart rate service initialized")

@app.websocket("/ws/heart-rate")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info(f"WebSocket connection accepted from {websocket.client}")
    
    try:
        while True:
            # Receive frame data
            frame_data = await websocket.receive_bytes()
            logger.info(f"Received frame of size: {len(frame_data)} bytes")
            
            # Process frame and await the result
            metrics = await heart_rate_service.process_frame(frame_data)
            logger.info(f"Frame processed - Metrics: {metrics}")
            
            # Send metrics back to client
            await websocket.send_json(metrics)
            logger.info("Metrics sent to client")
            
    except WebSocketDisconnect:
        logger.info(f"Client {websocket.client} disconnected normally")
    except Exception as e:
        logger.error(f"Error in WebSocket connection: {str(e)}", exc_info=True)
    finally:
        logger.info(f"WebSocket connection closed for {websocket.client}") 