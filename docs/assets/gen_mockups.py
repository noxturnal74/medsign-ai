# -*- coding: utf-8 -*-
"""Generate UI mockup images for MedSign AI Data Collection documentation."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__))

# ── Color palette ────────────────────────────────────────────────────────────
BG        = (15, 23, 42)        # #0f172a  dark navy
SIDEBAR   = (15, 23, 55)        # slightly lighter navy
CARD      = (30, 41, 59)        # #1e293b  slate card
CARD2     = (22, 33, 55)
ACCENT    = (34, 197, 94)       # #22c55e  green
ACCENT_DK = (21, 128, 61)
WARN      = (234, 179, 8)       # yellow warning
RED       = (239, 68, 68)
TEXT      = (248, 250, 252)     # near-white
TEXT2     = (148, 163, 184)     # slate-400
BORDER    = (51, 65, 85)        # slate-700
CHECK_BG  = (34, 197, 94, 200)
BLUE      = (59, 130, 246)


def font(size=14, bold=False):
    """Return a font, falling back to default if truetype not available."""
    try:
        if bold:
            return ImageFont.truetype("arialbd.ttf", size)
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill,
                            outline=outline, width=width)


def badge(draw, x, y, text, color, text_color=TEXT):
    f = font(11)
    bbox = draw.textbbox((0, 0), text, font=f)
    w = bbox[2] - bbox[0] + 16
    h = 20
    rounded_rect(draw, [x, y, x+w, y+h], 10, color)
    draw.text((x+8, y+3), text, fill=text_color, font=f)
    return w


# ════════════════════════════════════════════════════════════════════════════
#  MOCKUP 1 — Data Collection Page (Pilih Signer & Kata)
# ════════════════════════════════════════════════════════════════════════════
def mockup_data_collection():
    W, H = 1400, 860
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # ── Sidebar ──────────────────────────────────────────────────────────────
    SB_W = 220
    d.rectangle([0, 0, SB_W, H], fill=SIDEBAR)
    d.rectangle([SB_W, 0, SB_W+1, H], fill=BORDER)

    # Logo
    d.ellipse([20, 18, 50, 48], fill=ACCENT)
    d.text((24, 24), "M", fill=TEXT, font=font(18, bold=True))
    d.text((58, 18), "MedSign AI", fill=TEXT, font=font(16, bold=True))
    d.text((58, 38), "Dataset Studio", fill=TEXT2, font=font(11))

    # Nav items
    nav = [
        ("🏠", "Dashboard",       False),
        ("📹", "Rekam Dataset",   True),
        ("📊", "Balance Checker", False),
        ("🤖", "Training",        False),
        ("⚙️",  "Pengaturan",     False),
    ]
    for i, (icon, label, active) in enumerate(nav):
        y = 90 + i * 52
        if active:
            rounded_rect(d, [8, y-4, SB_W-8, y+38], 8, CARD)
            d.rectangle([4, y-4, 8, y+38], fill=ACCENT)
        d.text((24, y+8), icon, fill=ACCENT if active else TEXT2, font=font(16))
        d.text((52, y+10), label, fill=TEXT if active else TEXT2,
               font=font(13, bold=active))

    # Version badge
    d.text((18, H-30), "v1.0.0 · medsign-clinical-full-v1", fill=TEXT2, font=font(10))

    # ── Top bar ──────────────────────────────────────────────────────────────
    d.rectangle([SB_W, 0, W, 56], fill=CARD)
    d.rectangle([SB_W, 56, W, 57], fill=BORDER)
    d.text((SB_W+24, 16), "Rekam Dataset", fill=TEXT, font=font(20, bold=True))
    d.text((SB_W+24, 38), "Pilih signer, kata, dan mulai sesi rekam.", fill=TEXT2, font=font(12))

    # Avatar pill
    rounded_rect(d, [W-160, 13, W-16, 43], 20, CARD2, BORDER)
    d.ellipse([W-148, 18, W-122, 38], fill=ACCENT)
    d.text((W-142, 21), "A", fill=BG, font=font(13, bold=True))
    d.text((W-116, 22), "albert_william", fill=TEXT, font=font(12))

    # ── Content area ─────────────────────────────────────────────────────────
    CX = SB_W + 24
    CW = W - SB_W - 48
    y = 76

    # ── Step 1: Pilih Signer ─────────────────────────────────────────────────
    rounded_rect(d, [CX, y, CX+CW, y+100], 10, CARD, BORDER)
    d.text((CX+16, y+14), "① Pilih Signer", fill=TEXT, font=font(15, bold=True))
    d.text((CX+16, y+34), "Siapa yang akan merekam isyarat pada sesi ini?", fill=TEXT2, font=font(12))

    signers = ["albert_william ✓", "albert_cheng", "glenn", "loren", "+ Tambah baru"]
    sx = CX + 16
    for s in signers:
        is_sel = "✓" in s
        bg = ACCENT if is_sel else CARD2
        tc = BG if is_sel else TEXT2
        rounded_rect(d, [sx, y+56, sx+130, y+86], 8, bg, None if is_sel else BORDER)
        d.text((sx+10, y+63), s.replace(" ✓", ""), fill=tc, font=font(12, bold=is_sel))
        sx += 140

    y += 114

    # ── Step 2: Pilih Kata ───────────────────────────────────────────────────
    rounded_rect(d, [CX, y, CX+CW, y+380], 10, CARD, BORDER)
    d.text((CX+16, y+14), "② Pilih Kata yang Akan Direkam", fill=TEXT, font=font(15, bold=True))

    # Category filter pills
    cats = ["Semua", "Gejala Umum", "Pernapasan", "Komunikasi Dasar", "Bagian Tubuh"]
    px = CX + 16
    for i, c in enumerate(cats):
        is_active = i == 0
        bw = len(c)*8 + 20
        rounded_rect(d, [px, y+38, px+bw, y+58], 12,
                     ACCENT if is_active else CARD2,
                     None if is_active else BORDER)
        d.text((px+10, y+42), c, fill=BG if is_active else TEXT2, font=font(11, bold=is_active))
        px += bw + 8

    # Word grid
    words = [
        ("sakit",   True,  False), ("nyeri",   True,  False), ("sesak",  True,  True),
        ("batuk",   True,  False), ("demam",   True,  False), ("pusing", True,  False),
        ("mual",    True,  False), ("muntah",  True,  False), ("ya",     True,  False),
        ("tidak",   False, False), ("tolong",  True,  True),  ("dokter", False, False),
        ("obat",    False, False), ("periksa", False, False), ("sesak",  False, False),
        ("napas",   False, False), ("dada",    False, False), ("haus",   False, False),
        ("kencing", False, False), ("lemas",   False, False), ("gula",   False, False),
        ("manis",   False, False), ("kaki",    False, False), ("lapar",  False, False),
    ]
    COLS = 8
    gx, gy = CX + 16, y + 68
    cell_w, cell_h = (CW - 32) // COLS, 40
    for idx, (w, checked, emergency) in enumerate(words):
        col = idx % COLS
        row = idx // COLS
        cx2 = gx + col * cell_w
        cy2 = gy + row * cell_h
        bg2 = CARD2 if not checked else (20, 60, 40)
        bdr = ACCENT if checked else BORDER
        rounded_rect(d, [cx2, cy2, cx2+cell_w-6, cy2+cell_h-4], 6, bg2, bdr)
        # checkbox
        cb_c = ACCENT if checked else CARD
        d.ellipse([cx2+8, cy2+10, cx2+24, cy2+26], fill=cb_c, outline=bdr)
        if checked:
            d.text((cx2+11, cy2+11), "✓", fill=BG, font=font(10, bold=True))
        # emergency badge
        label_x = cx2 + 30
        d.text((label_x, cy2+11), w, fill=TEXT if checked else TEXT2, font=font(11, bold=checked))
        if emergency:
            badge(d, cx2+cell_w-42, cy2+10, "⚡", RED)

    # Select all / deselect
    d.text((CX+16, y+358), "✓ Pilih Semua", fill=ACCENT, font=font(11))
    d.text((CX+110, y+358), "✕ Batal Semua", fill=TEXT2, font=font(11))
    d.text((CX+CW-160, y+358), "12 kata dipilih dari 192", fill=TEXT2, font=font(11))

    y += 394

    # ── Step 3: Iterasi & Tombol ─────────────────────────────────────────────
    rounded_rect(d, [CX, y, CX+CW, y+90], 10, CARD, BORDER)
    d.text((CX+16, y+14), "③ Jumlah Iterasi per Kata", fill=TEXT, font=font(15, bold=True))
    d.text((CX+16, y+34), "Minimum 5 iterasi per kata untuk keseimbangan dataset.", fill=TEXT2, font=font(12))

    # Input box
    rounded_rect(d, [CX+16, y+54, CX+90, y+78], 6, CARD2, ACCENT, 2)
    d.text((CX+28, y+58), "5", fill=TEXT, font=font(16, bold=True))

    # Warning note
    d.text((CX+100, y+60), "⚠  Estimasi waktu: ±4 menit untuk 12 kata × 5 iterasi", fill=WARN, font=font(11))

    # Mulai button
    btn_x = CX + CW - 180
    rounded_rect(d, [btn_x, y+50, btn_x+164, y+80], 10, ACCENT)
    d.text((btn_x+30, y+57), "▶  Mulai Rekam", fill=BG, font=font(14, bold=True))

    img.save(os.path.join(OUT, "mockup_data_collection.png"))
    print("✓ mockup_data_collection.png")


# ════════════════════════════════════════════════════════════════════════════
#  MOCKUP 2 — Balance Dashboard
# ════════════════════════════════════════════════════════════════════════════
def mockup_balance():
    W, H = 1400, 720
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Sidebar (condensed)
    SB_W = 220
    d.rectangle([0, 0, SB_W, H], fill=SIDEBAR)
    d.rectangle([SB_W, 0, SB_W+1, H], fill=BORDER)
    d.text((20, 18), "MedSign AI", fill=TEXT, font=font(16, bold=True))
    d.text((20, 38), "Dataset Studio", fill=TEXT2, font=font(11))
    nav = [("🏠","Dashboard",False),("📹","Rekam Dataset",False),("📊","Balance Checker",True),("🤖","Training",False)]
    for i,(ic,lb,ac) in enumerate(nav):
        yy = 80+i*52
        if ac:
            rounded_rect(d,[8,yy-4,SB_W-8,yy+38],8,CARD)
            d.rectangle([4,yy-4,8,yy+38],fill=ACCENT)
        d.text((24,yy+8),ic,fill=ACCENT if ac else TEXT2,font=font(16))
        d.text((52,yy+10),lb,fill=TEXT if ac else TEXT2,font=font(13,bold=ac))

    # Top bar
    d.rectangle([SB_W,0,W,56],fill=CARD)
    d.rectangle([SB_W,56,W,57],fill=BORDER)
    d.text((SB_W+24,16),"Balance Checker",fill=TEXT,font=font(20,bold=True))
    d.text((SB_W+24,38),"Pantau jumlah sampel per kata per signer. Alert otomatis jika kurang dari minimum.",fill=TEXT2,font=font(12))

    # Summary cards
    CX = SB_W+24
    cw2 = 200
    cards = [
        ("Total Signer",  "4",  ACCENT, "albert, cheng, glenn, loren"),
        ("Total Kata",    "12", BLUE,   "label yang dilatih"),
        ("Sample Valid",  "47", ACCENT, "dari target 240"),
        ("Kurang Sampel", "5",  WARN,   "kata perlu ditambah"),
        ("Belum Rekam",   "3",  RED,    "kata belum ada data"),
    ]
    sx2 = CX
    for title, val, col, sub in cards:
        rounded_rect(d,[sx2,68,sx2+cw2-8,148],10,CARD,BORDER)
        d.text((sx2+14,78),val,fill=col,font=font(28,bold=True))
        d.text((sx2+14,112),title,fill=TEXT,font=font(12,bold=True))
        d.text((sx2+14,130),sub,fill=TEXT2,font=font(10))
        sx2 += cw2+4

    # Table header
    ty = 162
    cols_data = [
        ("Kata",         200),
        ("albert_william",130),
        ("albert_cheng",  130),
        ("glenn",         100),
        ("loren",         100),
        ("Total",         90),
        ("Status",        120),
    ]
    rounded_rect(d,[CX,ty,CX+sum(c[1] for c in cols_data)+16,ty+36],8,CARD2,BORDER)
    hx = CX+8
    for cname,cw3 in cols_data:
        d.text((hx+4,ty+10),cname,fill=TEXT2,font=font(11,bold=True))
        hx+=cw3

    # Table rows
    rows = [
        ("sakit",    "5","5","5","5","20", "✅ Cukup",   ACCENT),
        ("nyeri",    "5","5","5","0","15", "⚠️ Kurang",   WARN),
        ("sesak",    "5","3","0","0","8",  "⚠️ Kurang",   WARN),
        ("batuk",    "5","5","5","5","20", "✅ Cukup",    ACCENT),
        ("demam",    "5","5","5","5","20", "✅ Cukup",    ACCENT),
        ("pusing",   "0","0","0","0","0",  "🔴 Belum",    RED),
        ("mual",     "5","5","0","0","10", "⚠️ Kurang",   WARN),
        ("muntah",   "0","0","0","0","0",  "🔴 Belum",    RED),
        ("ya",       "5","5","5","5","20", "✅ Cukup",    ACCENT),
        ("tidak",    "5","5","5","5","20", "✅ Cukup",    ACCENT),
        ("tolong",   "5","5","5","0","15", "⚠️ Kurang",   WARN),
        ("selesai",  "0","0","0","0","0",  "🔴 Belum",    RED),
    ]
    for ri, row in enumerate(rows):
        ry = ty+36+ri*36
        bg3 = (25,38,58) if ri%2==0 else CARD
        d.rectangle([CX,ry,CX+sum(c[1] for c in cols_data)+16,ry+36],fill=bg3)
        if ri < len(rows)-1:
            d.rectangle([CX,ry+35,CX+sum(c[1] for c in cols_data)+16,ry+36],fill=BORDER)

        rx = CX+8
        for ci,(val,(_,cw3)) in enumerate(zip(row,cols_data)):
            col3 = TEXT
            if ci==0:
                col3=TEXT
            elif ci in (1,2,3,4):
                col3=(ACCENT if int(val)>=5 else (WARN if int(val)>0 else RED))
            elif ci==5:
                col3=(ACCENT if int(val)>=20 else (WARN if int(val)>0 else RED))
            elif ci==6:
                col3=row[7]
            if ci==6:
                badge(d,rx,ry+9,val,
                      (20,60,40) if "✅" in val else ((80,60,8) if "⚠" in val else (80,20,20)),
                      ACCENT if "✅" in val else (WARN if "⚠" in val else RED))
            else:
                d.text((rx+4,ry+10),val,fill=col3,font=font(12,bold=(ci==0)))
            rx+=cw3

    # Refresh + Export buttons
    bx = CX+sum(c[1] for c in cols_data)+16-300
    by = H-52
    rounded_rect(d,[bx,by,bx+140,by+36],8,CARD2,ACCENT)
    d.text((bx+18,by+10),"🔄  Refresh",fill=ACCENT,font=font(13))
    rounded_rect(d,[bx+152,by,bx+292,by+36],8,ACCENT)
    d.text((bx+170,by+10),"📤  Export CSV",fill=BG,font=font(13,bold=True))

    img.save(os.path.join(OUT,"mockup_balance.png"))
    print("✓ mockup_balance.png")


# ════════════════════════════════════════════════════════════════════════════
#  MOCKUP 3 — Training Panel
# ════════════════════════════════════════════════════════════════════════════
def mockup_training():
    W, H = 1400, 720
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    SB_W = 220
    d.rectangle([0,0,SB_W,H],fill=SIDEBAR)
    d.rectangle([SB_W,0,SB_W+1,H],fill=BORDER)
    d.text((20,18),"MedSign AI",fill=TEXT,font=font(16,bold=True))
    d.text((20,38),"Dataset Studio",fill=TEXT2,font=font(11))
    nav=[("🏠","Dashboard",False),("📹","Rekam Dataset",False),("📊","Balance Checker",False),("🤖","Training",True)]
    for i,(ic,lb,ac) in enumerate(nav):
        yy=80+i*52
        if ac:
            rounded_rect(d,[8,yy-4,SB_W-8,yy+38],8,CARD)
            d.rectangle([4,yy-4,8,yy+38],fill=ACCENT)
        d.text((24,yy+8),ic,fill=ACCENT if ac else TEXT2,font=font(16))
        d.text((52,yy+10),lb,fill=TEXT if ac else TEXT2,font=font(13,bold=ac))

    d.rectangle([SB_W,0,W,56],fill=CARD)
    d.rectangle([SB_W,56,W,57],fill=BORDER)
    d.text((SB_W+24,16),"Training Model",fill=TEXT,font=font(20,bold=True))
    d.text((SB_W+24,38),"Pilih kata yang dilatih, set iterasi, lalu jalankan training GRU.",fill=TEXT2,font=font(12))

    CX=SB_W+24
    CW=W-SB_W-48
    y=76

    # Panel kiri: config
    LP=CX
    LW=500
    rounded_rect(d,[LP,y,LP+LW,y+560],10,CARD,BORDER)
    d.text((LP+16,y+14),"Konfigurasi Training",fill=TEXT,font=font(15,bold=True))

    # Kata yang dilatih
    d.text((LP+16,y+48),"Kata yang dilatih:",fill=TEXT2,font=font(12))
    trained = ["sakit","nyeri","batuk","demam","ya","tidak","tolong","selesai","mual","muntah","pusing","sesak"]
    tx,ty2=LP+16,y+68
    for w in trained:
        bw=len(w)*8+18
        if tx+bw>LP+LW-16:
            tx=LP+16; ty2+=28
        rounded_rect(d,[tx,ty2,tx+bw,ty2+22],6,(20,60,40))
        d.text((tx+9,ty2+4),w,fill=ACCENT,font=font(11,bold=True))
        tx+=bw+6

    # Epoch setting
    ey=y+200
    d.text((LP+16,ey),"Jumlah Epoch (Iterasi Training):",fill=TEXT2,font=font(12))
    rounded_rect(d,[LP+16,ey+22,LP+120,ey+50],6,CARD2,ACCENT,2)
    d.text((LP+30,ey+28),"50",fill=TEXT,font=font(18,bold=True))
    # epoch presets
    for i,ep in enumerate(["10","30","50","100"]):
        ex2=LP+130+i*64
        is_sel=(ep=="50")
        rounded_rect(d,[ex2,ey+26,ex2+52,ey+46],6,ACCENT if is_sel else CARD2,None if is_sel else BORDER)
        d.text((ex2+10,ey+30),ep+" ep",fill=BG if is_sel else TEXT2,font=font(11,bold=is_sel))

    # Architecture
    ay=ey+68
    d.text((LP+16,ay),"Arsitektur Model:",fill=TEXT2,font=font(12))
    for i,(arch,desc) in enumerate([("GRU","Recommended · cepat"),("LSTM","Akurasi tinggi · lambat"),("Transformer","Eksperimental")]):
        is_sel=(i==0)
        rounded_rect(d,[LP+16,ay+22+i*52,LP+LW-16,ay+66+i*52],8,
                     (20,60,40) if is_sel else CARD2,
                     ACCENT if is_sel else BORDER)
        d.text((LP+30,ay+30+i*52),arch,fill=ACCENT if is_sel else TEXT,font=font(13,bold=True))
        d.text((LP+100,ay+32+i*52),desc,fill=TEXT2,font=font(11))
        if is_sel:
            d.text((LP+LW-70,ay+30+i*52),"✓ Aktif",fill=ACCENT,font=font(11,bold=True))

    # Train button
    by2=y+510
    rounded_rect(d,[LP+16,by2,LP+LW-16,by2+44],10,ACCENT)
    d.text((LP+140,by2+12),"🚀  Jalankan Training",fill=BG,font=font(16,bold=True))

    # Panel kanan: log & status
    RP=LP+LW+24
    RW=CW-LW-24
    rounded_rect(d,[RP,y,RP+RW,y+300],10,CARD,BORDER)
    d.text((RP+16,y+14),"Status Dataset",fill=TEXT,font=font(15,bold=True))

    # progress bars per label
    labels_prog=[("sakit",20,20),("nyeri",15,20),("batuk",20,20),("demam",20,20),
                 ("ya",20,20),("tidak",20,20),("tolong",15,20),("selesai",0,20)]
    for i,(lbl,have,need) in enumerate(labels_prog):
        lx=RP+16; ly2=y+44+i*30
        d.text((lx,ly2),lbl,fill=TEXT,font=font(11))
        bar_x=lx+90; bar_w=RW-130
        d.rectangle([bar_x,ly2+4,bar_x+bar_w,ly2+16],fill=CARD2)
        ratio=min(have/need,1.0)
        fc=ACCENT if ratio>=1 else (WARN if ratio>0 else RED)
        d.rectangle([bar_x,ly2+4,bar_x+int(bar_w*ratio),ly2+16],fill=fc)
        d.text((bar_x+bar_w+6,ly2),f"{have}/{need}",fill=fc,font=font(10))

    # Log output
    rounded_rect(d,[RP,y+310,RP+RW,y+560],10,CARD,BORDER)
    d.text((RP+16,y+324),"Log Training",fill=TEXT,font=font(13,bold=True))
    logs=[
        ("[INFO]  Memuat dataset: 170 sampel valid",TEXT2),
        ("[INFO]  Labels: 12 kata, 4 signer",TEXT2),
        ("[INFO]  Train: 136 | Val: 34",TEXT2),
        ("[INFO]  Arsitektur: GRU(128) → Dense(12)",TEXT2),
        ("[EPOCH] 1/50  loss: 2.4821  acc: 0.1412",BLUE),
        ("[EPOCH] 10/50 loss: 1.2044  acc: 0.6176",BLUE),
        ("[EPOCH] 25/50 loss: 0.7231  acc: 0.8088",ACCENT),
        ("[DONE]  Model disimpan: medsign_mvp_v1.tflite",ACCENT),
    ]
    for i,(log,col) in enumerate(logs):
        d.text((RP+16,y+346+i*24),log,fill=col,font=font(10))

    img.save(os.path.join(OUT,"mockup_training.png"))
    print("✓ mockup_training.png")


# ════════════════════════════════════════════════════════════════════════════
#  MOCKUP 4 — Live Record Session
# ════════════════════════════════════════════════════════════════════════════
def mockup_record_session():
    W, H = 1400, 760
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    SB_W = 220
    d.rectangle([0,0,SB_W,H],fill=SIDEBAR)
    d.rectangle([SB_W,0,SB_W+1,H],fill=BORDER)
    d.text((20,18),"MedSign AI",fill=TEXT,font=font(16,bold=True))
    d.text((20,38),"Dataset Studio",fill=TEXT2,font=font(11))

    d.rectangle([SB_W,0,W,56],fill=CARD)
    d.rectangle([SB_W,56,W,57],fill=BORDER)
    d.text((SB_W+24,16),"Sesi Rekam — albert_william",fill=TEXT,font=font(20,bold=True))
    d.text((SB_W+24,38),"Kata: sakit  ·  Iterasi 3 dari 5  ·  Sesi: 20260708_143022",fill=TEXT2,font=font(12))

    CX=SB_W+24
    CW=W-SB_W-48

    # Webcam feed area
    cam_w=640; cam_h=480
    rounded_rect(d,[CX,70,CX+cam_w,70+cam_h],12,(8,18,38),(34,197,94),3)
    # fake camera content
    d.ellipse([CX+200,70+140,CX+440,70+340],fill=(20,40,80))
    d.text((CX+220,70+220),"📷  Webcam Feed",fill=TEXT2,font=font(20))
    d.text((CX+215,70+250),"(MediaPipe aktif)",fill=ACCENT,font=font(14))
    # status overlay
    rounded_rect(d,[CX+10,80,CX+200,110],8,(0,0,0,180))
    d.ellipse([CX+18,87,CX+34,103],fill=ACCENT)
    d.text((CX+40,88),"TANGAN TERDETEKSI",fill=ACCENT,font=font(11,bold=True))
    # frame counter
    rounded_rect(d,[CX+cam_w-110,80,CX+cam_w-10,110],8,(0,0,0,180))
    d.text((CX+cam_w-100,88),"Frame 18/30",fill=TEXT,font=font(11))
    # progress bar over cam
    bar_y=70+cam_h+8
    d.rectangle([CX,bar_y,CX+cam_w,bar_y+8],fill=CARD2)
    d.rectangle([CX,bar_y,CX+int(cam_w*18/30),bar_y+8],fill=ACCENT)

    # Right panel: word queue
    RP=CX+cam_w+24
    RW=CW-cam_w-24

    rounded_rect(d,[RP,70,RP+RW,70+480],10,CARD,BORDER)
    d.text((RP+16,84),"Antrian Kata",fill=TEXT,font=font(14,bold=True))
    d.text((RP+RW-80,84),"12 kata",fill=TEXT2,font=font(12))

    queue=[
        ("sakit",   3,5,True,  False),
        ("nyeri",   0,5,False, False),
        ("batuk",   0,5,False, False),
        ("demam",   0,5,False, False),
        ("ya",      0,5,False, False),
        ("tidak",   0,5,False, False),
        ("tolong",  0,5,False, True),
        ("mual",    0,5,False, False),
        ("muntah",  0,5,False, False),
        ("pusing",  0,5,False, False),
        ("sesak",   0,5,False, True),
        ("selesai", 0,5,False, False),
    ]
    for i,(w,done,total,active,emg) in enumerate(queue):
        qy=108+i*30
        bg4=(20,60,40) if done>=total else (CARD2 if not active else (10,30,60))
        rounded_rect(d,[RP+8,qy,RP+RW-8,qy+26],6,bg4,ACCENT if active else BORDER)
        # number
        d.text((RP+18,qy+6),f"{i+1:02d}.",fill=TEXT2,font=font(11))
        # word
        wc=ACCENT if done>=total else (TEXT if active else TEXT2)
        d.text((RP+46,qy+6),w,fill=wc,font=font(12,bold=active))
        # emergency
        if emg:
            badge(d,RP+120,qy+6,"⚡ darurat",RED)
        # count
        cc=(ACCENT if done>=total else (WARN if done>0 else TEXT2))
        d.text((RP+RW-54,qy+6),f"{done}/{total}",fill=cc,font=font(11,bold=True))
        # checkmark
        if done>=total:
            d.text((RP+RW-20,qy+6),"✓",fill=ACCENT,font=font(12,bold=True))

    # Control buttons
    btn_y=70+cam_h+28
    rounded_rect(d,[CX,btn_y,CX+140,btn_y+44],8,RED)
    d.text((CX+28,btn_y+13),"⏹  Batal",fill=TEXT,font=font(14,bold=True))

    rounded_rect(d,[CX+152,btn_y,CX+340,btn_y+44],8,ACCENT)
    d.text((CX+170,btn_y+13),"⏭  Skip Kata Ini",fill=BG,font=font(14,bold=True))

    rounded_rect(d,[CX+352,btn_y,CX+540,btn_y+44],8,CARD2,ACCENT)
    d.text((CX+370,btn_y+13),"🔁  Ulang Take",fill=ACCENT,font=font(14,bold=True))

    img.save(os.path.join(OUT,"mockup_record_session.png"))
    print("✓ mockup_record_session.png")


if __name__ == "__main__":
    mockup_data_collection()
    mockup_balance()
    mockup_training()
    mockup_record_session()
    print("\nSemua mockup selesai dibuat di:", OUT)
