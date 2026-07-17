# -*- coding: utf-8 -*-
"""
Compatibility wrapper.

Script perekam dataset MedSign MVP sekarang berada di capture_landmarks.py.
File ini tetap ada agar perintah lama `python training/collect_data.py` masih bekerja.
"""

from capture_landmarks import main


if __name__ == "__main__":
    raise SystemExit(main())
