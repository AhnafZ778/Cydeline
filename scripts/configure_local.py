"""Generate local Compose secrets without printing them."""

import secrets
from pathlib import Path

path = Path(".runtime")
path.mkdir(exist_ok=True)
env = path / "compose.env"
if not env.exists():
    env.write_text(
        "RANGE_SECRET="
        + secrets.token_urlsafe(32)
        + chr(10)
        + "INSTRUCTOR_PIN="
        + secrets.token_urlsafe(16)
        + chr(10)
    )
    env.chmod(0o600)
print("Local configuration: .runtime/compose.env. Keep this file private.")
