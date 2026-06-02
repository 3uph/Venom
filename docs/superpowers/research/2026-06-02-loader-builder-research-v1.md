# Loader Builder Module — Research v1 (state-of-the-art through Q2 2025)

> Snapshot date: 2026-06-02. Will be extended with 2026 findings in v2.

## Scope

This document is the seed for the Venom `loader-builder` module. Tracks cutting-edge EDR evasion techniques applicable to a stub loader that takes raw shellcode in and emits a stealthy Windows artifact out.

## Categories

A modern loader (2025) must cover all 6 EDR detection vectors simultaneously:

1. User-mode NTDLL hooking → unhook / indirect syscalls
2. ETW + AMSI user-mode telemetry → patchless HW breakpoints
3. Kernel callbacks (PsSetCreateProcessNotifyRoutine, PsSetLoadImageNotifyRoutine, ETW-Ti) — minimize IOCs
4. Memory scanners (in-process + remote) → sleep obfuscation, RWX avoidance
5. Call stack analysis (kernel ETW callstacks) → call stack spoofing
6. Static analysis of artifact on disk → string obfuscation, control-flow flattening, signing

## 1. Syscall execution layer

| Technique | Status | Notes |
|-----------|--------|-------|
| Direct syscalls (Hell's Gate) | burned | SSN-only, EDR detects `syscall;ret` outside ntdll |
| Halo's Gate | partial | variant iterating hooked stub |
| Tartarus Gate | partial | handles inline hooks |
| **Indirect syscalls (Hell's Hall, HellHall)** | viable | JMP to real `syscall` instr inside ntdll → callstack points to ntdll |
| RecycledGate | viable | random ntdll syscall reuse |
| Tartarus-TpAllocInject | viable | Tartarus + thread pool inject |

Recommendation default: indirect syscalls (Hell's Hall) with dynamic SSN resolution via API hash.

## 2. Module unhooking

| Technique | Status |
|-----------|--------|
| Manual ntdll mapping from disk (`\KnownDlls\ntdll.dll`) | viable |
| **Perun's Fart** (clean ntdll from suspended process) | recommended default |
| **Phantom DLL Hollowing** (TxF map signed DLL, overwrite .text in-memory mapping) | advanced |
| Selective in-memory syscall unhooking | stealth |
| RefleXXion | viable |

## 3. Sleep obfuscation

Required only if loader embeds beacon/stage-2.

| Technique | Mechanism |
|-----------|-----------|
| Ekko | timer-queue callbacks chain, RC4 + RW↔RX via NtProtectVirtualMemory |
| Zilean | TpSetWait timer callbacks variant — lower telemetry |
| FOLIAGE (Nighthawk) | APC sequence passing contexts — SetThreadContext detectable |
| Cronos | waitable timers + RC4 + RW↔RX — cleaner than Ekko |
| DeathSleep | kills thread, restores stack at wake — maximum stealth |

## 4. Call stack spoofing

| Technique | Trade-off |
|-----------|-----------|
| SilentMoonwalk | ROP-based desync, fully dynamic, complex |
| VulcanRaven | synthetic via mirror real thread stack |
| LoudSunRun | compact, supports indirect syscall + N args |
| DreamWalkers | improves Moonwalk, smaller codesize |

Recommendation: LoudSunRun on every API call during payload execution and during sleep.

## 5. ETW + AMSI bypass

| Technique | Detection |
|-----------|-----------|
| Patchless via HW breakpoints + VEH | no bytes modified, evades memory scanners |
| `NtContinue` to set DR registers without `EtwTiLogSetContextThread` | viable |
| EtwEventWrite RET patch (`0xC3`) | partial burn, fast |
| AmsiScanBuffer return patching | classic burn |
| AMSI Write Raid (token swap) | viable |
| COM hijack for AMSI provider | advanced |

## 6. Process injection technique

| Technique | Status |
|-----------|--------|
| CreateRemoteThread | fully burned |
| Early Bird APC | partial, low IOC |
| **Early Cascade Injection** (Outflank 2024) | top stealth, hijack Shim engine callback, no cross-process APC |
| **PoolParty** (8 variants, worker factories + I/O completion + timer queue) | 100% bypass vs top 5 EDRs (SafeBreach) |
| Thread Hijacking | classic, detected |
| **Threadless Injection** (function pointer hijack in NtdllDispatch) | cutting-edge, no new thread |
| Module Stomping / Module Overloading | classic |
| ModuleShifting (python ctypes variant) | viable |
| FunctionStomping | viable |
| Process Hollowing | burned |
| Process Ghosting (delete-pending + section map) | advanced |
| Process Doppelgänging / Herpaderping | partial |
| Mavinject LOLBin | burned for modern EDR |

## 7. Memory protection

| Strategy | Pros |
|----------|------|
| RWX zone | trivial, auto-detected |
| RW→RX flip via NtProtectVirtualMemory after write | recommended default |
| Execute-only (RA) | CET-aware, Win11 24H2 |
| No alloc — use existing .text (Module/Function Stomp) | breaks legit DLL |

## 8. Shellcode encryption + encoding

| Encryption | Encoding |
|------------|----------|
| XOR multibyte rotating key | IPv4 array strings (IPfuscation — Hive) |
| RC4 (Ekko default) | IPv6 array strings |
| AES-128/256 CBC | MAC address strings |
| AES-256 CTR | UUID strings (RPC `UuidFromStringA`) |
| ChaCha20 | Shikata Ga Nai (polymorphic XOR feedback) |
| Stagewise (decrypt chunk by chunk) | Fountain code |

Default recommended: AES-256 CTR + UUID encoding.

## 9. API hashing

| Hash | Status |
|------|--------|
| DJB2 | classic, generic signatures exist |
| ROR13 | Cobalt/Metasploit signal, burned |
| **DJB2 + per-build random seed** | defeats signatures |
| CRC32 / FNV-1a | uncommon |
| Random hash function generated per build with embedded seed | best evasion |

## 10. Anti-analysis / anti-VM / anti-debug

- PEB BeingDebugged + NtGlobalFlag
- HW breakpoints check (own DR0-3)
- IsDebuggerPresent / CheckRemoteDebuggerPresent
- TLS callbacks pre-main
- CPUID hypervisor bit (EAX=1, ECX bit 31)
- VBox/VMware MAC OUI (08:00:27, 00:0C:29)
- Sandbox proc count + uptime (<2 cores, <2GB RAM, uptime <10min)
- Mouse activity check
- Internal AD domain check
- Geo IP / locale fingerprint
- Time delay multi-callback (NtDelayExecution chained)
- Resource I/O check (real desktop file listing)

Engagement-specific: AD domain SID + hostname allow-list.

## 11. PPID spoofing + BlockNonMS DLLs + Mitigation policy

- `PROC_THREAD_ATTRIBUTE_PARENT_PROCESS` → arbitrary PPID (explorer.exe, services.exe)
- `PROC_THREAD_ATTRIBUTE_MITIGATION_POLICY` with `PROCESS_CREATION_MITIGATION_POLICY_BLOCK_NON_MICROSOFT_BINARIES_ALWAYS_ON` → EDR userland DLL blocked from injecting into child
- `NtCreateUserProcess` (lower level than CreateProcessW)

## 12. Code-signing + Authenticode

- Self-signed Authenticode + timestamp → reduces SmartScreen friction (does not eliminate)
- Stolen/purchased EV cert → SmartScreen bypass + lax WDAC
- Azure Trusted Signing $10/month (2025) for legal builds
- Signature-stealing from legit binary (Authenticode header injection without verify) — burned
- Polyglot signed (signed .lnk, signed .hta)

## 13. Output formats

| Format | Use | Toolchain |
|--------|-----|-----------|
| .exe PE x64 | standalone | MSVC / MinGW |
| .exe PE x86 | legacy targets | MinGW |
| .dll | DLL sideload / proxy | MSVC export def |
| Position-independent shellcode (.bin) | injection in stager / Donut input | linker `-nostdlib`, custom entry, no imports |
| .dll proxy with export forwarding | full DLL sideloading | LazyDLLSideload-style auto-generate |
| COFF/BOF (.o) | Beacon-internal execution | BOF compatible header |
| Reflective DLL (sRDI) | self-loading PE in memory | sRDI conversion |
| .lnk/.iso/.hta/.xll/.one/.svg | initial access wrapper | separate packager module |
| .donut output | universal PIC wrapper | Donut framework |

## 14. Toolchain / language

| Option | Pro | Con |
|--------|-----|-----|
| C + MSVC | full API access, signed PDB | raw strings easy to fingerprint |
| C + MinGW | Linux-side builds | mingw runtime signature |
| C++ | template metaprogramming string obfuscation | code bloat |
| Rust | runtime noise, memory safety, jemalloc patterns confuse RE | steep curve, scarce public offensive code |
| Nim | compile-time exec, FFI trivial, rare for AV | scarce mature offensive ecosystem |
| Go | huge statically-linked, cross-compile easy | DLL impossible, runtime signatures |

Recommendation: C + MSVC primary. Nim secondary. Rust for specialized modules.

## 15. Build-time obfuscation passes

- OLLVM / O-MVLL: control-flow flattening + bogus CF + instruction substitution + BB splitting
- String encryption compile-time (Nim macros, C++ constexpr, Rust litcrypt)
- API hash randomization per build (seed changes → hashes change)
- `.text` section name randomization
- Junk byte insertion
- Anti-disasm sequences (`jmp $+2`, opaque predicates)
- Strip PDB, symbols, randomize PE header timestamp

## Manifest proposal (v1)

```json
{
  "name": "loader-builder",
  "version": "1.0",
  "platform": "linux",
  "category": "loader",
  "description": "Build evasive Windows PE loaders from raw shellcode",
  "functions": [{
    "name": "build_loader",
    "params": [
      "shellcode (file, required, accepts=binary)",
      "output_format (enum: exe_x64|exe_x86|dll_x64|dll_x86|shellcode_pic|dll_proxy|reflective_dll|bof)",
      "syscall_method (enum: indirect_hellshall|indirect_tartarus|indirect_recycledgate|winapi_only)",
      "unhook_method (enum: none|peruns_fart|perun_selective|phantom_dll_hollow|manual_ntdll_remap)",
      "injection_target (enum: self|early_cascade|poolparty_tp_timer|poolparty_worker_factory|early_bird_apc|threadless_ntdispatcher|module_stomping|process_ghosting)",
      "target_process_name (string)",
      "spawn_via_ntcreateuserprocess (bool)",
      "ppid_spoof (string)",
      "block_non_ms_dlls (bool)",
      "stack_spoof (enum: none|loudsunrun|silentmoonwalk|dreamwalkers)",
      "sleep_obfuscation (enum: none|ekko|cronos|zilean|deathsleep)",
      "etw_bypass (enum: none|patchless_hwbp|etweventwrite_ret_patch)",
      "amsi_bypass (enum: none|patchless_hwbp|amsi_scan_buffer_patch|amsi_write_raid)",
      "encryption (enum: xor_rolling|rc4|aes256_cbc|aes256_ctr|chacha20|stagewise_aes)",
      "encoding (enum: raw_bytes|ipv4_strings|ipv6_strings|mac_strings|uuid_strings|sgn)",
      "api_hash_algo (enum: djb2|fnv1a|crc32|random_per_build)",
      "anti_analysis_checks (csv: debugger,vm,sandbox,domain_lock,hostname_lock,geo_lock,sleep_jitter,mouse_check)",
      "execution_guardrail (string: SID+hostname pin)",
      "memory_protection_strategy (enum: rw_then_rx|execute_only|no_alloc_module_stomp)",
      "obfuscation_passes (csv: cff,bogus_cf,sub,split,string_enc)",
      "anti_emulation (bool)",
      "pe_polish (csv: strip_pdb,strip_timestamps,strip_rich_header,randomize_section_names,randomize_imports,fake_resources,clone_version_info_from)",
      "clone_version_info_from (file)",
      "code_signing (enum: none|self_signed|use_pfx)",
      "pfx_file (file)",
      "pfx_password (string)",
      "timestamp_server (string)",
      "compiler_toolchain (enum: msvc|mingw_gcc|clang_msvc|nim|rust)",
      "language (enum: c|cpp|nim|rust)",
      "output_name (string, required)"
    ],
    "returns": { "type": "file", "name": "loader", "produces": "pe_binary" }
  }]
}
```

## Internal stack of the module

- Docker container with MSVC via wine64 + Windows SDK, MinGW-w64, Nim toolchain, Rust nightly
- Loader codebase as Jinja2 C/Nim templates parameterizable per param
- OLLVM 17 fork with O-MVLL passes
- SignTool via osslsigncode + Authenticode
- Donut CLI for `shellcode_pic` format
- sRDI conversion script for `reflective_dll`
- BokuLoader as reference for stack spoof + indirect syscall integration
- Testing harness with virtualized EDR sandbox for regression

## Per-build mutation

Every `build_loader` invocation randomizes:
- FNV1a seed → different API hashes
- AES/ChaCha key → different ciphertext
- Variable/function names in generated code
- Block order (OLLVM CFF)
- Junk byte padding length
- PE timestamp
- `.text` section name (`.crypted`, `.ven0m`, etc.)

Re-running the pipeline after IOC detection → byte-different artifact without touching the graph.

## TODO v2

- Smart App Control (Win11 22H2+) bypass status
- WDAC / Custom WDAC policy evasion 2025-2026
- VBS / HVCI / Credential Guard interaction
- CET (Control-flow Enforcement Technology) shadow stack bypass
- Recent Black Hat USA 2025 / DEF CON 33 / Black Hat EU 2025 talks
- 2026-specific tools and techniques
