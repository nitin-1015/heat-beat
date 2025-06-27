import asyncio
import json
import logging
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
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
    allow_origins=[
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:5173",
        "http://localhost:3000",  # Also allow React default port
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?"  # Allow any localhost port for development
)

# Initialize heart rate service
logger.info("Initializing FastAPI application...")
heart_rate_service = HeartRateService()
logger.info("Heart rate service initialized")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, client_id: str):
        async with self.lock:
            self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, client_id: str):
        async with self.lock:
            websocket = self.active_connections.pop(client_id, None)
            if websocket:
                try:
                    await websocket.close()
                except Exception as e:
                    logger.error(f"Error closing connection for {client_id}: {str(e)}")
        logger.info(f"Client {client_id} disconnected. Remaining connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], client_id: str):
        websocket = self.active_connections.get(client_id)
        if websocket:
            try:
                await websocket.send_json(message)
                return True
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {str(e)}")
                await self.disconnect(client_id)
        return False

# Initialize connection manager
manager = ConnectionManager()

def is_websocket_connected(websocket: WebSocket) -> bool:
    """Check if WebSocket is still connected."""
    client_state = websocket.client_state
    return client_state.value == 1  # 1 = WebSocketState.CONNECTED

@app.websocket("/ws/heart-rate")
async def websocket_endpoint(websocket: WebSocket):
    client_id = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"New WebSocket connection from {client_id}")
    
    try:
        # Accept the WebSocket connection first
        await websocket.accept()
        await manager.connect(websocket, client_id)
        logger.info(f"Successfully connected WebSocket for {client_id}")
        await asyncio.sleep(0.1)

        # Main WebSocket message loop
        while True:
            try:
                # Check if WebSocket is still connected
                if not is_websocket_connected(websocket):
                    logger.warning(f"WebSocket connection lost for {client_id}")
                    break
                    
                # Receive frame data with timeout
                try:
                    frame_data = await asyncio.wait_for(
                        websocket.receive_bytes(),
                        timeout=30.0  # 30 seconds timeout for receiving data
                    )
                except asyncio.TimeoutError:
                    logger.debug(f"No data received from {client_id} within timeout")
                    continue  # Skip to next iteration to check connection again
                    
                logger.debug(f"Received {len(frame_data)} bytes from {client_id}")
                
                # Process frame
                try:
                    metrics = await heart_rate_service.process_frame(frame_data)
                    logger.debug(f"Processed frame for {client_id}, metrics: {metrics}")
                    
                    # Add timestamp and frame info
                    response = {
                        **metrics,
                        "timestamp": time.time(),
                        "frame_size": len(frame_data),
                        "client_id": client_id.split(":")[0]  # Only IP for logging
                    }
                    
                    # Send metrics back to client
                    await manager.send_personal_message(response, client_id)
                    
                except asyncio.CancelledError:
                    logger.info(f"Frame processing cancelled for {client_id}")
                    raise
                except Exception as e:
                    error_msg = f"Error processing frame: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    try:
                        await manager.send_personal_message({
                            "error": error_msg,
                            "type": "processing_error",
                            "timestamp": time.time()
                        }, client_id)
                    except Exception as send_error:
                        logger.error(f"Failed to send error message to {client_id}: {str(send_error)}")
                        raise  # Re-raise to trigger WebSocket cleanup
                
            except asyncio.TimeoutError:
                logger.warning(f"No data received from {client_id} for 30 seconds, sending ping...")
                try:
                    # Check if WebSocket is still connected before sending ping
                    if not is_websocket_connected(websocket):
                        logger.warning(f"WebSocket disconnected while preparing ping for {client_id}")
                        break
                        
                    # Send ping to check if client is still alive
                    ping_msg = {"type": "ping", "timestamp": time.time()}
                    await websocket.send_json(ping_msg)
                    logger.debug(f"Sent ping to {client_id}")
                    
                    # Wait for pong with a short timeout
                    try:
                        pong = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
                        if pong.lower() != 'pong':
                            logger.warning(f"Invalid pong received from {client_id}: {pong}")
                            raise WebSocketDisconnect(1006, "Invalid pong received")
                        logger.debug(f"Received pong from {client_id}")
                    except asyncio.TimeoutError:
                        logger.warning(f"Ping timeout for {client_id}, disconnecting...")
                        break
                        
                except WebSocketDisconnect as e:
                    logger.warning(f"Client {client_id} disconnected during ping: {str(e)}")
                    break
                except Exception as e:
                    logger.error(f"Ping error for {client_id}: {str(e)}", exc_info=True)
                    break
                    
    except WebSocketDisconnect as e:
        logger.info(f"Client {client_id} disconnected with code {e.code}: {e.reason}")
    except asyncio.CancelledError:
        logger.info(f"WebSocket connection was cancelled for {client_id}")
        raise
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {str(e)}", exc_info=True)
    finally:
        logger.info(f"Closing WebSocket connection for {client_id}")
        try:
            await manager.disconnect(client_id)
        except Exception as e:
            logger.error(f"Error during WebSocket cleanup for {client_id}: {str(e)}")
            # Ensure we don't mask the original exception if there was one
            if not isinstance(e, asyncio.CancelledError):
                raise
        logger.info(f"WebSocket connection closed for {client_id}")
    
    return None