# Windows workstation in the browser

The original SOC practice tabs use the accepted d93b640 layout. New live missions, skills/progress, learner training, instructor tools, evidence assistant, assets/access, business activity and analyst tools remain additional views. Open Live missions from the original console; each live run retains its server-backed response and evidence workflow. The original Sandbox now opens the same Windows desktop profile as Analyst Workstation.

## Implementation and current limit

Browser → Apache Guacamole (short-lived signed connection grant) → private guacd → private QEMU VNC display → actual Windows guest. Windows runs on the host under KVM; the browser receives display updates and sends mouse/keyboard input. There is no imitation Windows UI and no Linux fallback. This follows Apache's documented remote-desktop gateway architecture; it does not assert how any proprietary simulator is internally hosted.

The guest has no network adapter. Only released exercise evidence is attached as a read-only evidence CD; no target answers, Docker socket, host home, or service secrets enter the guest. Each launch uses a disposable qcow2 overlay; stopping/lease expiry removes its container and overlay, leaving the base untouched. Evidence is a launch-time snapshot; relaunch to refresh the guest drive after more events have been released. The VM display being ready means QEMU is accepting input; Windows may still be booting.

**Actual Windows boot is unverified until a prepared Windows image is supplied.** Docker and /dev/kvm are present on this host. No Windows image was present during implementation. The worker reports this prerequisite explicitly and does not start Linux instead. Local browser access uses loopback; remote deployment additionally needs an authenticated HTTPS/WebSocket reverse proxy and a reachable gateway origin, rather than learner-side 127.0.0.1.

## Prepare a compatible base once

Use your Windows installation media. The initial supported image format is a **standalone BIOS/IDE qcow2** with Desktop Experience (for example Windows Server 2022 Desktop Experience). Windows 11 images installed for UEFI/TPM require a separate UEFI firmware/TPM provisioning path and are not supported by this initial BIOS profile. A Server Core image will not provide a familiar desktop.

Create the base in the ignored runtime folder:

```bash
mkdir -p .runtime/windows
qemu-img create -f qcow2 .runtime/windows/windows.qcow2 64G
qemu-system-x86_64 -enable-kvm -cpu host -smp 2 -m 4096 -machine pc -vga std -drive file=.runtime/windows/windows.qcow2,format=qcow2,if=ide -cdrom /absolute/path/to/windows.iso -boot d -nic none -vnc 127.0.0.1:1
```

Connect a VNC client to localhost:5901, finish the Windows desktop installation and install any analyst tools from approved offline media. Keep the lab login credentials available for your learners. Shut Windows down cleanly and stop the preparation VM before using the base; do not modify the base while exercise overlays are running. Windows licensing/activation remains the operator's responsibility.

## Build and launch

```bash
docker build -f infra/range/Dockerfile.windows -t cydeline-windows:1 .
WINDOWS_BASE_IMAGE="$PWD/.runtime/windows/windows.qcow2" .venv/bin/python scripts/run_local.py
```

The worker requires at least 6 GiB available memory and read/write access to /dev/kvm. Windows receives 4 GiB, two CPUs and a 5 GiB container limit. The base is mounted read-only; scratch writes use the removable container layer. The system disk and evidence CD use IDE for compatibility with inbox Windows drivers. Missing image/KVM/memory produces a visible prerequisite error without changing case data.

Open a live mission, then Sandbox → choose that exercise → Launch Windows. Or use Live missions → exercise → Analyst Workstation → Windows workstation. The gateway opens inline or in a full browser tab and supports stop/reconnect. Elastic Security remains available as the other tool profile; only one optional tool runs per exercise.

## Sources

- https://guacamole.apache.org/doc/gug/guacamole-architecture.html
- https://guacamole.apache.org/doc/gug/json-auth.html
- https://www.qemu.org/docs/master/system/invocation.html
- https://www.qemu.org/docs/master/tools/qemu-img.html
- https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server-2022

## Live prerequisite audit — 24 October 2026 (Asia/Dhaka)

The user reported no visible Windows desktop. Read-only host inspection confirmed that all four running range workers had WINDOWS_BASE_IMAGE unset, both documented default disk paths were absent, and no Docker containers were active. The Windows runner and Guacamole images are installed, and /dev/kvm exists with read/write access. Available memory was about 2.2GiB, below the unchanged 6GiB launch requirement. No compatible Windows qcow2 or Windows installation ISO was found in the checked project runtime, dedicated review runtime or Downloads paths. This is a setup blocker, not a verified Windows boot or display. Do not describe the synthetic gateway proof as an actual Windows desktop test.

Next atomic setup action: identify a compatible operator-provided BIOS/IDE Windows desktop image or installation medium, prepare the standalone qcow2, free at least 6GiB available RAM, then restart the selected worker with WINDOWS_BASE_IMAGE set and verify real guest boot through Sandbox. No installation/download or app closure was performed during this audit.
