"""Prepare the private, networkless BIOS/IDE Windows workstation base.

This operates only on its explicitly selected preparation directory, never an
existing image or other VM. Installation media/licensing are operator supplied.
Desktop verification is a separate observed step, never inferred from a socket.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import time
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]


def private_runtime(path):
    root = Path(path).expanduser().absolute()
    private = ROOT / ".runtime"
    try:
        relative = root.relative_to(private)
    except ValueError:
        raise RuntimeError("Windows preparation must stay inside this repository's ignored .runtime directory")
    if not relative.parts or any(part == ".." for part in root.parts):
        raise RuntimeError("Choose a private preparation subdirectory, not the runtime root")
    for candidate in (root, *root.parents):
        if candidate.is_symlink():
            raise RuntimeError("Preparation directory and its ancestors cannot be symlinks")
        if candidate == ROOT:
            break
    if root.exists() and (not root.is_dir() or root.stat().st_uid != os.getuid()):
        raise RuntimeError("Preparation directory must belong to the current operator")
    return root


def qmp(root, command, arguments=None):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.settimeout(10)
        sock.connect(str(root / "install.qmp"))
        stream = sock.makefile("rwb")
        json.loads(stream.readline())
        def call(name, args):
            stream.write(json.dumps({"execute": name, "arguments": args or {}}).encode() + b"\n")
            stream.flush()
            while True:
                reply = json.loads(stream.readline())
                if "error" in reply:
                    raise RuntimeError(reply["error"])
                if "return" in reply:
                    return reply["return"]
        call("qmp_capabilities", {})
        return call(command, arguments)


def installer_running(root):
    pidfile = root / "install.pid"
    if not pidfile.exists():
        return False
    try:
        pid = int(pidfile.read_text())
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    # A reused/unknown PID never authorizes overwriting a disk.
    return True


def answer_file(password):
    cleanup = "Remove-Item -LiteralPath C:\\Windows\\Panther\\unattend.xml -Force -ErrorAction SilentlyContinue; Set-Content -Path C:\\Users\\Public\\Desktop\\Sentinel-Loop.txt -Value 'Sentinel Loop training workstation. Use fictional lab data only. No network adapter is connected. The Northstar evidence CD is read-only. Windows evaluation licensing and expiry apply.'"
    encoded = base64.b64encode(cleanup.encode("utf-16le")).decode()
    component = 'processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS"'
    return f'''<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
 <settings pass="windowsPE">
  <component name="Microsoft-Windows-International-Core-WinPE" {component}>
   <SetupUILanguage><UILanguage>en-US</UILanguage></SetupUILanguage><InputLocale>0409:00000409</InputLocale><SystemLocale>en-US</SystemLocale><UILanguage>en-US</UILanguage><UserLocale>en-US</UserLocale>
  </component>
  <component name="Microsoft-Windows-Setup" {component}>
   <DiskConfiguration><Disk wcm:action="add"><DiskID>0</DiskID><WillWipeDisk>true</WillWipeDisk>
    <CreatePartitions><CreatePartition wcm:action="add"><Order>1</Order><Type>Primary</Type><Size>500</Size></CreatePartition><CreatePartition wcm:action="add"><Order>2</Order><Type>Primary</Type><Extend>true</Extend></CreatePartition></CreatePartitions>
    <ModifyPartitions><ModifyPartition wcm:action="add"><Order>1</Order><PartitionID>1</PartitionID><Active>true</Active><Format>NTFS</Format><Label>System</Label></ModifyPartition><ModifyPartition wcm:action="add"><Order>2</Order><PartitionID>2</PartitionID><Format>NTFS</Format><Label>Windows</Label><Letter>C</Letter></ModifyPartition></ModifyPartitions>
   </Disk><WillShowUI>OnError</WillShowUI></DiskConfiguration>
   <ImageInstall><OSImage><InstallFrom><MetaData wcm:action="add"><Key>/IMAGE/INDEX</Key><Value>2</Value></MetaData></InstallFrom><InstallTo><DiskID>0</DiskID><PartitionID>2</PartitionID></InstallTo><WillShowUI>OnError</WillShowUI></OSImage></ImageInstall>
   <UserData><AcceptEula>true</AcceptEula><FullName>Northstar Lab</FullName><Organization>Sentinel Loop</Organization></UserData>
  </component>
 </settings>
 <settings pass="specialize"><component name="Microsoft-Windows-Shell-Setup" {component}><ComputerName>NORTHSTAR-LAB</ComputerName><TimeZone>Bangladesh Standard Time</TimeZone></component></settings>
 <settings pass="oobeSystem"><component name="Microsoft-Windows-Shell-Setup" {component}>
  <OOBE><HideEULAPage>true</HideEULAPage><HideOnlineAccountScreens>true</HideOnlineAccountScreens><HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE></OOBE>
  <UserAccounts><AdministratorPassword><Value>{escape(password)}</Value><PlainText>true</PlainText></AdministratorPassword></UserAccounts>
  <AutoLogon><Password><Value>{escape(password)}</Value><PlainText>true</PlainText></Password><Username>Administrator</Username><Enabled>true</Enabled><LogonCount>2</LogonCount></AutoLogon>
  <FirstLogonCommands><SynchronousCommand wcm:action="add"><Order>1</Order><Description>Prepare local training desktop and remove cached answer file</Description><CommandLine>powershell.exe -NoProfile -EncodedCommand {encoded}</CommandLine></SynchronousCommand></FirstLogonCommands>
 </component></settings>
</unattend>'''


def initialize(root, iso):
    root = private_runtime(root)
    root.mkdir(parents=True, exist_ok=True)
    if any(os.path.lexists(root / name) for name in ("windows.qcow2", "installing.qcow2", "setup.json", "credentials.json", "answer", "answer.iso", "install.pid", "install.qmp", "install.vnc")):
        raise RuntimeError("Existing preparation/base preserved; use status/start, never initialize over it")
    if not iso.is_file() or iso.suffix.lower() != ".iso" or "," in str(iso):
        raise RuntimeError("A complete Windows installation ISO is required")
    if shutil.disk_usage(root).free < 38 * 1024**3:
        raise RuntimeError("At least38GiB free is required for the initial sparse-image installation budget; the40GiB virtual disk is not fully reserved")
    root.chmod(0o700)
    password = "Sl!" + secrets.token_urlsafe(21) + "9a"
    source = root / "answer"
    source.mkdir(mode=0o700)
    with (source / "Autounattend.xml").open("x") as file:
        file.write(answer_file(password))
    (source / "Autounattend.xml").chmod(0o600)
    creds = root / "credentials.json"
    with creds.open("x") as file:
        file.write(json.dumps({"username": "Administrator", "password": password}, indent=2) + "\n")
    creds.chmod(0o600)
    subprocess.run(["docker", "run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--user", f"{os.getuid()}:{os.getgid()}",
                    "--mount", f"type=bind,src={root},dst=/prep", "--entrypoint", "genisoimage", "cydeline-windows:1",
                    "-quiet", "-J", "-r", "-V", "SLSETUP", "-o", "/prep/answer.iso", "/prep/answer"], check=True, timeout=60)
    subprocess.run(["qemu-img", "create", "-q", "-f", "qcow2", str(root / "installing.qcow2"), "40G"], check=True)
    (root / "installing.qcow2").chmod(0o600)
    (root / "setup.json").write_text(json.dumps({"iso": str(iso), "image_index": 2, "network": "none", "desktop_verified": False}, indent=2) + "\n")
    return {"prepared": True, "credentials_file": str(creds), "next": "start; inspect screenshot until actual desktop; powerdown; finalize"}


def start(root):
    if installer_running(root):
        raise RuntimeError("Preparation VM is already running")
    if (root / "windows.qcow2").exists():
        raise RuntimeError("Base already finalized; use the worker's disposable overlay")
    state = json.loads((root / "setup.json").read_text())
    memory = {line.split(":")[0]: int(line.split()[1]) for line in Path("/proc/meminfo").read_text().splitlines() if line.startswith("MemAvailable:")}
    if memory.get("MemAvailable", 0) < 6 * 1024**2 or not os.access("/dev/kvm", os.R_OK | os.W_OK):
        raise RuntimeError("Preparation needs KVM and6GiB available memory (4GiB guest+2GiB reserve)")
    subprocess.run(["qemu-system-x86_64", "-name", "Sentinel Windows image preparation", "-enable-kvm", "-cpu", "host", "-smp", "2", "-m", "4096", "-machine", "pc", "-vga", "std", "-display", "none",
                    "-vnc", "unix:" + str(root / "install.vnc"), "-qmp", "unix:" + str(root / "install.qmp") + ",server=on,wait=off", "-pidfile", str(root / "install.pid"), "-daemonize",
                    "-drive", "file=" + str(root / "installing.qcow2") + ",format=qcow2,if=ide,index=0",
                    "-drive", "file=" + state["iso"] + ",format=raw,if=ide,index=1,media=cdrom,readonly=on",
                    "-drive", "file=" + str(root / "answer.iso") + ",format=raw,if=ide,index=2,media=cdrom,readonly=on",
                    "-boot", "order=c,once=d,menu=on", "-nic", "none", "-serial", "none", "-monitor", "none"], check=True, timeout=30)
    return {"started": True, "network": "none", "display": "private Unix socket; use screenshot"}


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", default=str(ROOT / ".runtime/windows"))
    parser.add_argument("command", choices=("init", "start", "status", "screenshot", "boot-key", "powerdown", "finalize"))
    parser.add_argument("--iso")
    parser.add_argument("--desktop-verified", action="store_true")
    args = parser.parse_args()
    root = private_runtime(args.runtime)
    if "," in str(root) or len(str(root / "install.qmp")) >= 100:
        raise RuntimeError("Preparation path contains a comma or is too long for private sockets")
    if args.command == "init":
        if not args.iso:
            parser.error("init requires --iso")
        result = initialize(root, Path(args.iso).expanduser().resolve())
    elif args.command == "start":
        result = start(root)
    elif args.command == "status":
        result = {"running": installer_running(root), "base_exists": (root / "windows.qcow2").is_file()}
        if result["running"]:
            result["qemu"] = qmp(root, "query-status")
    elif args.command == "screenshot":
        result = qmp(root, "screendump", {"filename": str(root / "screen.ppm")})
        from PIL import Image
        Image.open(root / "screen.ppm").save(root / "screen.png")
        result = {"screenshot": str(root / "screen.png")}
    elif args.command == "boot-key":
        result = qmp(root, "send-key", {"keys": [{"type": "qcode", "data": "ret"}]})
    elif args.command == "powerdown":
        result = qmp(root, "system_powerdown")
    else:
        if not args.desktop_verified or installer_running(root) or (root / "windows.qcow2").exists():
            raise RuntimeError("Finalize requires an observed desktop, a stopped preparation VM and no existing base")
        disk = root / "installing.qcow2"
        info = json.loads(subprocess.check_output(["qemu-img", "info", "--output=json", str(disk)]))
        if info.get("format") != "qcow2" or info.get("backing-filename"):
            raise RuntimeError("Base must be standalone qcow2")
        subprocess.run(["qemu-img", "check", str(disk)], check=True, timeout=120)
        # Parent stays0700; only the runner receives this file's read group.
        # This preserves cap-drop ALL and keeps the read-only mount usable.
        disk.chmod(0o640)
        disk.rename(root / "windows.qcow2")
        state = json.loads((root / "setup.json").read_text())
        state.update(desktop_verified=True, finalized_at=time.time())
        (root / "setup.json").write_text(json.dumps(state, indent=2) + "\n")
        result = {"base": str(root / "windows.qcow2"), "desktop_verified": True}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
