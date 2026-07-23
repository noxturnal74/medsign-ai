from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routes import predict, session, vocabulary, data_collection, nlg
from app.services.slt_adapter import SLTAdapterService
from app.ml.labels import get_model_contract
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
    contract = get_model_contract()
    model_status = slt_service.status()
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "mode": model_status["mode"],
        "model_loaded": model_status["model_loaded"],
        "alphabet_loaded": model_status.get("alphabet_loaded", False),
        "labels_version": contract["version"],
        "label_count": model_status["label_count"],
        "threshold": model_status["threshold"],
        "frame_count": model_status["frame_count"],
        "feature_count": model_status["feature_count"],
        "input_shape": model_status["input_shape"],
        "output_class": model_status["output_class"],
        "model_path": model_status["model_path"],
    }

# Register APIRouters
app.include_router(predict.router, prefix="/api/v1", tags=["prediction"])
app.include_router(session.router, prefix="/api/v1", tags=["session"])
app.include_router(vocabulary.router, prefix="/api/v1", tags=["vocabulary"])
app.include_router(data_collection.router, prefix="/api/v1", tags=["data_collection"])
app.include_router(nlg.router, prefix="/api/v1", tags=["nlg"])

# WebSocket Streaming Endpoint
@app.websocket("/api/v1/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Endpoint WebSocket untuk menerima streaming koordinat landmark secara real-time
    dan mengirim balik hasil prediksi kata setiap detik menggunakan SLTAdapterService.
    """
    await websocket.accept()
    print("WebSocket client connected to /api/v1/stream")
    clinical_buffer = []

    try:
        while True:
            # Receive frames array from frontend
            data = await websocket.receive_text()
            payload = json.loads(data)

            mode = payload.get("mode", "clinical")

            if mode == "spelling":
                # Get the single frame landmarks
                landmarks = payload.get("landmarks", [])
                if not landmarks:
                    # Fallback: take last frame from frames if sent
                    frames = payload.get("frames", [])
                    if frames and len(frames) > 0:
                        landmarks = frames[-1]

                if not landmarks or len(landmarks) != 63:
                    await websocket.send_text(json.dumps({
                        "error": "Masukan landmarks untuk spelling mode harus berupa flat array berisi 63 koordinat"
                    }))
                    continue

                # Run static alphabet prediction
                result = slt_service.predict_spelling(landmarks)

                # Log spelling prediction for debugging
                print(f"[WS_STREAM] [SPELLING] Prediksi: '{result['prediction']}' | Confidence: {result['confidence']:.4f} | Mode: {result['mode']} | Waktu: {result['processing_time_ms']}ms")

                response = {
                    "prediction": result.get("prediction"),
                    "label": result.get("label"),
                    "raw_prediction": result.get("raw_prediction"),
                    "confidence": result["confidence"],
                    "top3": result["top3"],
                    "status": result.get("status", "not_detected"),
                    "detected": bool(result.get("detected", False)),
                    "mode": result["mode"],
                    "processing_time_ms": result["processing_time_ms"]
                }
            else:
                # Standard clinical mode
                frames = payload.get("frames")
                landmarks = payload.get("landmarks")
                if frames is None and landmarks is not None:
                    if len(landmarks) != 63:
                        await websocket.send_text(json.dumps({
                            "error": "Landmark stream harus berupa flat array 63 koordinat"
                        }))
                        continue
                    clinical_buffer.append(landmarks)
                    clinical_buffer = clinical_buffer[-30:]
                    if len(clinical_buffer) < 30:
                        await websocket.send_text(json.dumps({
                            "prediction": None,
                            "label": None,
                            "confidence": 0.0,
                            "top3": [],
                            "status": "not_detected",
                            "detected": False,
                            "mode": "buffering",
                            "buffered_frames": len(clinical_buffer),
                            "processing_time_ms": 0
                        }))
                        continue
                    frames = clinical_buffer

                if not frames or len(frames) != 30:
                    await websocket.send_text(json.dumps({
                        "error": "Sequence frames harus berjumlah tepat 30 frame"
                    }))
                    continue

                # Run prediction through SLTAdapterService
                result = slt_service.predict_bisindo(frames)

                # Log prediction to console for easy real-time debugging
                print(f"[WS_STREAM] [CLINICAL] Prediksi: '{result['prediction']}' | Confidence: {result['confidence']:.4f} | Mode: {result['mode']} | Waktu: {result['processing_time_ms']}ms")

                response = {
                    "prediction": result.get("prediction"),
                    "label": result.get("label"),
                    "raw_prediction": result.get("raw_prediction"),
                    "confidence": result["confidence"],
                    "top3": result["top3"],
                    "status": result.get("status", "not_detected"),
                    "detected": bool(result.get("detected", False)),
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
    # CATATAN: reload=False (sengaja dimatikan).
    # Di Windows dengan Python yang dikelola uv, reload=True menyebabkan
    # WatchFiles me-spawn worker baru via multiprocessing.spawn menggunakan
    # Python sistem/uv — bukan venv Python. Akibatnya TensorFlow tidak
    # tersedia di worker yang baru di-spawn, sehingga model tidak bisa dimuat
    # dan training subprocess gagal dengan "TensorFlow belum tersedia".
    # Solusi: matikan reload. Restart manual server jika ada perubahan kode.
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
