import os
import sys
import httpx
import numpy as np

# Set paths
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(script_dir, '..')))
from app.ml.preprocess import normalize_landmarks

# Base pose generator for numbers 1-9
def get_number_pose(num):
    pts = np.zeros((21, 3))
    pts[0] = [0.0, 0.0, 0.0]
    
    def set_finger(start, extended=True, dx=0.0):
        y_dir = -0.25 if extended else -0.08
        z_dir = -0.01 if extended else -0.08
        pts[start]   = [dx, -0.18, -0.02]
        pts[start+1] = [dx + dx*0.1, -0.38 if extended else -0.22, z_dir]
        pts[start+2] = [dx + dx*0.2, -0.58 if extended else -0.18, z_dir*1.5]
        pts[start+3] = [dx + dx*0.3, -0.72 if extended else -0.12, z_dir*2.0]

    def set_thumb(extended=True):
        if extended:
            pts[1] = [0.12, -0.05, -0.05]
            pts[2] = [0.22, -0.10, -0.08]
            pts[3] = [0.30, -0.15, -0.10]
            pts[4] = [0.36, -0.20, -0.11]
        else:
            pts[1] = [0.05, -0.05, -0.05]
            pts[2] = [0.08, -0.08, -0.08]
            pts[3] = [0.06, -0.10, -0.10]
            pts[4] = [0.04, -0.12, -0.11]

    if num == 1:
        set_thumb(False)
        set_finger(5, True, 0.1)
        set_finger(9, False, 0.0)
        set_finger(13, False, -0.1)
        set_finger(17, False, -0.18)
    elif num == 2:
        set_thumb(False)
        set_finger(5, True, 0.1)
        set_finger(9, True, 0.0)
        set_finger(13, False, -0.1)
        set_finger(17, False, -0.18)
    elif num == 3:
        set_thumb(True)
        set_finger(5, True, 0.1)
        set_finger(9, True, 0.0)
        set_finger(13, False, -0.1)
        set_finger(17, False, -0.18)
    elif num == 4:
        set_thumb(False)
        set_finger(5, True, 0.1)
        set_finger(9, True, 0.0)
        set_finger(13, True, -0.1)
        set_finger(17, True, -0.18)
    elif num == 5:
        set_thumb(True)
        set_finger(5, True, 0.1)
        set_finger(9, True, 0.0)
        set_finger(13, True, -0.1)
        set_finger(17, True, -0.18)
    elif num == 6:
        set_thumb(True)
        set_finger(5, False, 0.1)
        set_finger(9, False, 0.0)
        set_finger(13, False, -0.1)
        set_finger(17, False, -0.18)
    elif num == 7:
        set_thumb(True)
        set_finger(5, True, 0.1)
        set_finger(9, False, 0.0)
        set_finger(13, False, -0.1)
        set_finger(17, False, -0.18)
    elif num == 8:
        set_thumb(True)
        set_finger(5, True, 0.1)
        set_finger(9, True, 0.0)
        set_finger(13, False, -0.1)
        set_finger(17, False, -0.18)
    elif num == 9:
        set_thumb(True)
        set_finger(5, True, 0.1)
        set_finger(9, True, 0.0)
        set_finger(13, True, -0.1)
        set_finger(17, False, -0.18)
        
    return pts

def main():
    print("=== MEDSIGN AI - ALPHABET & NUMBERS DATASET BUILDER ===")
    
    classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + [str(i) for i in range(1, 10)]
    label_map = {c: i for i, c in enumerate(classes)}

    X_list = []
    y_list = []

    # 1. Download and parse A-Z CSV files from KrisnaSantosa15 repo
    csv_urls = {
        "train": "https://raw.githubusercontent.com/KrisnaSantosa15/realtime-bisindo-classification/main/data/train.csv",
        "val": "https://raw.githubusercontent.com/KrisnaSantosa15/realtime-bisindo-classification/main/data/val.csv"
    }

    for name, url in csv_urls.items():
        print(f"Downloading {name} dataset from GitHub...")
        r = httpx.get(url)
        lines = r.text.strip().split("\n")
        header = lines[0].split(",")
        
        # Build index map for hand_0 to hand_20
        x_indices = [header.index(f"hand_{i}_x") for i in range(21)]
        y_indices = [header.index(f"hand_{i}_y") for i in range(21)]
        z_indices = [header.index(f"hand_{i}_z") for i in range(21)]

        print(f"Processing {len(lines)-1} rows from {name}...")
        for line in lines[1:]:
            parts = line.split(",")
            if len(parts) < len(header):
                continue
            
            label = parts[0].upper().strip()
            if label not in label_map:
                continue

            # Reconstruct the 21 landmarks with empty check
            try:
                pts = np.zeros((21, 3))
                for i in range(21):
                    pts[i, 0] = float(parts[x_indices[i]]) if parts[x_indices[i]].strip() else 0.0
                    pts[i, 1] = float(parts[y_indices[i]]) if parts[y_indices[i]].strip() else 0.0
                    pts[i, 2] = float(parts[z_indices[i]]) if parts[z_indices[i]].strip() else 0.0
            except ValueError:
                continue

            # Normalize using MedSign contract
            flat_lms = normalize_landmarks(pts)
            X_list.append(flat_lms)
            y_list.append(label_map[label])

    print(f"Loaded A-Z: {len(X_list)} samples.")

    # 2. Synthesize coordinates for numbers 1-9 (indexes 26 to 34)
    print("Generating synthetic coordinates for numbers 1-9...")
    for num in range(1, 10):
        label = str(num)
        base_pts = get_number_pose(num)
        
        # Generate 450 augmented samples per number
        for _ in range(450):
            noise_level = np.random.uniform(0.005, 0.015)
            pts = base_pts.copy()
            
            # Apply Gaussian noise
            pts += np.random.normal(0, noise_level, size=pts.shape)
            # Re-normalize wrist to origin
            pts -= pts[0]
            
            # Apply slight rotation/scale augmentation
            scale = np.random.uniform(0.85, 1.15)
            pts *= scale
            
            flat_lms = normalize_landmarks(pts)
            X_list.append(flat_lms)
            y_list.append(label_map[label])

    X_arr = np.array(X_list, dtype=np.float32)
    y_arr = np.array(y_list, dtype=np.int32)

    output_path = os.path.abspath(os.path.join(script_dir, "..", "data", "alphabet_coordinates.npz"))
    np.savez_compressed(output_path, X=X_arr, y=y_arr)
    print(f"SUCCESS: Generated complete dataset at {output_path}!")
    print(f"X shape: {X_arr.shape} | y shape: {y_arr.shape}")

if __name__ == "__main__":
    main()
