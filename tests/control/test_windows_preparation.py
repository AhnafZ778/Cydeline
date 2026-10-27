"""Preparation safety regressions; never start or alter a real VM."""
import importlib.util
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

spec = importlib.util.spec_from_file_location("windows_prep", Path(__file__).resolve().parents[2] / "scripts/prepare_windows.py")
prep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prep)


@pytest.fixture
def private(tmp_path, monkeypatch):
    repo = tmp_path / "repo"
    root = repo / ".runtime" / "windows"
    root.mkdir(parents=True)
    iso = root / "installation.iso"
    iso.write_bytes(b"test media, not bootable")
    monkeypatch.setattr(prep, "ROOT", repo)
    return root, iso


def test_publishable_runtime_is_refused_before_private_files_are_created(private):
    root, iso = private
    destination = prep.ROOT / "docs/windows"
    with pytest.raises(RuntimeError, match="ignored"):
        prep.initialize(destination, iso)
    assert not destination.exists()


def test_dangling_credential_link_never_writes_outside_preparation(private):
    root, iso = private
    outside = root.parent / "outside.json"
    (root / "credentials.json").symlink_to(outside)
    with patch.object(prep.subprocess, "run") as command:
        with pytest.raises(RuntimeError, match="preserved"):
            prep.initialize(root, iso)
    assert not outside.exists()
    command.assert_not_called()


def test_symlink_ancestor_is_refused_without_changing_destination(private):
    root, iso = private
    elsewhere = prep.ROOT / ".runtime" / "other"
    elsewhere.mkdir(mode=0o755)
    link = prep.ROOT / ".runtime" / "linked"
    link.symlink_to(elsewhere, target_is_directory=True)
    with pytest.raises(RuntimeError, match="symlinks"):
        prep.initialize(link / "windows", iso)
    assert not (elsewhere / "windows").exists()
    assert elsewhere.stat().st_mode & 0o777 == 0o755


def test_existing_base_and_permissions_are_preserved(private):
    root, iso = private
    root.chmod(0o750)
    base = root / "windows.qcow2"
    base.write_bytes(b"existing base must survive")
    with pytest.raises(RuntimeError, match="preserved"):
        prep.initialize(root, iso)
    assert base.read_bytes() == b"existing base must survive"
    assert root.stat().st_mode & 0o777 == 0o750


def test_low_storage_refuses_before_credentials_or_disk_creation(private):
    root, iso = private
    with patch.object(prep.shutil, "disk_usage", return_value=SimpleNamespace(free=1024)), patch.object(prep.subprocess, "run") as command:
        with pytest.raises(RuntimeError, match="free"):
            prep.initialize(root, iso)
    assert not (root / "credentials.json").exists()
    command.assert_not_called()


def test_runtime_root_cannot_be_repurposed_as_preparation(private):
    with pytest.raises(RuntimeError, match="subdirectory"):
        prep.private_runtime(prep.ROOT / ".runtime")


def test_display_capture_preserves_existing_sibling_ppm(tmp_path, monkeypatch):
    capture_spec = importlib.util.spec_from_file_location("windows_capture", Path(__file__).resolve().parents[2] / "scripts/capture_windows_vm.py")
    capture = importlib.util.module_from_spec(capture_spec)
    capture_spec.loader.exec_module(capture)
    output = tmp_path / "shot.png"
    sibling = tmp_path / "shot.ppm"
    sibling.write_bytes(b"unrelated existing image")
    monkeypatch.setitem(sys.modules, "PIL", SimpleNamespace(Image=SimpleNamespace(open=lambda _: SimpleNamespace(save=lambda path: Path(path).write_bytes(b"test PNG")))))
    monkeypatch.setattr(sys, "argv", ["capture_windows_vm.py", "owned-vm", "--output", str(output)])
    inspection = b'[{"Config":{"Image":"cydeline-windows:1","Labels":{"cydeline.run":"run_test"}}}]'
    def run(command, **kwargs):
        if command[1] == "cp":
            Path(command[-1]).write_bytes(b"temporary raw capture")
    with patch.object(capture.subprocess, "check_output", return_value=inspection), patch.object(capture.subprocess, "run", side_effect=run):
        capture.main()
    assert sibling.read_bytes() == b"unrelated existing image"
    assert output.read_bytes() == b"test PNG"
