# -*- coding: utf-8 -*-
"""
Compatibility wrapper.

Training clinical MedSign MVP sekarang berada di train_clinical_model.py.
File ini tetap ada agar perintah lama `python training/train_lstm.py` masih bekerja.
"""

from train_clinical_model import main


if __name__ == "__main__":
    raise SystemExit(main())
