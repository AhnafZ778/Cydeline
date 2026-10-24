#!/bin/sh
set -eu
# A standalone BIOS/SATA Windows base avoids host-specific drivers and writable firmware.
# Every launch writes only to a fresh tmpfs overlay; the base and evidence are immutable.
python3 - <<'PY'
import json, subprocess
info = json.loads(subprocess.check_output(["qemu-img", "info", "--output=json", "/image/windows.qcow2"]))
if info.get("format") != "qcow2" or info.get("backing-filename"):
    raise SystemExit("Windows base must be a standalone qcow2 image without a backing file")
PY
mkdir -p /vm
qemu-img create -f qcow2 -F qcow2 -b /image/windows.qcow2 /vm/session.qcow2
genisoimage -quiet -J -r -V NORTHSTAR -o /vm/evidence.iso /evidence
exec qemu-system-x86_64 \
  -name "Northstar Windows workstation" -enable-kvm -cpu host -smp 2 -m 4096 \
  -machine pc -vga std -display none -vnc 0.0.0.0:1 \
  -drive file=/vm/session.qcow2,format=qcow2,if=ide \
  -drive file=/vm/evidence.iso,format=raw,if=ide,media=cdrom,readonly=on \
  -nic none -monitor none -serial none -no-reboot
