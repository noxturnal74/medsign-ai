import time
from typing import Dict, List

# Store format: { username_or_nik: [timestamp1, timestamp2, ...] }
failed_attempts: Dict[str, List[float]] = {}

LOCKOUT_WINDOW = 15 * 60 # 15 minutes in seconds

def check_lockout(username_or_nik: str, is_patient: bool) -> float:
    """
    Checks if the user account is currently locked out.
    Returns remaining lockout time in seconds, or 0.0 if not locked.
    """
    if username_or_nik not in failed_attempts:
        return 0.0
        
    now = time.time()
    # Filter failed attempts within the 15-minute window
    failures = [t for t in failed_attempts[username_or_nik] if now - t < LOCKOUT_WINDOW]
    failed_attempts[username_or_nik] = failures
    
    limit = 3 if is_patient else 5
    if len(failures) >= limit:
        # Locked out. Calculate time remaining until the oldest failure falls out of the window
        oldest_failure = min(failures)
        remaining = oldest_failure + LOCKOUT_WINDOW - now
        return max(0.0, remaining)
        
    return 0.0

def record_failure(username_or_nik: str):
    """Records a login failure for the account."""
    if username_or_nik not in failed_attempts:
        failed_attempts[username_or_nik] = []
    failed_attempts[username_or_nik].append(time.time())

def record_success(username_or_nik: str):
    """Clears the login failure records for the account upon successful login."""
    if username_or_nik in failed_attempts:
        del failed_attempts[username_or_nik]
