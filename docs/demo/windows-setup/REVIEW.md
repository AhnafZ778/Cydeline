# Independent local Windows preparation review

Date: 2026-10-25. Fresh proportional evaluator context. Source and mocked lifecycle checks only; no live installer input, QMP action, process closure, image modification or other VM operation was performed by this reviewer.

Current source disposition: **SCOPED PASS after path/privacy guard fixes.** Actual desktop, clean shutdown/finalized image and authenticated Guacamole behavior are separate pending runtime evidence.

## Initial disposition (superseded by source recheck below)

**FAIL — two related P2 path/private-file findings; actual desktop and Guacamole remain pending.** This concerns only the authorized local networkless workstation setup. Full sealed range B and timed opponent C remain unqualified.

1. **P2 — dangling private-file symlink bypasses no-overwrite boundary.** `initialize` uses `.exists()` for `credentials.json`/disk/setup and rejects only a final-component root symlink. A harmless isolated temporary directory with `prep/credentials.json` as a dangling symlink to a sibling nonexistent JSON path bypassed the check. With Docker/qemu subprocesses mocked, `initialize` followed the link, wrote credential bytes outside the selected prep directory, and returned prepared=true. Reject linked ancestors and all existing directory entries conservatively, and create private files exclusively without following links. No actual user credential was read or printed.

2. **P2 — custom in-repository runtime can publish private setup files.** The CLI accepts `--runtime docs/windows-prep` or any other repo folder. `.gitignore` only protects `.runtime/`; `git check-ignore` confirmed `docs/windows-prep/credentials.json` and `docs/windows-prep/answer/Autounattend.xml` are not excluded. The script generates clear setup credentials and answer media there. Restrict repo-local prep to ignored private storage (or explicitly check that all private outputs are excluded before writing); keep runtime paths outside Git otherwise.

Minor clarity issue: the free-space guard requires38GiB while claiming a40GiB disk plus headroom. Use a declared reserve consistent with the maximum sparse disk allocation, or describe the measured installation envelope without claiming full allocation reserve.

## Performed checks and observations

- Three mocked native checks passed: generated start command uses no NIC, private Unix VNC/QMP sockets,4GiB/two CPUs and no serial/monitor; insufficient available memory refuses before process launch; an existing base is preserved without any subprocess launch.
- Two mocked launcher wiring checks passed: explicit `--windows-image` overrides the environment and persists the selected path; a later launch reuses the saved path when no environment override is present. No child service was actually started.
- Source shows Docker answer-media creation with no network, read-only root filesystem, dropped capabilities and invoking UID/GID; QEMU preparation has no filesystem sharing/host mount. The selected prep directory is0700, XML/credential files0600, and no credential value is printed by the script.
- The existing worker verifies standalone qcow2 format at actual container launch; base/evidence are mounted read-only and writes use a disposable overlay. Launcher path selection alone does not prove image readiness.
- Finalization requires the explicit observed-desktop flag, stopped installer PID and qemu-img validation. This is operator attestation, not automated proof of a Windows desktop. PID reuse is handled conservatively, but the final lifecycle guard must be reviewed after path fixes.

## Media and acceptance limits

The coordinator reports an official Microsoft Windows Server2022evaluation ISO from fwlink2195280,5044094976bytes,SHA-256 `3e4fa6d8507b554856fc9ca6079cc402df11a8b79344871669f0251535255325`. This evaluator did not reread/hash the5GB media while the installation was active. Index2 is selected in the answer file. WIM index2 InstallationType/Desktop Experience must be verified from the actual media; internal SERVERSTANDARD descriptions alone do not prove desktop edition selection.

No actual desktop, clean shutdown, finalized base, actual authenticated Guacamole display/input, current-user resource load, ten resets or sealed host boundary has been independently observed here. Evaluation licensing/activation/expiry remains applicable; no bypass is approved. The existing10/12model objective failure and other learning gates remain unchanged.

## Initial source identity

Branch: `chore/publish-workstreams`; HEAD: `dffe457a3dacc83d970b515b9451d02ae63a540c`; dirty tree.

| File | SHA-256 |
| --- | --- |
| `scripts/prepare_windows.py` | `5d60c2bf0328007cf91e88fc5705b53dfffb516a437239e265cf648a1c9a1d60` |
| `scripts/run_local.py` | `a9fea5594d0f14f693beb1faa51e0cbe3e6817c7ad0cc397c8ed7945b0452408` |
| `services/range_runtime/tool_worker.py` | `2e4025f71a41602e8a8ba5fcaa5d55fd22c45efdf23f15b0c7366a583f7a0aea` |
| `infra/range/start-windows.sh` | `4166d93c7878734cfd0df24020ce2fdbfa20f16a12b26b55c3a6d4704a0d1a10` |
| `.gitignore` | `0801669bcf9369f04151e2b57b2d9ca769eb3eca74bcb3072e125f523eeeb2a8` |

## Independent guard/wiring recheck — scoped source PASS

`private_runtime` now restricts CLI preparation operations to a subdirectory of this repository’s ignored `.runtime`, rejects `..`, root/ancestor symlinks, the runtime root itself and a wrong-owner destination. Initialization rejects existing entries with `lexists` before altering directory permissions; answer and credential files use exclusive creation. CLI umask077 applies to private setup/socket creation. These changes resolve both reproduced path/privacy findings without changing the running installer. The disk guard now accurately describes38GiB as an initial sparse-installation budget, not a full40GiB disk reservation.

Fresh command: `.venv/bin/python -m pytest tests/control/test_windows_preparation.py tests/control/test_optional_tools.py -q`: **24 passed** (six preparation safety regressions and18 existing optional-tool tests),0.26seconds. The new regressions directly cover the previously reproduced dangling-credential path and publishable runtime, symlink ancestor, existing-base/permissions preservation, low disk and runtime-root refusal. Source compilation of both scripts also passed.

The independently performed mocked start checks and launcher persistence/precedence checks described above passed. The launch wiring source is unchanged from that mocked check. No preparation/VM or service subprocess was actually launched by this reviewer.

Read `.runtime/windows/image-metadata.json`: index2 is SERVERSTANDARD with `installation_type=Server`; the Core indexes1/3 have `Server Core`. This resolves the incorrect assumption that the internal image name must literally include “Desktop Experience.” Metadata selection is still not proof of a booted interactive desktop. Read the non-secret media manifest: it explicitly states that the recorded hash was not compared with an independently published vendor checksum. No private answer file, credential value or guest image was read or copied into this report.

No remaining actionable defect was identified in this bounded source review. Final actual desktop, clean shutdown, image finalization and authenticated Guacamole observation remain the coordinator’s required runtime checks. A QMP/VNC readiness signal alone cannot satisfy them. Full dedicated-host/network/isolation/load qualification, read-only observer VM recording, timed authority and model/learning gates remain separate. The coordinator owns final shared context checkpoints and stable Harness receipts.

### Final source identity

| File | SHA-256 |
| --- | --- |
| `scripts/prepare_windows.py` | `5d60c2bf0328007cf91e88fc5705b53dfffb516a437239e265cf648a1c9a1d60` |
| `scripts/run_local.py` | `a9fea5594d0f14f693beb1faa51e0cbe3e6817c7ad0cc397c8ed7945b0452408` |
| `tests/control/test_windows_preparation.py` | `62b1f23316345b5afe8e2c39ea7223dc1fc3b4a5276db36d1ba9e594fa59469a` |
| `services/range_runtime/tool_worker.py` | `2e4025f71a41602e8a8ba5fcaa5d55fd22c45efdf23f15b0c7366a583f7a0aea` |
| `infra/range/start-windows.sh` | `4166d93c7878734cfd0df24020ce2fdbfa20f16a12b26b55c3a6d4704a0d1a10` |
| `.gitignore` | `0801669bcf9369f04151e2b57b2d9ca769eb3eca74bcb3072e125f523eeeb2a8` |

## Consequential private-image permission and diagnostic review

The coordinator reproduced a real capability-dropped container’s inability to read a host-user-owned0600 base. Source fix: finalization uses0640 while preserving the0700 prep parent; the Windows runner alone receives the file’s supplementary GID; the read-only base bind and `--cap-drop ALL` remain. Preflight rejects an unreadable non-root-owned image with a specific reason. This is a narrow read-permission repair, not new container capabilities or a writable base.

Fresh `.venv/bin/python -m pytest tests/control/test_windows_preparation.py tests/control/test_optional_tools.py -q`: **24 passed**,0.22seconds. The Windows worker fixture now uses a real temporary file GID and asserts the exact `--group-add` value plus immutable mount. The reviewer did not run/stop a real container.

Viewed `docs/demo/windows-setup/desktop-preparation.png`: it visibly contains the Windows desktop, taskbar, Recycle Bin and Sentinel-Loop file. This supports an observed preparation desktop, not authenticated Guacamole interaction. Clean shutdown/qemu-img finalization are coordinator evidence, not independently executed by this reviewer.

**Diagnostic P2 finding — output sibling clobber (pending fix).** `scripts/capture_windows_vm.py` uses `output.with_suffix('.ppm')` for an intermediate `docker cp` file and then unlinks it. A fully mocked Docker run in a temporary directory, with pre-existing unrelated `shot.ppm` and requested output `shot.png`, overwrote then deleted the unrelated sibling while returning a PNG. Use a uniquely allocated temporary directory/file for the intermediate copy, leaving only the explicitly selected output as a mutation. The VNC source otherwise sends protocol negotiation/framebuffer requests only; it contains no keyboard, pointer, clipboard, grant or navigation messages and reads only127.0.0.1 inside the explicitly labelled Windows runner.

Dependency observation: system `python3` has Pillow here; project `.venv/bin/python` does not. The first mocked diagnostic attempt under `.venv` failed on the missing dependency after its copy step; the same harmless reproduction under system Python confirmed the clobber. Document the supported runtime or load the dependency before any diagnostic/container operation. This is not a live Windows failure.

Source hashes at this review:

| File | SHA-256 |
| --- | --- |
| `scripts/prepare_windows.py` | `b209e366db838d15b273558ba14a6320973256bf38a8c9a236aa4b38af10193d` |
| `services/range_runtime/tool_worker.py` | `4d794e479b0340a6a83cd1619c4f6a452d4547611e738a5d748836558951ec18` |
| `tests/control/test_optional_tools.py` | `648fb26fe7985ea8cb3993807bac5e9de5ffc0ca2ed3252bfeca2d6e74a298e7` |
| `scripts/capture_windows_vm.py` | `15225f9b19b8fa4eff9cb952d0e7461a51cac5605dd1cfe825a0eb54b97f8cc6` |
| `docs/demo/windows-setup/desktop-preparation.png` | `82fe02bfe5625d278660973e80505bca311c6a8ae9f09ca0c4018967311f70a1` |

## Final consequential-fix recheck — scoped source PASS

The diagnostic now allocates its intermediate PPM in a fresh `TemporaryDirectory` and imports Pillow before any Docker operation. Fresh `.venv/bin/python -m pytest tests/control/test_windows_preparation.py tests/control/test_optional_tools.py -q`: **25 passed**,0.21seconds. Source compilation of all three local scripts passed. The added public-seam regression checks sibling preservation with mocked Docker/Pillow.

An independent repeat under the actual system Pillow implementation created the requested `shot.png` while preserving a pre-existing sibling `shot.ppm` byte-for-byte; every Docker interaction was mocked and all files were in an isolated temporary directory. An independent check under the project interpreter, which lacks Pillow, confirmed failure before both Docker inspect and Docker exec/cp. The diagnostic P2 is resolved.

Independent preflight checks on a harmless temporary placeholder image also confirm non-root0600 refusal with the specific group-read message and0640 acceptance (KVM access mocked). Together with source inspection and the exact group assertion, no remaining actionable defect was found in this permission repair or diagnostic.

Viewed `docs/demo/windows-setup/desktop-worker.png`: a Windows desktop and Server Manager are visible, supporting a real finalized-base worker boot. The coordinator’s `gateway-summary.json` additionally records Guacamole HTTP200, signed-grant authentication, registered VNC connection, no guest NIC or VM published port, read-only base/evidence and all capabilities dropped with the image’s supplementary group. Those API/container assertions are coordinator-produced evidence; this evaluator independently inspected the saved image and source, not an interactive browser session. At the inspected summary snapshot, proof-run cleanup and unchanged-base rehash were still pending; they must be completed and recorded before marking that runtime proof finished.

**Browser-rendered Sandbox remains unverified:** the browser URL policy refused access. Neither this source pass nor an RFB screenshot/API response substitutes for browser rendering and keyboard/mouse delivery. This reviewer performed no live VM/container control, navigation workaround, grant reuse or private credential inspection. Full sealed range B, observer VM streaming/recording, timed opponent C, host load and existing failed model/learning gates remain separate.

### Final consequential-fix source/evidence identity

| File | SHA-256 |
| --- | --- |
| `scripts/prepare_windows.py` | `b209e366db838d15b273558ba14a6320973256bf38a8c9a236aa4b38af10193d` |
| `scripts/run_local.py` | `a9fea5594d0f14f693beb1faa51e0cbe3e6817c7ad0cc397c8ed7945b0452408` |
| `scripts/capture_windows_vm.py` | `15225f9b19b8fa4eff9cb952d0e7461a51cac5605dd1cfe825a0eb54b97f8cc6` |
| `services/range_runtime/tool_worker.py` | `4d794e479b0340a6a83cd1619c4f6a452d4547611e738a5d748836558951ec18` |
| `tests/control/test_optional_tools.py` | `648fb26fe7985ea8cb3993807bac5e9de5ffc0ca2ed3252bfeca2d6e74a298e7` |
| `tests/control/test_windows_preparation.py` | `7252bf02e052918db1214b308af61086d06344e1b879a9c7ee7b16657d4b35fc` |
| `infra/range/start-windows.sh` | `4166d93c7878734cfd0df24020ce2fdbfa20f16a12b26b55c3a6d4704a0d1a10` |
| `docs/demo/windows-setup/desktop-preparation.png` | `82fe02bfe5625d278660973e80505bca311c6a8ae9f09ca0c4018967311f70a1` |
| `docs/demo/windows-setup/desktop-worker.png` | `5219e07ad0e1f1749afdcb2fe55fceeeb79d2013da298101ecd0ced262041a9a` |
| `docs/demo/windows-setup/gateway-summary.json` | `c25ee7ed13e85c575645583f680d48b2cc15914d30b4a474bc3c5685a2cdb373` |

## Final artifact reconciliation

Read the updated coordinator artifacts after its own proof cleanup. `gateway-summary.json` now records that only its validation generation was stopped, network cleanup passed, and base hashes before/after are identical (`eff1e781fafa2439e176db331143748d125b8954a07f91a3e80a046849861194`). This resolves the previously pending cleanup/base-integrity evidence in that proof. The reviewer did not independently stop a VM or rehash the private guest image.

Verified every source hash in `setup-summary.json` against current files; all six match the evaluated source. The summary retains activation not performed, rendered Sandbox unverified due browser URL policy, and full B/C host qualification not performed. These limits remain unchanged. No additional source changes or broader runtime/browser claims are approved by this reconciliation.

Final artifact SHA-256:

- `gateway-summary.json`: `c25ee7ed13e85c575645583f680d48b2cc15914d30b4a474bc3c5685a2cdb373`
- `setup-summary.json`: `0f3a2718c0b8231dfe10f1e2d5b5b897ece2288f0bfb9f161e0f5bffae730278`
