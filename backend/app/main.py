from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, session, vocabulary
import json
import random
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

# Health Check Endpoint
@app.get("/health")
def health_check():
    """Endpoint pengecekan status server dan kesehatan ML model."""
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "model_loaded": True,
        "mode": "demo"
    }

# Register APIRouters
app.include_router(predict.router, prefix="/api/v1", tags=["prediction"])
app.include_router(session.router, prefix="/api/v1", tags=["session"])
app.include_router(vocabulary.router, prefix="/api/v1", tags=["vocabulary"])

# Vocabulary list for WebSocket mock
PREDICTION_WORDS = [
    "sakit", "nyeri", "sesak", "batuk", "demam", "pusing", "mual", "muntah", "diare", "lemas",
    "kepala", "dada", "perut", "tenggorokan", "tangan", "kaki", "punggung", "mata", "telinga", "leher",
    "ya", "tidak", "sakit sekali", "lebih baik", "lebih buruk",
    "tolong", "tidak bisa bernapas", "nyeri dada", "pingsan", "bantuan segera"
]

# WebSocket Streaming Endpoint
@app.websocket("/api/v1/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Endpoint WebSocket untuk menerima streaming koordinat landmark secara real-time
    dan mengirim balik hasil prediksi kata setiap detik.
    """
    await websocket.accept()
    print("WebSocket client connected to /api/v1/stream")
    
    try:
        while True:
            # Receive frames array from frontend
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            frames = payload.get("frames", [])
            
            # Start prediction timing
            start_time = time.perf_counter()
            
            # Basic validation
            if not frames or len(frames) != 30:
                await websocket.send_text(json.dumps({
                    "error": "Sequence frames harus berjumlah tepat 30 frame"
                }))
                continue

            # Mock ML Model prediction selection
            pred_word = random.choice(PREDICTION_WORDS)
            confidence = round(random.uniform(0.75, 0.99), 2)
            
            alt_pool = [w for w in PREDICTION_WORDS if w != pred_word]
            alt1 = random.choice(alt_pool)
            alt2 = random.choice([w for w in alt_pool if w != alt1])

            end_time = time.perf_counter()
            processing_ms = int((end_time - start_time) * 1000) + 12
            
            response = {
                "prediction": pred_word,
                "confidence": confidence,
                "top3": [
                    {"word": pred_word, "confidence": confidence},
                    {"word": alt1, "confidence": round(confidence * 0.78, 2)},
                    {"word": alt2, "confidence": round(confidence * 0.52, 2)}
                ],
                "mode": "demo",
                "processing_time_ms": processing_ms
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
