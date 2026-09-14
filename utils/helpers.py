import re
from datetime import datetime, timezone

def clean_name(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9-]+", "-", value.lower()).strip("-")
    return value[:90] or "ticket"

def now_iso():
    return datetime.now(timezone.utc).isoformat()
