import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.append(str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.db import (
    init_db,
    db_get_all_training_runs,
    db_get_training_run_detail,
    db_get_next_model_version,
    db_create_training_run,
    db_update_training_run,
    db_set_active_training_run,
    db_delete_training_run
)

client = TestClient(app)

def test_all():
    print("1. Inisialisasi DB...")
    init_db()

    print("2. Verifikasi daftar training runs...")
    res = client.get("/api/v1/training/runs")
    assert res.status_code == 200, f"Failed: {res.status_code}"
    data = res.json()
    assert data["total"] >= 4, f"Expected at least 4 runs, got {data['total']}"
    print(f"   [OK] Ditemukan {data['total']} training runs")

    runs = data["runs"]
    first_run_id = runs[0]["id"]
    second_run_id = runs[1]["id"]

    print("3. Verifikasi detail training run...")
    res_detail = client.get(f"/api/v1/training/runs/{first_run_id}")
    assert res_detail.status_code == 200, f"Failed: {res_detail.status_code}"
    det = res_detail.json()
    assert "test_accuracy" in det and det["test_accuracy"] is not None, "test_accuracy missing"
    assert "f1_score" in det and det["f1_score"] is not None, "f1_score missing"
    assert "precision" in det and det["precision"] is not None, "precision missing"
    assert "recall" in det and det["recall"] is not None, "recall missing"
    assert "history" in det and len(det["history"]) > 0, "history missing"
    assert "confusion_matrix" in det and det["confusion_matrix"] is not None, "confusion_matrix missing"
    assert len(det["confusion_matrix"]["class_labels"]) > 0, "class_labels empty"
    assert len(det["confusion_matrix"]["matrix_data"]) > 0, "matrix_data empty"
    assert "classification_report" in det and len(det["classification_report"]) > 0, "classification_report empty"
    print(f"   [OK] Detail run {first_run_id} lengkap (acc: {det['test_accuracy']}, f1: {det['f1_score']}, epochs: {len(det['history'])})")

    print("4. Verifikasi komparasi model...")
    res_comp = client.get(f"/api/v1/training/compare?run_ids={first_run_id},{second_run_id}")
    assert res_comp.status_code == 200, f"Failed: {res_comp.status_code}"
    comp = res_comp.json()
    assert len(comp["runs"]) == 2, "Expected 2 compared runs"
    assert len(comp["comparison_table"]) >= 8, f"Expected >= 8 metrics in comparison, got {len(comp['comparison_table'])}"
    assert first_run_id in comp["confusion_matrices"], "first confusion matrix missing"
    assert second_run_id in comp["confusion_matrices"], "second confusion matrix missing"
    print(f"   [OK] Komparasi model berhasil ({len(comp['comparison_table'])} metrik dibandingkan berdampingan)")

    print("5. Verifikasi perhitungan versi model baru (non-overwriting)...")
    lstm_next = db_get_next_model_version("LSTM")
    gru_next = db_get_next_model_version("GRU")
    assert lstm_next.startswith("LSTM-v"), f"Unexpected version: {lstm_next}"
    assert gru_next.startswith("GRU-v"), f"Unexpected version: {gru_next}"
    print(f"   [OK] Next versioning aman: {lstm_next} & {gru_next}")

    print("6. Verifikasi pengaturan Active Production Model...")
    res_active = client.post(f"/api/v1/training/runs/{second_run_id}/set-active")
    assert res_active.status_code == 200, f"Failed: {res_active.status_code}"
    act_data = res_active.json()
    assert act_data["status"] == "success", "Active setting failed"

    # Verifikasi status aktif di DB
    run_check = db_get_training_run_detail(second_run_id)
    assert run_check["is_active"] == 1, "Expected run to be active"
    print(f"   [OK] Model {run_check['model_version']} berhasil dijadikan model aktif")

    print("7. Verifikasi ekspor laporan...")
    for fmt in ["pdf", "excel", "docx"]:
        res_rep = client.get(f"/api/v1/training/runs/{first_run_id}/report?format={fmt}")
        assert res_rep.status_code == 200, f"Export {fmt} failed"
        assert len(res_rep.content) > 100, f"Export {fmt} content too small"
    print("   [OK] Ekspor laporan PDF, Excel, dan DOCX berfungsi")

    print("8. Verifikasi pencatatan status FAILED...")
    dummy_fail_id = "test_fail_run_001"
    db_create_training_run({
        "id": dummy_fail_id,
        "model_type": "LSTM",
        "model_version": "LSTM-v99",
        "dataset_id": "Dataset-v1",
        "status": "running",
        "epochs": 10,
        "batch_size": 16,
        "learning_rate": 0.001
    })
    db_update_training_run(dummy_fail_id, {
        "status": "failed",
        "error_message": "CUDA out of memory simulation test"
    })
    fail_detail = db_get_training_run_detail(dummy_fail_id)
    assert fail_detail["status"] == "failed", "Status should be failed"
    assert "CUDA" in fail_detail["error_message"], "Error message not recorded"
    db_delete_training_run(dummy_fail_id)
    print("   [OK] Pencatatan run status FAILED dan error message terverifikasi")

    print("\n=======================================================")
    print("SELURUH 8 CHECKPOINT ACCEPTANCE CRITERIA BERHASIL (100%)")
    print("=======================================================")

if __name__ == "__main__":
    test_all()
