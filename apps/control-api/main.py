import os, secrets
from services.range_runtime.logs import configure_logging

configure_logging()
from pathlib import Path
import httpx
from services.range_runtime.api import create_control
from services.range_runtime.adapter import HttpTargetAdapter

runtime = Path(os.environ.get("RUNTIME_DIR", ".runtime"))
runtime.mkdir(exist_ok=True)
pinfile = runtime / "instructor-pin"
if not pinfile.exists():
    pinfile.write_text(secrets.token_urlsafe(12))
    pinfile.chmod(0o600)
client = httpx.Client(
    base_url=os.environ.get("TARGET_URL", "http://127.0.0.1:8001"),
    headers={"x-range-secret": os.environ["RANGE_SECRET"]},
    timeout=10,
)
app = create_control(
    runtime / "control.sqlite3",
    HttpTargetAdapter(client),
    instructor_pin=os.environ.get("INSTRUCTOR_PIN", pinfile.read_text().strip()),
    local_demo=os.environ.get("LOCAL_DEMO_ACCESS") == "1",
)

from fastapi.staticfiles import StaticFiles

web = Path("apps/web/dist")
if web.exists():
    app.mount("/", StaticFiles(directory=web, html=True), name="web")
