import os
from services.range_runtime.logs import configure_logging

configure_logging()
from services.range_runtime.tool_worker import create_worker

app = create_worker(
    os.environ.get("TOOL_RUNTIME_DIR", ".runtime/tools"), os.environ["RANGE_SECRET"]
)
