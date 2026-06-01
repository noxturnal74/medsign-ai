from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, session, vocabulary
from app.services.slt_adapter import SLTAdapterService
import json
import time

app = FastAPI(
    title="MedSign AI API Backend",
    description="Sistem pendeteksi BISINDO klinis berbasis FastAPI dan Deep Learning",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared Adapter Service Singleton
slt_service = SLTAdapterService()

# Health Check Endpoint
@app.get("/health")
def health_check():
    """Endpoint pengecekan status server dan kesehatan ML model."""
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "model_loaded": True,
        "mode": "production" if slt_service.available else "demo"
    }

# Register APIRouters
app.include_router(predict.router, prefix="/api/v1", tags=["prediction"])
app.include_router(session.router, prefix="/api/v1", tags=["session"])
app.include_router(vocabulary.router, prefix="/api/v1", tags=["vocabulary"])

# WebSocket Streaming Endpoint
@app.websocket("/api/v1/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Endpoint WebSocket untuk menerima streaming koordinat landmark secara real-time
    dan mengirim balik hasil prediksi kata setiap detik menggunakan SLTAdapterService.
    """
    await websocket.accept()
    print("WebSocket client connected to /api/v1/stream")
    
    try:
        while True:
            # Receive frames array from frontend
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            frames = payload.get("frames", [])
            
            # Basic validation
            if not frames or len(frames) != 30:
                await websocket.send_text(json.dumps({
                    "error": "Sequence frames harus berjumlah tepat 30 frame"
                }))
                continue

            # Run prediction through SLTAdapterService
            result = slt_service.predict_bisindo(frames)
            
            # Apply confidence threshold (0.65 threshold constraint)
            prediction_word = result["prediction"]
            if result["confidence"] < 0.65:
                prediction_word = None
                
            response = {
                "prediction": prediction_word,
                "confidence": result["confidence"],
                "top3": result["top3"],
                "mode": result["mode"],
                "processing_time_ms": result["processing_time_ms"]
            }
            
            # Send prediction back to client
            await websocket.send_text(json.dumps(response))
            
    except WebSocketDisconnect:
        print("WebSocket client disconnected.")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
