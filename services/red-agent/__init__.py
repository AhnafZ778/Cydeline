"""Bounded local red-agent — schemas, sanitized observations, validator, fallback.

**Segment:** `tanvir-red-agent` · **Schema version:** see ``__version__``

Import note
-----------
``services/red-agent`` contains a hyphen, so it is not an addressable Python
package. Treat this directory as a *source root*:

.. code-block:: python

    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path("services/red-agent").resolve()))
    from observation import build_sanitized_observation
    from validator import validate_action
    from fallback import decide_with_fallback

``tests/agent/`` does exactly this, and so will Saad's ``apps/control-api/``. When
``contracts/`` (Increment S1) lands, these modules gain thin adapter functions
and the source root stays internal.

Security invariants (do not relax without a contract change)
------------------------------------------------------------
* ``0`` out-of-policy actions may ever be accepted (FR-B04, T-01).
* Handles and target ids are matched **verbatim** against the observation
  allowlist; they are never normalised, case-folded or repaired.
* The model never produces ``fallback_used``; that flag is service provenance.
* The observation builder has no parameter for hidden truth, scores or tokens.
"""

from __future__ import annotations

import sys
from pathlib import Path

if __package__:  # imported as part of a package (future contracts/ wiring)
    from . import (
        fallback,
        observation,
        ollama_client,
        prompts,
        schemas,
        service,
        validator,
    )
else:  # imported as a top-level module: this directory is its own source root
    _SRC_ROOT = Path(__file__).resolve().parent
    if str(_SRC_ROOT) not in sys.path:
        sys.path.insert(0, str(_SRC_ROOT))
    import fallback
    import observation
    import ollama_client
    import prompts
    import schemas
    import service
    import validator

__version__ = schemas.RED_AGENT_SCHEMA_VERSION

__all__ = [
    "__version__",
    "fallback",
    "observation",
    "ollama_client",
    "prompts",
    "schemas",
    "service",
    "validator",
]
