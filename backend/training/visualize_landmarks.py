# -*- coding: utf-8 -*-
"""
Script Utilitas Visualisasi Koordinat Landmark 3D (.npy) ke Gambar JPG Nyata
Membaca file biner .npy, memplot rangka tangan secara 3D, dan mengekspornya menjadi JPG.
"""

import os
import numpy as np

try:
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d import Axes3D
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

def draw_hand_3d(ax, pts, title_suffix=""):
    """
    Melukis satu pose tangan 21 titik koordinat MediaPipe dalam ruang 3D.
    """
    # Koneksi tulang tangan MediaPipe
    connections = [
        [0,1], [1,2], [2,3], [3,4],        # Ibu jari (Thumb)
        [0,5], [5,6], [6,7], [7,8],        # Telunjuk (Index)
        [0,9], [9,10], [10,11], [11,12],   # Tengah (Middle)
        [0,13], [13,14], [14,15], [15,16], # Manis (Ring)
        [0,17], [17,18], [18,19], [19,20], # Kelingking (Pinky)
        [5,9], [9,13], [13,17]              # Buku jari (Knuckles connection)
    ]
    
    # Ekstrak X, Y, Z
    xs = pts[:, 0]
    ys = pts[:, 1]
    zs = pts[:, 2]
    
    # 1. Plot titik-titik persendian (Blue Cyan joints)
    ax.scatter(xs, ys, zs, c='#0ea5e9', s=40, depthshade=True, label='Sendi')
    
    # Gambar titik wrist (0) lebih besar dan berwarna oranye sebagai jangkar
    ax.scatter(xs[0], ys[0], zs[0], c='#f59e0b', s=80, depthshade=True, label='Pergelangan')
    
    # 2. Gambar garis tulang penyambung (Green Emerald skeleton lines)
    for connection in connections:
        start_idx, end_idx = connection
        ax.plot(
            [xs[start_idx], xs[end_idx]],
            [ys[start_idx], ys[end_idx]],
            [zs[start_idx], zs[end_idx]],
            c='#10b981', linewidth=2.5
        )
        
    # Atur sudut pandang 3D kamera agar nyaman dilihat secara anatomis
    ax.view_init(elev=-90, azim=-90) # Tampak depan mirror
    
    # Sembunyikan grid dan panel koordinat numerik agar gambar terlihat rapi & premium
    ax.set_axis_off()
    
    # Batasi rentang sumbu agar hand pose tidak terdistorsi (tetap terpusat)
    max_range = 1.0
    ax.set_xlim(-max_range/2, max_range/2)
    ax.set_ylim(-max_range/2, max_range/2)
    ax.set_zlim(-max_range/2, max_range/2)
    
    ax.set_title(title_suffix, fontsize=10, color='#f1f5f9', fontweight='bold', pad=1)

def export_npy_to_jpg(npy_path, output_jpg_path, gesture_name):
    """
    Membaca sequence 30 frame .npy koordinat tangan dan mengekspornya 
    menjadi gambar JPG 3 panel side-by-side (Awal, Tengah, Akhir gerakan).
    """
    if not MATPLOTLIB_AVAILABLE:
        print("ERROR: Harap instal matplotlib terlebih dahulu!")
        print("Perintah: pip install matplotlib")
        return False
        
    try:
        # Muat file npy. Shape: (30, 63)
        sequence = np.load(npy_path)
        
        # Reshape menjadi (30, 21, 3) koordinat x, y, z
        sequence_3d = sequence.reshape(30, 21, 3)
        
        # Atur tema background gelap premium (dark mode) pada matplotlib
        plt.style.use('dark_background')
        fig = plt.figure(figsize=(12, 4.5), facecolor='#020b14')
        fig.suptitle(f"Visualisasi Gerakan Isyarat BISINDO: '{gesture_name.upper()}'", 
                     fontsize=14, color='#38bdf8', fontweight='bold', y=0.98)
        
        # Ambil 3 frame utama: Awal (0), Tengah (15), Akhir (29)
        frames_to_plot = [
            (0, "Awal Gerakan (Frame 1)"),
            (15, "Tengah Gerakan (Frame 16)"),
            (29, "Akhir Gerakan (Frame 30)")
        ]
        
        for idx, (frame_idx, label) in enumerate(frames_to_plot):
            ax = fig.add_subplot(1, 3, idx + 1, projection='3d')
            ax.set_facecolor('#020b14')
            
            pts = sequence_3d[frame_idx]
            
            # Khusus koordinat mentah, lakukan origin shift agar terpusat di wrist
            pts = pts - pts[0]
            
            draw_hand_3d(ax, pts, label)
            
        plt.tight_layout()
        plt.subplots_adjust(top=0.85, bottom=0.05, wspace=0.1)
        
        # Simpan sebagai JPG dengan dpi tinggi untuk kejelasan gambar maksimal
        plt.savefig(output_jpg_path, dpi=150, facecolor='#020b14', edgecolor='none')
        plt.close()
        
        return True
    except Exception as e:
        print(f"Gagal mengekspor {npy_path} ke JPG: {e}")
        return False

def run_sample_visualizations():
    if not MATPLOTLIB_AVAILABLE:
        print("ERROR: Harap instal matplotlib terlebih dahulu!")
        print("Perintah: pip install matplotlib")
        return
        
    script_dir = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.abspath(os.path.join(script_dir, '..', 'data'))
    VIS_PATH = os.path.abspath(os.path.join(script_dir, 'visualization'))
    
    if not os.path.exists(VIS_PATH):
        os.makedirs(VIS_PATH)
        print(f"Membuat folder visualisasi di: {VIS_PATH}")
        
    # Deteksi dan pilih semua sub-folder kosakata yang ada di folder data/ secara dinamis
    if os.path.exists(DATA_PATH):
        sample_gestures = sorted([d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))])
    else:
        sample_gestures = ["sakit", "ya", "sesak"]
    
    print("\n=== UTINITAS VISUALISASI DATASET .NPY KE JPG ===")
    
    success_count = 0
    for gesture in sample_gestures:
        gesture_dir = os.path.join(DATA_PATH, gesture)
        npy_file = os.path.join(gesture_dir, "0.npy") # Ambil sampel pertama
        
        if os.path.exists(npy_file):
            output_jpg = os.path.join(VIS_PATH, f"{gesture}_pose.jpg")
            print(f"Menerjemahkan koordinat {gesture.upper()} (0.npy) -> {gesture}_pose.jpg...")
            
            if export_npy_to_jpg(npy_file, output_jpg, gesture):
                print(f"  [OK] Sukses! Gambar tersimpan di: {output_jpg}")
                success_count += 1
        else:
            print(f"  [WARN] File {npy_file} tidak ditemukan. Harap jalankan generate_synthetic_data.py terlebih dahulu!")
            
    if success_count > 0:
        print(f"\nVisualisasi Selesai! Berhasil memetakan {success_count} gambar ke dalam format JPG.")
        print(f"Silakan buka folder: {VIS_PATH} di File Explorer untuk melihat bentuk isyarat tangan Anda!")
    else:
        print("\nTidak ada gambar yang berhasil divisualisasikan.")

if __name__ == "__main__":
    run_sample_visualizations()
