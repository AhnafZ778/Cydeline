import os
from services.range_runtime.logs import configure_logging

configure_logging()
from services.range_runtime.target import create_target

app = create_target(
    os.environ.get("TARGET_DB", "/tmp/cydeline-target.sqlite3"),
    os.environ["RANGE_SECRET"],
)
