const fs = require('fs');
const path = require('path');

const patientPath = path.join(__dirname, 'frontend', 'src', 'pages', 'PatientView.jsx');
const doctorPath = path.join(__dirname, 'frontend', 'src', 'pages', 'DoctorView.jsx');

// 1. Patch PatientView.jsx
let patientContent = fs.readFileSync(patientPath, 'utf8').replace(/\r\n/g, '\n');

// Import TtsDashboardModal
const patientImportTarget = "import { VocabularyGuide } from '../components/VocabularyGuide';";
if (!patientContent.includes(patientImportTarget)) {
  console.error("PatientView import target not found!");
  process.exit(1);
}
patientContent = patientContent.replace(
  patientImportTarget,
  "import { VocabularyGuide } from '../components/VocabularyGuide';\nimport { TtsDashboardModal } from '../components/TtsDashboardModal';"
);

// Add showTtsModal state
const patientStateTarget = "  const [showGuideModal, setShowGuideModal] = useState(false);";
if (!patientContent.includes(patientStateTarget)) {
  console.error("PatientView state target not found!");
  process.exit(1);
}
patientContent = patientContent.replace(
  patientStateTarget,
  "  const [showGuideModal, setShowGuideModal] = useState(false);\n  const [showTtsModal, setShowTtsModal] = useState(false);"
);

// Regex for the entire Pilih Suara box in PatientView
const patientBoxRegex = /\{availableVoices\.length\s*>\s*0\s*&&\s*\(\s*<div className="flex flex-col gap-1\.5 bg-slate-50 border border-slate-200\/60 rounded-2xl p-3">[\s\S]*?Pilih Suara TTS \(Browser System & Open Source\)[\s\S]*?<\/div>\s*<\/div>\s*\)\}/m;

if (!patientBoxRegex.test(patientContent)) {
  console.error("PatientView box regex not matched!");
  process.exit(1);
}

const boxReplacement = `{availableVoices.length > 0 && (
                <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                  <div className="flex justify-between items-center border-b border-slate-200/40 pb-1.5 mb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pilih Suara Asisten TTS</span>
                    <button
                      type="button"
                      onClick={() => setShowTtsModal(true)}
                      className="text-[9px] font-black text-violet-600 hover:text-violet-850 hover:underline select-none"
                    >
                      ⚙️ Buka Dashboard &amp; Uji Suara
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                      className="glass-input rounded-xl px-2.5 py-1.5 text-[10px] font-black bg-white text-slate-700 cursor-pointer flex-grow border border-slate-200"
                    >
                      <option value="">-- Suara Default Indonesia --</option>
                      {availableVoices.map((voice, idx) => (
                        <option key={idx} value={voice.name}>
                          {getVoiceLabel(voice)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI."}
                      onClick={() => speak("Halo, ini adalah uji coba suara asisten MedSign AI.")}
                      className={\`inline-flex items-center justify-center rounded-xl font-bold text-[10px] py-1.5 px-3 shadow-sm active:scale-[0.98] transition-all shrink-0 \${
                        speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI."
                          ? "bg-emerald-600 text-white animate-pulse"
                          : "bg-violet-600 hover:bg-violet-700 text-white"
                      }\`}
                    >
                      {speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI." ? "Memutar..." : "Uji Suara"}
                    </button>
                  </div>
                  {speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI." && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200/50 rounded-xl flex items-center justify-between text-[9px] font-black text-emerald-800 uppercase animate-slide-up">
                      <span className="truncate">🔊 Menguji suara: "{speakingText}"</span>
                      <span className="shrink-0">{Math.round(speakingProgress)}%</span>
                    </div>
                  )}
                </div>
              )}`;

patientContent = patientContent.replace(patientBoxRegex, boxReplacement);

// Render modal at bottom
const patientBottomTarget = `      {/* Modal Panduan Isyarat */}
      {showGuideModal && (`;

const patientBottomReplacement = `      {/* Modal Dashboard & Uji Suara TTS */}
      <TtsDashboardModal isOpen={showTtsModal} onClose={() => setShowTtsModal(false)} />

      {/* Modal Panduan Isyarat */}
      {showGuideModal && (`;

const normalizedPatientBottomTarget = patientBottomTarget.replace(/\r\n/g, '\n');
if (!patientContent.includes(normalizedPatientBottomTarget)) {
  console.error("PatientView bottom target not found!");
  process.exit(1);
}
patientContent = patientContent.replace(normalizedPatientBottomTarget, patientBottomReplacement);
fs.writeFileSync(patientPath, patientContent, 'utf8');
console.log("Successfully patched PatientView.jsx");


// 2. Patch DoctorView.jsx
let doctorContent = fs.readFileSync(doctorPath, 'utf8').replace(/\r\n/g, '\n');

// Import TtsDashboardModal
const doctorImportTarget = "import { SessionLog } from '../components/SessionLog';";
if (!doctorContent.includes(doctorImportTarget)) {
  console.error("DoctorView import target not found!");
  process.exit(1);
}
doctorContent = doctorContent.replace(
  doctorImportTarget,
  "import { SessionLog } from '../components/SessionLog';\nimport { TtsDashboardModal } from '../components/TtsDashboardModal';"
);

// Add showTtsModal state
const doctorStateTarget = "  const { t } = useContext(AppContext);";
if (!doctorContent.includes(doctorStateTarget)) {
  console.error("DoctorView state target not found!");
  process.exit(1);
}
doctorContent = doctorContent.replace(
  doctorStateTarget,
  "  const { t } = useContext(AppContext);\n  const [showTtsModal, setShowTtsModal] = useState(false);"
);

// Regex for the entire Pilih Suara box in DoctorView
const doctorBoxRegex = /\{availableVoices\.length\s*>\s*0\s*&&\s*\(\s*<div className="flex flex-col gap-1\.5 bg-slate-50 border border-slate-200\/60 rounded-2xl p-3">[\s\S]*?Pilih Suara TTS \(Browser System & Open Source\)[\s\S]*?<\/div>\s*<\/div>\s*\)\}/m;

if (!doctorBoxRegex.test(doctorContent)) {
  console.error("DoctorView box regex not matched!");
  process.exit(1);
}

const doctorBoxReplacement = `{availableVoices.length > 0 && (
              <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                <div className="flex justify-between items-center border-b border-slate-200/40 pb-1.5 mb-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pilih Suara Asisten TTS</span>
                  <button
                    type="button"
                    onClick={() => setShowTtsModal(true)}
                    className="text-[9px] font-black text-violet-600 hover:text-violet-850 hover:underline select-none"
                  >
                    ⚙️ Buka Dashboard &amp; Uji Suara
                  </button>
                </div>
                <div className="flex gap-2">
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                      className="glass-input rounded-xl px-2.5 py-1.5 text-[10px] font-black bg-white text-slate-700 cursor-pointer flex-grow border border-slate-200"
                    >
                      <option value="">-- Suara Default Indonesia --</option>
                      {availableVoices.map((voice, idx) => (
                        <option key={idx} value={voice.name}>
                          {getVoiceLabel(voice)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI."}
                      onClick={() => speak("Halo, ini adalah uji coba suara asisten MedSign AI.")}
                      className={\`inline-flex items-center justify-center rounded-xl font-bold text-[10px] py-1.5 px-3 shadow-sm active:scale-[0.98] transition-all shrink-0 \${
                        speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI."
                          ? "bg-emerald-600 text-white animate-pulse"
                          : "bg-violet-600 hover:bg-violet-700 text-white"
                      }\`}
                    >
                      {speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI." ? "Memutar..." : "Uji Suara"}
                    </button>
                  </div>
                  {speakingText === "Halo, ini adalah uji coba suara asisten MedSign AI." && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200/50 rounded-xl flex items-center justify-between text-[9px] font-black text-emerald-800 uppercase animate-slide-up">
                      <span className="truncate">🔊 Menguji suara: "{speakingText}"</span>
                      <span className="shrink-0">{Math.round(speakingProgress)}%</span>
                    </div>
                  )}
              </div>
            )}`;

doctorContent = doctorContent.replace(doctorBoxRegex, doctorBoxReplacement);

// Render modal at bottom
const doctorBottomTarget = `        </div>
      </div>
    </div>
  );
};`;

const doctorBottomReplacement = `        </div>
      </div>
      
      {/* Modal Dashboard & Uji Suara TTS */}
      <TtsDashboardModal isOpen={showTtsModal} onClose={() => setShowTtsModal(false)} />
    </div>
  );
};`;

const normalizedDoctorBottomTarget = doctorBottomTarget.replace(/\r\n/g, '\n');
if (!doctorContent.includes(normalizedDoctorBottomTarget)) {
  console.error("DoctorView bottom target not found!");
  process.exit(1);
}
doctorContent = doctorContent.replace(normalizedDoctorBottomTarget, doctorBottomReplacement);
fs.writeFileSync(doctorPath, doctorContent, 'utf8');
console.log("Successfully patched DoctorView.jsx");

