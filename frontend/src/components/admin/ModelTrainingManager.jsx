import React, { useState, useEffect, useMemo } from "react";
import {
  BrainCircuit,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  StopCircle,
  Eye,
  GitCompare,
  Trash2,
  Maximize2,
  Search,
  RefreshCw,
  Layers,
  Check,
  Award,
  BarChart3,
  Flame
} from "lucide-react";

export default function ModelTrainingManager({ apiUrl, token, showToast, onModelActivated }) {
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRunIds, setSelectedRunIds] = useState([]);
  const [activeRunDetail, setActiveRunDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [subTab, setSubTab] = useState("dashboard");

  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModelType, setFilterModelType] = useState("ALL");
  const [filterDataset, setFilterDataset] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const [showNewTrainModal, setShowNewTrainModal] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [trainConfig, setTrainConfig] = useState({
    model_type: "LSTM",
    dataset_id: "Dataset-v1",
    epochs: 25,
    batch_size: 16,
    learning_rate: 0.001,
    sequence_length: 30,
    test_size: 0.2,
    labels: []
  });

  const [zoomCm, setZoomCm] = useState(null);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterModelType !== "ALL") params.append("model_type", filterModelType);
      if (filterDataset !== "ALL") params.append("dataset_id", filterDataset);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

      const res = await fetch(`${apiUrl}/api/v1/training/runs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch (err) {
      console.error("Gagal memuat riwayat training:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [searchQuery, filterModelType, filterDataset, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    let interval = null;
    if (isTraining) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${apiUrl}/api/v1/training/status`);
          if (res.ok) {
            const st = await res.json();
            setTrainingProgress(st.progress || 0);
            if (st.logs && st.logs.length > 0) {
              setTrainingLogs(st.logs);
            }
            if (!st.is_running && (st.status === "completed" || st.status === "failed")) {
              setIsTraining(false);
              fetchRuns();
              if (st.status === "completed" && st.run_id) {
                showToast(`Training ${st.model_version || ''} Selesai!`, "success");
                loadRunDetail(st.run_id);
              } else if (st.status === "failed") {
                showToast("Training gagal atau dihentikan", "error");
              }
            }
          }
        } catch (e) {
          console.error("Error polling training status:", e);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTraining]);

  const loadRunDetail = async (runId) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/training/runs/${runId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRunDetail(data);
        setSubTab("detail");
      } else {
        showToast("Gagal memuat rincian training run", "error");
      }
    } catch (err) {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCompareSelected = async () => {
    if (selectedRunIds.length < 2) {
      showToast("Pilih minimal 2 Training Run untuk dibandingkan!", "error");
      return;
    }
    setLoadingComparison(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/training/compare?run_ids=${selectedRunIds.join(",")}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
        setSubTab("compare");
      } else {
        showToast("Gagal membandingkan model yang dipilih", "error");
      }
    } catch (err) {
      showToast("Gagal mengambil data komparasi", "error");
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleSetActiveModel = async (runId, modelVer) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/training/runs/${runId}/set-active`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        showToast(`Model ${modelVer} berhasil dijadikan active production model!`, "success");
        fetchRuns();
        if (activeRunDetail && activeRunDetail.id === runId) {
          setActiveRunDetail({ ...activeRunDetail, is_active: 1 });
        }
        if (onModelActivated) onModelActivated();
      } else {
        showToast("Gagal mengatur active model", "error");
      }
    } catch (e) {
      showToast("Gagal menghubungi server", "error");
    }
  };

  const handleDeleteRun = async (runId) => {
    if (!window.confirm(`Hapus data riwayat Training Run ${runId}?`)) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/training/runs/${runId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        showToast("Training Run berhasil dihapus", "success");
        fetchRuns();
        if (activeRunDetail?.id === runId) {
          setActiveRunDetail(null);
          setSubTab("dashboard");
        }
      }
    } catch (e) {
      showToast("Gagal menghapus training run", "error");
    }
  };

  const handleStartTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingLogs(["Memulai proses training..."]);
    try {
      const res = await fetch(`${apiUrl}/api/v1/training/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(trainConfig)
      });
      if (res.ok) {
        showToast("Training berhasil dimulai di server!", "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Gagal memulai training", "error");
        setIsTraining(false);
      }
    } catch (e) {
      showToast("Koneksi gagal", "error");
      setIsTraining(false);
    }
  };

  const handleStopTraining = async () => {
    try {
      await fetch(`${apiUrl}/api/v1/training/stop`, { method: "POST" });
      showToast("Perintah stop dikirim", "info");
      setIsTraining(false);
    } catch (e) {
      showToast("Gagal menghentikan training", "error");
    }
  };

  const toggleSelectRun = (id) => {
    if (selectedRunIds.includes(id)) {
      setSelectedRunIds(selectedRunIds.filter(r => r !== id));
    } else {
      if (selectedRunIds.length >= 4) {
        showToast("Maksimal 4 model untuk perbandingan", "info");
        return;
      }
      setSelectedRunIds([...selectedRunIds, id]);
    }
  };

  const activeModelRun = useMemo(() => {
    return runs.find(r => r.is_active === 1) || null;
  }, [runs]);

  const filteredRuns = useMemo(() => {
    if (!filterDate) return runs;
    return runs.filter(r => {
      const d = r.created_at || r.started_at || "";
      return d.startsWith(filterDate);
    });
  }, [runs, filterDate]);

  return (
    <div className="flex flex-col gap-6 text-slate-800">
      {/* ── TOP BANNER: ACTIVE PRODUCTION MODEL ── */}
      <div className="relative overflow-hidden rounded-[28px] border border-sky-200/80 bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-950 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10">
          <BrainCircuit size={280} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-400/20 border border-sky-400/30 backdrop-blur-md">
              <Award className="text-amber-300 animate-bounce" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Model Produksi Aktif
                </span>
                <span className="text-[10px] font-mono text-sky-200">
                  {activeModelRun?.dataset_id || "Dataset-v2"}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-1">
                {activeModelRun ? `${activeModelRun.model_version} (${activeModelRun.model_type})` : "medsign_mvp_v1 (GRU)"}
              </h2>
              <p className="text-xs text-sky-100/80 font-medium mt-0.5">
                Model yang aktif melayani inferensi translasi BISINDO saat ini.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 md:border-l border-white/15 pt-3 md:pt-0 md:pl-6">
            <div className="flex flex-col">
              <span className="text-[9.5px] uppercase tracking-wider font-bold text-sky-200/70">Test Accuracy</span>
              <span className="text-2xl font-black text-amber-300">
                {activeModelRun?.test_accuracy ? `${(activeModelRun.test_accuracy * 100).toFixed(2)}%` : "95.10%"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9.5px] uppercase tracking-wider font-bold text-sky-200/70">F1 Score</span>
              <span className="text-2xl font-black text-white">
                {activeModelRun?.f1_score ? `${(activeModelRun.f1_score * 100).toFixed(2)}%` : "95.05%"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9.5px] uppercase tracking-wider font-bold text-sky-200/70">Test Loss</span>
              <span className="text-2xl font-black text-emerald-300">
                {activeModelRun?.test_loss ? Number(activeModelRun.test_loss).toFixed(4) : "0.1850"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUB-NAVIGATION TABS ── */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setSubTab("dashboard")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              subTab === "dashboard"
                ? "bg-white text-sky-900 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={14} /> Riwayat & Evaluasi Training
            <span className="ml-1 px-1.5 py-0.2 rounded-md bg-slate-200/80 text-[10px] font-mono font-bold">
              {runs.length}
            </span>
          </button>

          {activeRunDetail && (
            <button
              onClick={() => setSubTab("detail")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                subTab === "detail"
                  ? "bg-white text-sky-900 shadow-sm border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye size={14} /> Detail: {activeRunDetail.model_version}
            </button>
          )}

          {comparisonData && (
            <button
              onClick={() => setSubTab("compare")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                subTab === "compare"
                  ? "bg-white text-sky-900 shadow-sm border border-slate-200/50"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GitCompare size={14} /> Komparasi ({comparisonData.runs?.length || 0})
            </button>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedRunIds.length >= 2 && (
            <button
              onClick={handleCompareSelected}
              disabled={loadingComparison}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
            >
              <GitCompare size={14} />
              {loadingComparison ? "Memuat..." : `Bandingkan (${selectedRunIds.length}) Model`}
            </button>
          )}

          <button
            onClick={() => setShowNewTrainModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
          >
            <Play size={14} fill="currentColor" /> Mulai Training Run Baru
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SUBTAB 1: TRAINING RUNS DASHBOARD & HISTORY
         ═══════════════════════════════════════════════════════════════ */}
      {subTab === "dashboard" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative md:col-span-2">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID run, versi, atau dataset..."
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={filterModelType}
                onChange={(e) => setFilterModelType(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              >
                <option value="ALL">Semua Model</option>
                <option value="LSTM">Model LSTM</option>
                <option value="GRU">Model GRU</option>
              </select>
            </div>

            <div>
              <select
                value={filterDataset}
                onChange={(e) => setFilterDataset(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              >
                <option value="ALL">Semua Dataset</option>
                <option value="Dataset-v1">Dataset-v1</option>
                <option value="Dataset-v2">Dataset-v2</option>
              </select>
            </div>

            <div>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              >
                <option value="created_at">Waktu Training</option>
                <option value="test_accuracy">Akurasi Tertinggi</option>
                <option value="f1_score">F1-Score Tertinggi</option>
                <option value="train_accuracy">Train Acc</option>
                <option value="test_loss">Loss Terendah</option>
                <option value="duration">Durasi</option>
              </select>
            </div>
          </div>

          {/* Runs Table */}
          <div className="overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5 w-8">
                      <input
                        type="checkbox"
                        checked={selectedRunIds.length > 0 && selectedRunIds.length === filteredRuns.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRunIds(filteredRuns.map(r => r.id));
                          else setSelectedRunIds([]);
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                    </th>
                    <th className="p-3.5">Version & ID</th>
                    <th className="p-3.5">Model</th>
                    <th className="p-3.5">Dataset</th>
                    <th className="p-3.5">Test Accuracy</th>
                    <th className="p-3.5">F1 Score</th>
                    <th className="p-3.5">Test Loss</th>
                    <th className="p-3.5">Waktu Training</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRuns ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                        <RefreshCw size={18} className="animate-spin inline mr-2 text-sky-600" />
                        Memuat riwayat pelatihan...
                      </td>
                    </tr>
                  ) : filteredRuns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                        Tidak ada Training Run yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRuns.map((r) => {
                      const isSelected = selectedRunIds.includes(r.id);
                      const isActiveModel = r.is_active === 1;

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-sky-50/40 transition-colors ${isSelected ? "bg-sky-50/60" : ""}`}
                        >
                          <td className="p-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRun(r.id)}
                              className="rounded text-sky-600 focus:ring-sky-500"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{r.model_version}</span>
                              {isActiveModel && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[160px]" title={r.id}>
                              {r.id}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                r.model_type === "LSTM"
                                  ? "bg-violet-100 text-violet-800 border border-violet-200"
                                  : "bg-sky-100 text-sky-800 border border-sky-200"
                              }`}
                            >
                              {r.model_type}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-slate-600">{r.dataset_id}</td>
                          <td className="p-3.5">
                            {r.test_accuracy !== null && r.test_accuracy !== undefined ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900">
                                  {(r.test_accuracy * 100).toFixed(1)}%
                                </span>
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${Math.min(100, r.test_accuracy * 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-700">
                            {r.f1_score !== null && r.f1_score !== undefined
                              ? `${(r.f1_score * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600">
                            {r.test_loss !== null && r.test_loss !== undefined
                              ? Number(r.test_loss).toFixed(4)
                              : "-"}
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {r.created_at ? r.created_at.replace("T", " ").slice(0, 16) : "-"}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                                r.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : r.status === "running"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {r.status === "completed" ? (
                                <CheckCircle2 size={10} />
                              ) : r.status === "running" ? (
                                <Activity size={10} className="animate-spin" />
                              ) : (
                                <XCircle size={10} />
                              )}
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => loadRunDetail(r.id)}
                                title="Lihat detail lengkap training run"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-all"
                              >
                                <Eye size={14} />
                              </button>

                              {!isActiveModel && r.status === "completed" && (
                                <button
                                  onClick={() => handleSetActiveModel(r.id, r.model_version)}
                                  title="Gunakan model ini sebagai active production"
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9.5px] font-black uppercase border border-emerald-200 transition-all active:scale-95"
                                >
                                  Gunakan
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteRun(r.id)}
                                title="Hapus riwayat run ini"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUBTAB 2: TRAINING RUN DETAIL VIEW
         ═══════════════════════════════════════════════════════════════ */}
      {subTab === "detail" && activeRunDetail && (
        <div className="flex flex-col gap-6 animate-slide-up">
          {/* Header Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-black text-slate-900">
                  {activeRunDetail.model_version} ({activeRunDetail.model_type})
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    activeRunDetail.status === "completed"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  {activeRunDetail.status}
                </span>
                {activeRunDetail.is_active === 1 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                    Active Production Model
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-1">
                <span>Training ID: <strong className="font-mono">{activeRunDetail.id}</strong></span>
                <span>Dataset: <strong>{activeRunDetail.dataset_id}</strong></span>
                <span>Waktu: <strong>{activeRunDetail.created_at?.slice(0, 16).replace("T", " ")}</strong></span>
                <span>Durasi: <strong>{activeRunDetail.duration || 0} detik</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeRunDetail.is_active !== 1 && activeRunDetail.status === "completed" && (
                <button
                  onClick={() => handleSetActiveModel(activeRunDetail.id, activeRunDetail.model_version)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all"
                >
                  Gunakan Model Ini
                </button>
              )}

              {/* Download Report */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5">Ekspor:</span>
                <a
                  href={`${apiUrl}/api/v1/training/runs/${activeRunDetail.id}/report?format=pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-white hover:bg-slate-50 text-rose-600 rounded-lg text-[10px] font-black shadow-xs"
                >
                  PDF
                </a>
                <a
                  href={`${apiUrl}/api/v1/training/runs/${activeRunDetail.id}/report?format=excel`}
                  className="px-2 py-1 bg-white hover:bg-slate-50 text-emerald-700 rounded-lg text-[10px] font-black shadow-xs"
                >
                  Excel
                </a>
                <a
                  href={`${apiUrl}/api/v1/training/runs/${activeRunDetail.id}/report?format=docx`}
                  className="px-2 py-1 bg-white hover:bg-slate-50 text-sky-700 rounded-lg text-[10px] font-black shadow-xs"
                >
                  DOCX
                </a>
              </div>

              <button
                onClick={() => setSubTab("dashboard")}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Kembali
              </button>
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
              <span className="text-[9.5px] uppercase font-bold text-slate-400">Test Accuracy</span>
              <span className="text-2xl font-black text-sky-700 mt-1">
                {activeRunDetail.test_accuracy ? `${(activeRunDetail.test_accuracy * 100).toFixed(2)}%` : "-"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Holdout Test Set</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
              <span className="text-[9.5px] uppercase font-bold text-slate-400">Precision (Macro)</span>
              <span className="text-2xl font-black text-indigo-700 mt-1">
                {activeRunDetail.precision ? `${(activeRunDetail.precision * 100).toFixed(2)}%` : "-"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Macro Average</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
              <span className="text-[9.5px] uppercase font-bold text-slate-400">Recall (Macro)</span>
              <span className="text-2xl font-black text-emerald-700 mt-1">
                {activeRunDetail.recall ? `${(activeRunDetail.recall * 100).toFixed(2)}%` : "-"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Macro Average</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
              <span className="text-[9.5px] uppercase font-bold text-slate-400">F1-Score</span>
              <span className="text-2xl font-black text-purple-700 mt-1">
                {activeRunDetail.f1_score ? `${(activeRunDetail.f1_score * 100).toFixed(2)}%` : "-"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Harmonic Mean</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
              <span className="text-[9.5px] uppercase font-bold text-slate-400">Test Loss</span>
              <span className="text-2xl font-black text-amber-600 mt-1">
                {activeRunDetail.test_loss ? Number(activeRunDetail.test_loss).toFixed(4) : "-"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Categorical Crossentropy</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
              <span className="text-[9.5px] uppercase font-bold text-slate-400">Train vs Val Acc</span>
              <span className="text-xl font-black text-slate-800 mt-1">
                {activeRunDetail.train_accuracy ? `${(activeRunDetail.train_accuracy * 100).toFixed(1)}%` : "-"} / {activeRunDetail.val_accuracy ? `${(activeRunDetail.val_accuracy * 100).toFixed(1)}%` : "-"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Final Epoch Convergence</span>
            </div>
          </div>

          {/* Charts: Accuracy & Loss Curves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-sky-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Accuracy Curve (Train vs Validation)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1 text-sky-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> Train Acc
                  </span>
                  <span className="inline-flex items-center gap-1 text-indigo-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Val Acc
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <EpochLineChart
                  history={activeRunDetail.history || []}
                  metric1Key="train_accuracy"
                  metric2Key="val_accuracy"
                  color1="#0284c7"
                  color2="#4f46e5"
                  yFormat="percent"
                />
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-amber-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Loss Curve (Train vs Validation)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Train Loss
                  </span>
                  <span className="inline-flex items-center gap-1 text-rose-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Val Loss
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <EpochLineChart
                  history={activeRunDetail.history || []}
                  metric1Key="train_loss"
                  metric2Key="val_loss"
                  color1="#f59e0b"
                  color2="#f43f5e"
                  yFormat="number"
                />
              </div>
            </div>
          </div>

          {/* Confusion Matrix Section */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <BrainCircuit size={16} className="text-sky-600" /> Confusion Matrix Heatmap (Actual vs Predicted)
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  Sumbu Y: Actual (Ground Truth), Sumbu X: Predicted
                </span>
              </div>
              {activeRunDetail.confusion_matrix && (
                <button
                  onClick={() => setZoomCm({
                    ...activeRunDetail.confusion_matrix,
                    model_version: activeRunDetail.model_version
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase shadow-xs transition-all"
                >
                  <Maximize2 size={13} /> Perbesar Heatmap
                </button>
              )}
            </div>

            {activeRunDetail.confusion_matrix ? (
              <div className="overflow-x-auto p-2">
                <ConfusionMatrixHeatmap
                  classLabels={activeRunDetail.confusion_matrix.class_labels || []}
                  matrixData={activeRunDetail.confusion_matrix.matrix_data || []}
                />
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Data Confusion Matrix tidak tersedia untuk run ini.
              </div>
            )}
          </div>

          {/* Classification Report & Epoch History Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                Multiclass Classification Metrics (Per Kelas)
              </h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9.5px] tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5">Class</th>
                      <th className="p-2.5">Precision</th>
                      <th className="p-2.5">Recall</th>
                      <th className="p-2.5">F1-Score</th>
                      <th className="p-2.5">Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeRunDetail.classification_report?.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-black text-slate-900 uppercase text-[11px]">{c.class_name}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{(c.precision * 100).toFixed(1)}%</td>
                        <td className="p-2.5 font-semibold text-slate-700">{(c.recall * 100).toFixed(1)}%</td>
                        <td className="p-2.5 font-black text-sky-700">{(c.f1_score * 100).toFixed(1)}%</td>
                        <td className="p-2.5 font-mono text-slate-500">{c.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                Epoch Training History Log
              </h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9.5px] tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5">Epoch</th>
                      <th className="p-2.5">Train Loss</th>
                      <th className="p-2.5">Val Loss</th>
                      <th className="p-2.5">Train Acc</th>
                      <th className="p-2.5">Val Acc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {activeRunDetail.history?.map((h) => (
                      <tr key={h.epoch} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-slate-900">#{h.epoch}</td>
                        <td className="p-2.5 text-amber-700">{Number(h.train_loss).toFixed(4)}</td>
                        <td className="p-2.5 text-rose-700">{Number(h.val_loss).toFixed(4)}</td>
                        <td className="p-2.5 text-sky-700">{(h.train_accuracy * 100).toFixed(2)}%</td>
                        <td className="p-2.5 text-indigo-700">{(h.val_accuracy * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Hyperparameters & Split Info */}
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 flex flex-col gap-3 text-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Konfigurasi Training & Hyperparameter
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Dataset</span>
                <span className="block font-black text-slate-800">{activeRunDetail.dataset_id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Epochs</span>
                <span className="block font-black text-slate-800">{activeRunDetail.epochs}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Batch Size</span>
                <span className="block font-black text-slate-800">{activeRunDetail.batch_size}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Learning Rate</span>
                <span className="block font-black text-slate-800">{activeRunDetail.learning_rate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Sequence Length</span>
                <span className="block font-black text-slate-800">{activeRunDetail.sequence_length || 30} Frames</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Data Split Samples</span>
                <span className="block font-black text-slate-800">
                  {activeRunDetail.num_train_samples || 0} / {activeRunDetail.num_val_samples || 0} / {activeRunDetail.num_test_samples || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SUBTAB 3: SUPER ADMIN — MODEL COMPARISON
         ═══════════════════════════════════════════════════════════════ */}
      {subTab === "compare" && comparisonData && (
        <div className="flex flex-col gap-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <GitCompare className="text-indigo-600" size={20} />
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Super Admin — Model Comparison Dashboard
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Membandingkan performa arsitektur model ({comparisonData.runs?.map(r => r.model_version).join(", ")}) secara berdampingan.
              </p>
            </div>
            <button
              onClick={() => setSubTab("dashboard")}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Kembali ke Daftar
            </button>
          </div>

          {/* Metric Comparison Table */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Tabel Komparasi Metrik Antar Model
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5 w-1/4">Metrik Evaluasi</th>
                    {comparisonData.runs?.map((r) => (
                      <th key={r.id} className="p-3.5 text-center">
                        <span className="font-black text-slate-900 text-sm block">{r.model_version}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{r.model_type} ({r.dataset_id})</span>
                        {r.is_active === 1 && (
                          <span className="mt-1 inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                            Active Model
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonData.comparison_table?.map((row, idx) => {
                    const vals = Object.values(row.values || {}).map(Number);
                    const maxVal = Math.max(...vals.filter(v => !isNaN(v)));
                    const minVal = Math.min(...vals.filter(v => !isNaN(v)));

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-700">{row.metric}</td>
                        {comparisonData.runs?.map((r) => {
                          const val = row.values[r.id];
                          const numVal = Number(val);
                          const isBest = row.key === "test_loss" ? numVal === minVal : numVal === maxVal;

                          let display = "-";
                          if (val !== null && val !== undefined) {
                            if (row.format === "percent") display = `${(val * 100).toFixed(2)}%`;
                            else if (row.format === "number") display = Number(val).toFixed(4);
                            else if (row.format === "seconds") display = `${val}s`;
                            else display = val;
                          }

                          return (
                            <td
                              key={r.id}
                              className={`p-3.5 text-center font-semibold ${
                                isBest ? "text-emerald-700 font-black bg-emerald-50/50" : "text-slate-800"
                              }`}
                            >
                              {display}
                              {isBest && <span className="ml-1 text-[10px] text-emerald-600 font-black">★</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Comparison: Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Perbandingan Akurasi & F1-Score (Bar Chart)
                  </h4>
                </div>
              </div>
              <div className="h-64 w-full">
                <ComparisonBarChart runs={comparisonData.runs || []} />
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Perbandingan Test Loss (Lebih Rendah Lebih Baik)
                  </h4>
                </div>
              </div>
              <div className="h-64 w-full">
                <LossComparisonBarChart runs={comparisonData.runs || []} />
              </div>
            </div>
          </div>

          {/* Side-by-Side Confusion Matrices */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
              <BrainCircuit size={16} className="text-sky-600" />
              Perbandingan Confusion Matrix Berdampingan (Side-by-Side)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {comparisonData.runs?.map((r) => {
                const cmObj = comparisonData.confusion_matrices?.[r.id]?.confusion_matrix;
                return (
                  <div key={r.id} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-sm">
                        {r.model_version} ({r.model_type})
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        Acc: {r.test_accuracy ? `${(r.test_accuracy * 100).toFixed(1)}%` : "-"}
                      </span>
                    </div>

                    {cmObj ? (
                      <div className="overflow-x-auto">
                        <ConfusionMatrixHeatmap
                          classLabels={cmObj.class_labels || []}
                          matrixData={cmObj.matrix_data || []}
                          compact
                        />
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Data Confusion Matrix tidak ditemukan.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: LAUNCH NEW TRAINING RUN
         ═══════════════════════════════════════════════════════════════ */}
      {showNewTrainModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-scale-up flex flex-col gap-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Play size={18} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                    Mulai Sesi Pelatihan Model Baru
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Sistem otomatis mengalokasikan versi unik tanpa menimpa model sebelumnya.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowNewTrainModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1.5">
                  Arsitektur Model Neural Network
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTrainConfig({ ...trainConfig, model_type: "LSTM" })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      trainConfig.model_type === "LSTM"
                        ? "border-violet-500 bg-violet-50/50 text-violet-950 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">LSTM</span>
                      {trainConfig.model_type === "LSTM" && <Check size={16} className="text-violet-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Long Short-Term Memory. Kuat mengingat dependensi sequence gestur jangka panjang.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrainConfig({ ...trainConfig, model_type: "GRU" })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      trainConfig.model_type === "GRU"
                        ? "border-sky-500 bg-sky-50/50 text-sky-950 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">GRU</span>
                      {trainConfig.model_type === "GRU" && <Check size={16} className="text-sky-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Gated Recurrent Unit. Lebih cepat konvergen dan efisien untuk inferensi klinis real-time.
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dataset</label>
                  <select
                    value={trainConfig.dataset_id}
                    onChange={(e) => setTrainConfig({ ...trainConfig, dataset_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Dataset-v1">Dataset-v1 (MVP)</option>
                    <option value="Dataset-v2">Dataset-v2 (Clinical Full)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Epochs ({trainConfig.epochs})
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={200}
                    value={trainConfig.epochs}
                    onChange={(e) => setTrainConfig({ ...trainConfig, epochs: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Batch Size</label>
                  <select
                    value={trainConfig.batch_size}
                    onChange={(e) => setTrainConfig({ ...trainConfig, batch_size: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={16}>16 (Optimal)</option>
                    <option value={32}>32</option>
                    <option value={64}>64</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Learning Rate</label>
                  <select
                    value={trainConfig.learning_rate}
                    onChange={(e) => setTrainConfig({ ...trainConfig, learning_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={0.001}>0.001 (Default)</option>
                    <option value={0.0005}>0.0005</option>
                    <option value={0.002}>0.002</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sequence Window</label>
                  <input
                    type="number"
                    value={trainConfig.sequence_length}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Test Split Ratio</label>
                  <select
                    value={trainConfig.test_size}
                    onChange={(e) => setTrainConfig({ ...trainConfig, test_size: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={0.2}>20% Test (80% Train/Val)</option>
                    <option value={0.15}>15% Test</option>
                    <option value={0.25}>25% Test</option>
                  </select>
                </div>
              </div>

              {isTraining && (
                <div className="flex flex-col gap-2 p-4 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-black text-sky-400 flex items-center gap-2">
                      <RefreshCw size={12} className="animate-spin" /> Training Sedang Berjalan...
                    </span>
                    <span className="font-mono text-amber-300 font-bold">{trainingProgress}%</span>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>

                  <div className="h-32 overflow-y-auto font-mono text-[10px] text-slate-400 bg-black/40 p-2 rounded-lg border border-slate-800/80">
                    {trainingLogs.slice(-20).map((line, i) => (
                      <div key={i} className="truncate">{line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowNewTrainModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Batal
              </button>

              {isTraining ? (
                <button
                  type="button"
                  onClick={handleStopTraining}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase shadow-sm"
                >
                  <StopCircle size={14} /> Hentikan Training
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTraining}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black text-xs uppercase shadow-md active:scale-95 transition-all"
                >
                  <Play size={14} fill="currentColor" /> Eksekusi Training Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: LARGE ZOOM CONFUSION MATRIX
         ═══════════════════════════════════════════════════════════════ */}
      {zoomCm && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[250] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-4xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-scale-up my-6 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                  Confusion Matrix Detail — {zoomCm.model_version}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  Visualisasi Heatmap Beresolusi Penuh (Actual vs Predicted)
                </span>
              </div>
              <button
                onClick={() => setZoomCm(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="overflow-auto p-2 max-h-[70vh]">
              <ConfusionMatrixHeatmap
                classLabels={zoomCm.class_labels || []}
                matrixData={zoomCm.matrix_data || []}
                large
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setZoomCm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SVG ACCURACY & LOSS LINE CHART
// ════════════════════════════════════════════════════════════════════════════
function EpochLineChart({ history, metric1Key, metric2Key, color1, color2, yFormat = "percent" }) {
  if (!history || history.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-300 text-xs font-semibold">Tidak ada riwayat epoch</div>;
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const width = 500;
  const height = 240;

  const epochs = history.map(h => h.epoch);
  const m1Vals = history.map(h => Number(h[metric1Key]) || 0);
  const m2Vals = history.map(h => Number(h[metric2Key]) || 0);

  const minVal = Math.min(...m1Vals, ...m2Vals);
  const maxVal = Math.max(...m1Vals, ...m2Vals);

  const yMin = yFormat === "percent" ? Math.max(0, Math.floor(minVal * 10) / 10 - 0.05) : Math.max(0, minVal * 0.9);
  const yMax = yFormat === "percent" ? Math.min(1.0, Math.ceil(maxVal * 10) / 10 + 0.05) : maxVal * 1.1;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (idx) => padding.left + (idx / Math.max(1, epochs.length - 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - yMin) / Math.max(0.001, yMax - yMin)) * chartH;

  const points1 = m1Vals.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");
  const points2 = m2Vals.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const yVal = yMin + pct * (yMax - yMin);
        const yPos = getY(yVal);
        return (
          <g key={i}>
            <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
            <text x={padding.left - 6} y={yPos + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
              {yFormat === "percent" ? `${(yVal * 100).toFixed(0)}%` : yVal.toFixed(2)}
            </text>
          </g>
        );
      })}

      <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="#cbd5e1" strokeWidth="1" />
      {epochs.map((ep, i) => {
        if (epochs.length > 15 && i % Math.ceil(epochs.length / 8) !== 0 && i !== epochs.length - 1) return null;
        return (
          <text key={ep} x={getX(i)} y={height - 10} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="monospace">
            {ep}
          </text>
        );
      })}

      <polyline fill="none" stroke={color1} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points1} />
      <polyline fill="none" stroke={color2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points2} strokeDasharray="4 2" />

      {m1Vals.length > 0 && (
        <circle cx={getX(m1Vals.length - 1)} cy={getY(m1Vals[m1Vals.length - 1])} r="4" fill={color1} />
      )}
      {m2Vals.length > 0 && (
        <circle cx={getX(m2Vals.length - 1)} cy={getY(m2Vals[m2Vals.length - 1])} r="4" fill={color2} />
      )}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HEATMAP CONFUSION MATRIX VISUALIZER
// ════════════════════════════════════════════════════════════════════════════
function ConfusionMatrixHeatmap({ classLabels = [], matrixData = [], compact = false, large = false }) {
  if (!matrixData || matrixData.length === 0 || !classLabels || classLabels.length === 0) {
    return <div className="text-center py-6 text-slate-300 text-xs">Data matriks belum tersedia</div>;
  }

  let maxCell = 1;
  matrixData.forEach(row => {
    row.forEach(val => {
      if (val > maxCell) maxCell = val;
    });
  });

  const cellSize = large ? "w-14 h-14 text-xs" : compact ? "w-7 h-7 text-[9px]" : "w-10 h-10 text-[10px]";

  return (
    <div className="flex flex-col items-start select-none">
      <div className="flex items-center ml-24 mb-1">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
          Predicted (Prediksi Model) →
        </span>
      </div>

      <div className="flex items-start">
        <div className="flex flex-col justify-center items-center mr-2 w-6">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider -rotate-90 whitespace-nowrap">
            Actual (Label Nyata)
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center ml-20">
            {classLabels.map((lbl, j) => (
              <div
                key={j}
                className={`${large ? "w-14" : compact ? "w-7" : "w-10"} text-center truncate px-0.5 text-[9px] font-bold text-slate-500 uppercase -rotate-45 origin-bottom-left`}
                title={lbl}
              >
                {lbl}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-0.5 mt-2">
            {matrixData.map((row, i) => (
              <div key={i} className="flex items-center gap-0.5">
                <div className="w-20 text-right pr-2 text-[10px] font-bold text-slate-700 uppercase truncate" title={classLabels[i]}>
                  {classLabels[i] || `K-${i}`}
                </div>

                {row.map((count, j) => {
                  const isDiag = i === j;
                  const ratio = maxCell > 0 ? count / maxCell : 0;

                  let bgStyle = "";
                  if (isDiag) {
                    if (ratio > 0.7) bgStyle = "bg-sky-600 text-white font-black";
                    else if (ratio > 0.3) bgStyle = "bg-sky-400 text-white font-bold";
                    else bgStyle = "bg-sky-100 text-sky-900 font-bold";
                  } else {
                    if (count > 0) bgStyle = "bg-rose-100 text-rose-800 font-semibold";
                    else bgStyle = "bg-slate-50 text-slate-300";
                  }

                  return (
                    <div
                      key={j}
                      title={`Actual: ${classLabels[i]} | Predicted: ${classLabels[j]} | Jumlah: ${count}`}
                      className={`${cellSize} rounded flex items-center justify-center transition-transform hover:scale-110 hover:z-20 cursor-pointer shadow-xs ${bgStyle}`}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISUAL COMPARISON BAR CHARTS
// ════════════════════════════════════════════════════════════════════════════
function ComparisonBarChart({ runs = [] }) {
  const metrics = ["Test Accuracy", "F1 Score", "Precision", "Recall"];
  const colors = ["#0284c7", "#4f46e5", "#8b5cf6", "#059669"];

  return (
    <div className="w-full h-full flex flex-col justify-between py-2">
      <div className="flex-1 flex items-end gap-6 justify-around border-b border-slate-200 pb-2">
        {metrics.map((m) => {
          const key = m === "Test Accuracy" ? "test_accuracy" : m === "F1 Score" ? "f1_score" : m === "Precision" ? "precision" : "recall";

          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full flex items-end justify-center gap-1.5 h-44">
                {runs.map((r, rIdx) => {
                  const val = Number(r[key]) || 0;
                  const hPct = Math.min(100, Math.max(10, val * 100));

                  return (
                    <div key={r.id} className="flex-1 max-w-[28px] flex flex-col items-center h-full justify-end group relative">
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                        {r.model_version}: {(val * 100).toFixed(1)}%
                      </div>
                      <div
                        className="w-full rounded-t transition-all duration-500 shadow-xs"
                        style={{
                          height: `${hPct}%`,
                          backgroundColor: colors[rIdx % colors.length]
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">{m}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap text-[10px] font-bold">
        {runs.map((r, rIdx) => (
          <div key={r.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[rIdx % colors.length] }}
            />
            <span className="text-slate-700">{r.model_version} ({r.model_type})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LossComparisonBarChart({ runs = [] }) {
  const colors = ["#f59e0b", "#f43f5e", "#ec4899", "#8b5cf6"];
  const losses = runs.map(r => Number(r.test_loss) || 0);
  const maxLoss = Math.max(0.5, ...losses);

  return (
    <div className="w-full h-full flex flex-col justify-between py-2">
      <div className="flex-1 flex items-end justify-around gap-4 border-b border-slate-200 pb-2 h-44">
        {runs.map((r, rIdx) => {
          const val = Number(r.test_loss) || 0;
          const hPct = Math.min(100, Math.max(8, (val / maxLoss) * 100));

          return (
            <div key={r.id} className="flex-1 max-w-[48px] flex flex-col items-center h-full justify-end group relative">
              <div className="text-[10px] font-mono font-bold text-slate-600 mb-1">
                {val.toFixed(3)}
              </div>
              <div
                className="w-full rounded-t transition-all duration-500 shadow-xs"
                style={{
                  height: `${hPct}%`,
                  backgroundColor: colors[rIdx % colors.length]
                }}
              />
              <span className="text-[10px] font-black text-slate-700 uppercase mt-1 truncate max-w-full">
                {r.model_version}
              </span>
            </div>
          );
        })}
      </div>
      <span className="text-[10px] text-center text-slate-400 font-semibold mt-2">
        Kalkulasi Test Loss pada holdout partition yang sama
      </span>
    </div>
  );
}

