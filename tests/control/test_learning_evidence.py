import json
from unittest import mock

import pytest
from scripts.learning_evidence import atomic_json, validate_records


def test_failed_atomic_replace_preserves_existing_checkpoint(tmp_path):
    path = tmp_path / "summary.json"
    atomic_json(path, {"cases": [{"id": "first", "passed": False}]})
    before = path.read_bytes()
    with mock.patch("scripts.learning_evidence.os.replace", side_effect=OSError("interrupted")):
        with pytest.raises(OSError):
            atomic_json(path, {"cases": []})
    assert path.read_bytes() == before
    assert list(tmp_path.iterdir()) == [path]


def test_atomic_checkpoint_replaces_complete_valid_json(tmp_path):
    path = tmp_path / "summary.json"
    atomic_json(path, {"cases": []})
    atomic_json(path, {"cases": [{"id": "complete"}]})
    assert json.loads(path.read_text()) == {"cases": [{"id": "complete"}]}


@pytest.mark.parametrize("records", [[{"id":"unknown"}], [{"id":"one","question":"changed"}], [{"id":"one","question":"original"}, {"id":"one","question":"original"}]])
def test_resume_rejects_unknown_changed_and_duplicate_records(records):
    with pytest.raises(ValueError):
        validate_records(records, {"one":{"question":"original"}}, ["question"])


def test_resume_accepts_partial_manifest_and_preserves_failure():
    records = [{"id":"one", "question":"original", "passed":False}]
    validate_records(records, {"one":{"question":"original"}, "two":{"question":"next"}}, ["question"])
    assert records[0]["passed"] is False
