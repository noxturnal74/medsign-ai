import os

patient_path = os.path.join("frontend", "src", "pages", "PatientView.jsx")
doctor_path = os.path.join("frontend", "src", "pages", "DoctorView.jsx")

def get_clean_content(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().replace("\r\n", "\n")

# 1. Patch PatientView.jsx
p = get_clean_content(patient_path)

# Reposition return start
p = p.replace("return (\n    <div className=\"flex w-full flex-col gap-6 animate-slide-up\">",
              "return (\n    <>\n      <div className=\"flex w-full flex-col gap-6 animate-slide-up\">")

# Remove old modal if present
p = p.replace("      {/* Modal Dashboard & Uji Suara TTS */}\n      <TtsDashboardModal isOpen={showTtsModal} onClose={() => setShowTtsModal(false)} />", "")

# Reposition modal to bottom outside the container
target_bottom_p = """      {/* Modal Panduan Isyarat */}

      {showGuideModal && ("""

replacement_bottom_p = """      </div>

      {/* Modal Dashboard & Uji Suara TTS */}
      <TtsDashboardModal isOpen={showTtsModal} onClose={() => setShowTtsModal(false)} />

      {/* Modal Panduan Isyarat */}

      {showGuideModal && ("""

if target_bottom_p not in p:
    print("PatientView bottom target not found!")
else:
    p = p.replace(target_bottom_p, replacement_bottom_p)

# Fix trailing tags of PatientView.jsx
p_end_target = """            </div>

          </div>

        </div>

      )}

    </div>

  );

};"""

p_end_replacement = """            </div>

          </div>

        </div>

      )}

    </>

  );

};"""

if p_end_target not in p:
    print("PatientView end target not found!")
else:
    p = p.replace(p_end_target, p_end_replacement)

with open(patient_path, "w", encoding="utf-8") as f:
    f.write(p)
print("PatientView patched successfully!")


# 2. Patch DoctorView.jsx
d = get_clean_content(doctor_path)

# Reposition return start
d = d.replace("return (\n    <div className=\"mx-auto flex w-full max-w-7xl flex-col gap-6 py-2 animate-slide-up\">",
              "return (\n    <>\n      <div className=\"mx-auto flex w-full max-w-7xl flex-col gap-6 py-2 animate-slide-up\">")

# Remove old modal if present
d = d.replace("      {/* Modal Dashboard & Uji Suara TTS */}\n      <TtsDashboardModal isOpen={showTtsModal} onClose={() => setShowTtsModal(false)} />", "")

# Reposition modal to bottom outside the container
d_bottom_target = """          <SessionLog />

        </div>

      </div>

    </div>

  );

};"""

d_bottom_replacement = """          <SessionLog />

        </div>

      </div>

      </div>

      {/* Modal Dashboard & Uji Suara TTS */}
      <TtsDashboardModal isOpen={showTtsModal} onClose={() => setShowTtsModal(false)} />

    </>

  );

};"""

if d_bottom_target not in d:
    print("DoctorView bottom target not found!")
else:
    d = d.replace(d_bottom_target, d_bottom_replacement)

with open(doctor_path, "w", encoding="utf-8") as f:
    f.write(d)
print("DoctorView patched successfully!")
