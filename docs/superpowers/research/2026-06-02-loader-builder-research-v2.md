# Loader Builder Module — Research v2 (2026 update)

> Snapshot date: 2026-06-02. Extends v1. Carries everything from v1 forward.
> See `2026-06-02-loader-builder-research-v1.md` for the 2025 baseline.

## What changed in 2025-2026

The threat landscape moved fast in the last 12 months. v2 captures techniques that emerged or industrialized after v1's cutoff.

### Major shifts

1. **BYOVD industrialized** (Q1 2026). What was nation-state tradecraft in 2023 is now a commodity: 54 EDR-killer binaries, 35 distinct signed vulnerable drivers (RansomHub, BlackByte, Akira, Scattered Spider, generic ransomware). Mar 2026 malvertising campaign used a signed Huawei audio driver to terminate security processes.

2. **ClickFix is now #1 initial access**. Microsoft observed it in 47% of observed attacks in 2025. ESET reports +517% YoY first half 2025. Commercial kits $200-1500/month. Q1 2026 added DNS-based variants. April 2026 added macOS variant via `applescript://` URL scheme bypassing Terminal entirely. The loader must include a delivery sub-module that emits a ClickFix-ready PowerShell snippet pointing at the loader URL.

3. **LLM-driven polymorphism (Promptmorphism)**. PROMPTFLUX (Google Nov 2025 brief) queries Gemini hourly for fresh VBScript dropper variants. PROMPTSTEAL uses Qwen for Windows command generation. PROMPTSPY (ESET 2026) adapts on-device. AIMAL framework (DEF CON 33) uses OpenAI feedback loop adapting to signature vs behavioral detection.

4. **MCP-controlled offensive frameworks**. BOAZ-MCP and MalDev-Analyzer-MCP let AI agents drive loader generation via Model Context Protocol. Vibe-coded evasion frameworks proliferating (SANS Webcast Q1 2026).

5. **Bindlink-based attacks (24H2+)**. EDR-Redir V2 (late 2025) abuses `CreateBindLink` API to redirect EDR install folders. EDRStartupHinder (Jan 2026) runs a service in `ServiceGroupOrder` ahead of EDR services, uses Bindlink to redirect System32 DLLs, and leverages PPL signature enforcement to crash EDR processes at boot.

6. **ETW deception (BlackHat USA 2025 — Hartong)**. Instead of patching ETW out, inject *fake* telemetry events that confuse analysts and cause Defender to disregard logs. New defensive challenge: not silence, but noise.

7. **Smart App Control became toggleable in April 2026** without OS reinstall. Combined with the 6-year-old LNK Mark-of-the-Web bypass (non-standard target paths), SAC remains practically defeated for `.lnk` delivery.

8. **HVCI/VBS hardened**. No reliable user-mode bypass exists. Loader design must avoid kernel-mode techniques on HVCI-enforced targets unless willing to deploy BYOVD with explicit knowledge of the VBS state. CET shadow stack is also hard guardrail in user-mode — loader stack-spoof passes must place addresses consistent with the shadow stack (return target == call target).

9. **Mockingjay-style "execution-only" primitives** mature. Bypasses the "2-of-3 rule" (alloc + exec OR modify + exec) by using only the exec primitive. Abuses RWX sections in 3rd-party DLLs (msys-2.0.dll classic; many node_modules, Electron runtimes, video codecs).

10. **HijackLoader 2025-2026 modules** as reference modular loader: `modCreateProcess`, `modCreateProcess64`, `WDDATA`, `modUAC`, `modUAC64`, `modWriteFile`, `modWriteFile64`. Adds call-stack spoofing, VM detection, Heaven's Gate (32→64 bit transition), persistence via scheduled tasks.

11. **WDAC ("Application Control for Business")** practical bypasses 2025-2026:
    - Microsoft-signed legacy Teams + Node module load
    - `imgmgr.exe` (Windows ADK) insecure deserialization
    - `MSBuild.exe` inline tasks
    - DLL sideloading with signed trusted app + unsigned DLL when DLL signing not enforced
    - Browser exploit pivot to RCE within trusted Edge/Chrome process

12. **Sleep API selection matters again**. `Sleep()` and `NtDelayExecution()` both set thread wait reason `DelayExecution`. Hunt-Sleeping-Beacons trivially flags this. `WaitForSingleObject()` sets `UserRequest` instead — bypass.

13. **ShellcodeFluctuation** (mgeeky) gains renewed relevance: cyclically encrypt shellcode between RW (or NoAccess) and RX. Memory scanners (Moneta, PE-sieve) only see encrypted blob during sleep windows.

14. **Boot-time pre-EDR-init evasion (Jan 2026)**. EDRStartupHinder uses three layers:
    a. Service registered in early `ServiceGroupOrder`, runs before EDR services.
    b. `CreateBindLink` to redirect critical `System32` DLLs to attacker-controlled copies during the protected boot window.
    c. PPL signature enforcement aborts the EDR processes when they fail to verify the redirected DLLs.

15. **Driver signing market grayer**. Azure Trusted Signing widely available ($10/mo, individuals), but EV certificates from stolen/abused publishers remain the realistic path for loader binaries. Microsoft revocations lag.

## New techniques added to v2

### Boot-time / Pre-init layer (NEW)

| Technique | Reference | Status |
|-----------|-----------|--------|
| EDRStartupHinder (Bindlink + PPL abuse, service group order) | findsec.org Jan 2026 | viable on 24H2 25H2 |
| EDR-Redir V2 (Bindlink + Cloud Filter to redirect EDR folder) | zerosalarium 2025-11 | viable when admin |

Both require **admin** at deploy time. Useful for persistence / second-stage; not for initial access loader itself.

### EDR neutralization layer

Used by the loader **before** dropping the actual payload, when admin and operator permits BYOVD:

| Tool | Mechanism | Notes |
|------|-----------|-------|
| EDRSilencer | WFP filters block EDR outbound traffic | userland, no kernel, less invasive |
| EDR-Freeze | Suspend EDR processes via WerFault | userland, current 2026 |
| EDRSandblast | BYOVD vuln signed driver, removes kernel callbacks + ETW-Ti | classic, 1000+ EDR drivers supported list |
| AVPro killer (community fork) | BYOVD generic via abused signed driver pool | Mar 2026 surge |

### Mockingjay-style execution-only primitive (NEW)

- Walk loaded modules, find DLL with RWX section + sufficient size (≥16KB)
- Memcpy shellcode into that section directly (no `WriteProcessMemory`, no `NtProtectVirtualMemory`)
- Trigger execution via thread hijack or function pointer overwrite in that DLL
- Defeats EDR rules that require alloc+exec or modify+exec combo

Target DLLs found in the wild:
- `msys-2.0.dll` (Git for Windows / MSYS2 bundles)
- Electron embedded V8 RWX heap pages
- Various `node_modules` native binaries
- Older NVIDIA / video codec DLLs

### Sleep-API selection (NEW param)

| API | Wait reason | Hunt-Sleeping-Beacons | Recommended? |
|-----|-------------|----------------------|--------------|
| `Sleep` | DelayExecution | flagged | no |
| `NtDelayExecution` | DelayExecution | flagged | no |
| `WaitForSingleObject(event, ms)` | UserRequest | not flagged | yes |
| `TpSetWait` (timer queue) | WrAlertByThreadId | not flagged | yes (Ekko-style) |
| `TpAllocTimer` chained callback | varies per callback | conditional | depends |

### Initial-access lure generation (NEW)

The loader module can optionally emit a paired delivery payload:

| Lure | Output | Use |
|------|--------|-----|
| ClickFix PowerShell | `clickfix.html` + `lure.ps1` | fake CAPTCHA → user pastes PS into Win+R |
| ClickFix mshta | `clickfix.html` with `mshta` payload | mshta LOLBin path |
| Signed legit app hijack | `hijack-pack/` dir | DLL sideload pack auto-built from operator-supplied legit signed PE |
| LNK with MoTW bypass | `lure.lnk` | non-standard target path to bypass MoTW (6yr-old, still works) |
| OneNote attached HTA/CMD | `lure.one` | post-macro era classic |
| HTML smuggling | `lure.html` | JS Blob assembles loader on disk |
| SVG smuggling | `lure.svg` | embed loader bytes in SVG `<image>` data URI |

(Most of these would normally live in the `packager` / `delivery` modules — keeping a thin emitter in `loader-builder` is convenient for engagement quick wins.)

### LLM-driven polymorphism (NEW param)

| Mode | What |
|------|------|
| `none` | static template emit |
| `seed_only` | randomize hashes/keys/names from RNG |
| `llm_rewrite` | submit current template + previous build to an LLM, ask it to produce semantically equivalent variant (different variable layout, swapped helper function shapes, reordered control flow). Configurable: OpenAI compatible endpoint URL + model name + key |
| `llm_per_function` | rewrite individual helper functions only (faster, cheaper) |
| `llm_adversarial` (AIMAL-style) | if a previous build was detected, feedback that detection class (sig/behavior) to the LLM to bias the next rewrite |

The operator points the module at any OpenAI-compatible API. **No data exfil to vendors** in default config; default points to local model (Ollama, llama.cpp server). Cloud LLMs only opt-in.

### Mark-of-the-Web bypass (NEW param)

Generate `.lnk` with non-standard target path triggering the 6-year-old MoTW skip. Useful when bundling loader-as-lnk in `.iso`/`.vhd`/`.zip` containers.

### ETW deception layer (Hartong 2025) (NEW param)

Instead of patching ETW out (detectable now), inject fake telemetry events that:
- Mimic benign Windows updater / installer flows
- Push false positives toward analyst's queue
- Hide real loader actions in noise
- Can specifically target Defender's ETW providers to cause it to discard real signal

Useful only against ETW-consuming EDRs (Defender ATP, Sentinel, Sysmon). Pure XDR/kernel-callback solutions unaffected.

### VBS/HVCI awareness (NEW param)

Loader can detect VBS+HVCI status at runtime via:
- `NtQuerySystemInformation(SystemIsolatedUserModeInformation)` → IUM running
- `ProcessExtendedBasicInformation` flags
- Registry `HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard`

Behavior options:
- `refuse` (exit silently if HVCI enforcing)
- `degrade` (skip BYOVD techniques, keep userland-only)
- `proceed` (ignore — let it crash if kernel-mode is attempted)

## Updated manifest (v2 deltas only)

```jsonc
{
  // ... all v1 params kept ...

  // NEW
  "sleep_api": { "type": "enum",
    "options": ["sleep", "ntdelayexecution", "waitforsingleobject", "tpsetwait", "tpalloctimer_chain"],
    "description": "Wait API used for delay. WaitForSingleObject evades Hunt-Sleeping-Beacons (DelayExecution → UserRequest)." },

  "memory_fluctuation": { "type": "bool",
    "description": "ShellcodeFluctuation: cycle RW/NoAccess ↔ RX with re-encryption between executions." },

  "execution_only_primitive": { "type": "bool",
    "description": "Mockingjay-style: locate RWX section in a loaded 3rd-party DLL and execute from there. No alloc, no protect, no write call." },

  "execution_only_target_dll": { "type": "string",
    "description": "Hint for the search (e.g. msys-2.0.dll). Empty = auto-scan loaded modules." },

  "edr_neutralization": { "type": "enum",
    "options": ["none", "edrsilencer_wfp", "edrsandblast_byovd", "edrfreeze_werfault", "byovd_custom_driver"],
    "description": "Pre-payload EDR muting. Requires admin." },

  "byovd_driver": { "type": "file", "accepts": "kernel_driver",
    "description": "Signed vulnerable driver to drop and exploit. Required if edr_neutralization=byovd_*" },

  "byovd_exploit_template": { "type": "enum",
    "options": ["rtcore64", "kdmapper", "gdrv", "ene_iohlp", "huawei_audio", "custom"],
    "description": "Known exploit primitive shape for the dropped driver." },

  "vbs_hvci_policy": { "type": "enum",
    "options": ["proceed", "degrade_userland_only", "refuse_silent_exit"],
    "description": "Behavior when target has VBS+HVCI enforcing." },

  "etw_decoy_injection": { "type": "bool",
    "description": "Hartong-style: emit fake ETW events to drown real signal." },

  "lnk_motw_bypass": { "type": "bool",
    "description": "Generate paired .lnk with non-standard target path (defeats Mark-of-Web check)." },

  "delivery_lure": { "type": "enum",
    "options": ["none", "clickfix_powershell", "clickfix_mshta", "clickfix_applescript_macos",
                "lnk_motw_bypass", "signed_app_hijack_pack", "html_smuggling", "svg_smuggling", "onenote_hta"],
    "description": "Optional initial-access lure paired with the loader. Output includes both files." },

  "delivery_lure_url": { "type": "string",
    "description": "URL where the loader will be hosted (substituted into the lure)." },

  "boot_evasion": { "type": "enum",
    "options": ["none", "edrstartuphinder_service", "edr_redir_v2_bindlink"],
    "description": "Pre-EDR-init service installation. Requires admin at deploy. Persistence-oriented, not first execution." },

  "wdac_bypass_strategy": { "type": "enum",
    "options": ["none", "teams_legacy_node_load", "imgmgr_deserialize", "msbuild_inline", "dll_sideload_signed_app", "browser_exploit_pivot"],
    "description": "If target enforces WDAC/AppLockerthen pick a bypass path. Default none (assumes no WDAC)." },

  "polymorphism_mode": { "type": "enum",
    "options": ["none", "seed_only", "llm_rewrite", "llm_per_function", "llm_adversarial"],
    "description": "Per-build mutation strategy. LLM modes call external API for source rewrite." },

  "llm_endpoint": { "type": "string",
    "description": "OpenAI-compatible base URL. Default: http://localhost:11434/v1 (Ollama). Required for llm_* modes." },

  "llm_model": { "type": "string",
    "description": "Model name. Default: qwen2.5-coder:14b. Tradeoff: smaller=faster+worse rewrites." },

  "llm_api_key": { "type": "string",
    "description": "Optional API key for cloud LLMs (OpenAI, Anthropic via proxy, etc.). Empty for local." },

  "llm_detection_feedback": { "type": "string",
    "description": "If a previous build of this pipeline was detected, paste the detection class here (e.g. 'sig:trojan.win32.generic', 'behavior:NtProtectVirtualMemory:RWX-flip'). LLM adversarial mode uses it to bias rewrites." },

  "include_hunt_evasion": { "type": "string",
    "description": "Comma-separated extras: waitforsingleobject_sleep,thread_stack_fluctuate,beacon_hunter_stub,csfalcon_hash_collision_djb2,sentinel_callstack_clean" }
}
```

## Updated build pipeline (operator's pipeline graph)

```
[shellcode.bin]
   │
   ├──► [llm_polymorphic_pre_pass] (optional)
   │       randomizes structure based on llm_model + detection_feedback
   │
   ▼
[loader-builder build_loader (v2)]
   syscall_method = indirect_hellshall
   unhook_method = peruns_fart
   injection_target = early_cascade
   sleep_api = waitforsingleobject
   memory_fluctuation = true
   execution_only_primitive = false  (or true with target_dll=msys-2.0.dll)
   stack_spoof = loudsunrun
   etw_bypass = patchless_hwbp
   amsi_bypass = patchless_hwbp
   etw_decoy_injection = true
   edr_neutralization = none (or edrsilencer_wfp if admin)
   vbs_hvci_policy = degrade_userland_only
   delivery_lure = clickfix_powershell
   delivery_lure_url = https://op-cdn.example/x
   lnk_motw_bypass = true
   encryption = aes256_ctr
   encoding = uuid_strings
   api_hash_algo = random_per_build
   anti_analysis_checks = vm,sandbox,domain_lock,mouse_check
   obfuscation_passes = cff,sub,split,string_enc
   pe_polish = strip_pdb,strip_rich_header,clone_version_info_from
   clone_version_info_from = MS_signed_clean.exe
   code_signing = use_pfx
   pfx_file = our_cert.pfx
   compiler_toolchain = msvc
   language = c
   polymorphism_mode = llm_adversarial
   llm_endpoint = http://localhost:11434/v1
   llm_model = qwen2.5-coder:14b
   llm_detection_feedback = (empty on first run)
   │
   ▼
[loader.exe + clickfix.html + lure.lnk]
   │
   ▼
[packager build_iso] (separate Venom module)
```

## Trade-off summary tables for operator UX

### EDR coverage matrix (which technique blocks which detection vector)

| Detection vector | Best technique | Secondary |
|------------------|----------------|-----------|
| User-mode ntdll hooks | indirect syscalls (Hell's Hall) | unhook (Perun's Fart) |
| ETW/AMSI userland telemetry | patchless HW breakpoints | RET patch (faster, more detectable) |
| Kernel callbacks (PsSetCreateProcessNotifyRoutine) | only BYOVD removes; otherwise minimize IOCs | — |
| Memory scanners (Moneta, PE-sieve, Defender) | sleep obfuscation + fluctuation + no-RWX | execution-only Mockingjay |
| Call stack analysis (kernel ETW callstacks) | LoudSunRun + synthetic frames | DreamWalkers |
| Static AV (signatures) | LLM polymorphism + API hashing + encrypted blob | OLLVM CFF |
| Behavioral AV (UAC/Defender heuristics) | Early Cascade injection + ETW decoy | normal anti-analysis |
| Cloud telemetry (XDR backends) | minimize child processes, no network until late | spoof PPID |
| Mark-of-the-Web (delivery) | LNK non-standard target | HTML smuggling decryption client-side |
| App Control (WDAC/SAC) | DLL sideload signed app or MSBuild inline | LOLBin chain |
| Boot-time defenders (Defender startup) | EDRStartupHinder (admin) | EDR-Redir V2 (admin) |

### Cost / complexity table

| Technique | Build time | Bytes added | Operator risk |
|-----------|-----------|-------------|---------------|
| Indirect syscalls | <1s | ~2KB | low |
| Perun's Fart | <1s | ~3KB | low |
| Early Cascade | <1s | ~5KB | low-med (Win10/11 only) |
| PoolParty TP_TIMER | <1s | ~4KB | low |
| LoudSunRun stack spoof | <1s | ~6KB | low |
| Ekko sleep | <1s | ~3KB | low |
| Cronos sleep | <1s | ~3KB | low |
| DeathSleep | <1s | ~5KB | med (thread kill races) |
| Patchless HW BP AMSI/ETW | <1s | ~2KB | low |
| ShellcodeFluctuation | <1s | ~4KB | low |
| Mockingjay exec-only | <1s | ~3KB | depends on host DLL availability |
| AES256-CTR + UUID encoding | <1s | shellcode×~3 | low |
| OLLVM CFF + sub + split | ~30s | ~30% binary growth | low |
| LLM rewrite (local Qwen 14B) | ~60s | varies | none if local |
| LLM rewrite (OpenAI gpt-4) | ~30s | varies | data leak to vendor |
| BYOVD (EDRSandblast) | <1s build, runtime depends | ~150KB driver | HIGH (admin required, kernel crash possible, IOC) |
| ETW decoy injection | <1s | ~5KB | low |

## Implementation TODO checklist for Venom

This is the work plan for the actual `loader-builder` module Docker image:

- [ ] Base image: Debian + wine64 + MSVC headers + MinGW-w64 + Nim 2.x + Rust nightly + Python 3.12
- [ ] Loader source as Jinja2 templates (C primary, Nim secondary, Rust optional). One template per `(injection_target, sleep_api, syscall_method)` triple plus shared modules
- [ ] OLLVM 17 fork + O-MVLL passes wired into compile step
- [ ] osslsigncode + Azure Trusted Signing client for `use_pfx` and optional `azure_trusted` modes
- [ ] Donut CLI integrated for `shellcode_pic` output
- [ ] sRDI Python script for `reflective_dll` output
- [ ] BOF compile pipeline (modified mingw with COFF object output) for `bof`
- [ ] Per-build mutation engine: seed RNG → randomize hashes, keys, var names, section names, junk bytes
- [ ] LLM rewriter: ollama HTTP client + retry + diff check (ensure semantic preservation via test compile)
- [ ] BYOVD driver loader stubs for known vulnerable drivers (rtcore64, kdmapper, gdrv, ene_iohlp, huawei_audio)
- [ ] EDR detection: pre-build feedback file `engagement.json` with `previous_detections: []`
- [ ] Delivery lure generators (clickfix html template, lnk MoTW bypass, htmlsmuggling JS template, svg encoder)
- [ ] Integration tests: 14 desktop AVs + 7 EDRs in VMs (BOAZ-style harness) running on regression schedule
- [ ] Manifest endpoint exposes everything above per Venom contract
- [ ] `/execute` reads multipart with shellcode file + JSON params; returns compiled artifact + optional paired delivery files in tar

## Risk and OPSEC notes for operators

- **BYOVD is loud**. Kernel module load events are kernel-callback observable. Use only when EDR is already neutralized or scope permits the noise. Rotate drivers between engagements.
- **LLM rewriting leaks data if not local**. Default the endpoint to `http://localhost:11434/v1`. Cloud endpoints (OpenAI, Anthropic, Bedrock) leak loader source to vendor logs. For real engagements, run a local model.
- **ClickFix lures are now flagged**. Defender SmartScreen + Edge SmartScreen are tracking patterns. The PowerShell snippet must be re-mutated per build (`polymorphism_mode=llm_per_function`) or detection ramps up within hours.
- **EDR-Redir V2 / EDRStartupHinder require admin**. Useful only for post-exploitation persistence stage. Not initial access.
- **VBS+HVCI is hard floor**. If target is Win11 enterprise 24H2+ with HVCI enforced, BYOVD path is closed unless using a driver signed *and* WHQL-rated *and* on the WDAC allow list (rare). Plan around userland-only.
- **CET shadow stack** breaks naive stack spoofing on supported CPUs. LoudSunRun and DreamWalkers handle this; SilentMoonwalk + VulcanRaven older variants don't.
- **Authenticode revocation lag**. A burned certificate may stay usable for days-weeks after revocation. Cert rotation should be a parameter of every engagement.

## Sources (2025-2026 specific additions)

- [EDRStartupHinder — zerosalarium 2026-01](https://www.zerosalarium.com/2026/01/edrstartuphinder-edr-startup-process-blocker.html)
- [EDR-Redir V2 — zerosalarium 2025-11](https://www.zerosalarium.com/2025/11/EDR-Redir-V2-Blind-EDR-With-Fake-Program-Files.html)
- [EDR-Redir Bindlink + Cloud Filter — zerosalarium 2025-10](https://www.zerosalarium.com/2025/10/DR-Redir-Break-EDR-Via-BindLink-Cloud-Filter.html)
- [54 EDR Killers Use BYOVD — The Hacker News 2026-03](https://thehackernews.com/2026/03/54-edr-killers-use-byovd-to-exploit-34.html)
- [BYOVD in 2026 — Threat Intel Report 2026-02](https://www.threatintelreport.com/2026/02/21/articles/byovd-in-2026-the-signed-driver-loophole-powering-edr-bypass-at-scale/)
- [BYOVD Attack Surge — Bellator Cyber 2026](https://bellatorcyber.com/blog/edr-killers-byovd-signed-vulnerable-drivers-2026)
- [SonicWall + BYOVD EDR Killer — Huntress 2026](https://www.huntress.com/blog/encase-byovd-edr-killer)
- [Modern Windows Attack Techniques 2026 — Hive Security](https://hivesecurity.gitlab.io/blog/modern-attack-techniques-2026/)
- [EDR Bypass Techniques 2026 — RingSafe](https://ringsafe.in/edr-bypass-techniques-2026-endpoint-evasion/)
- [Promptmorphism — Gen Digital](https://www.gendigital.com/blog/insights/research/promptmorphism)
- [Cybercrime 2026 AI Polymorphic Malware — AI CERTs](https://www.aicerts.ai/news/cybercrime-2026-ai-polymorphic-malware-upends-defense/)
- [Infinite Mutation Engine — arxiv 2605.03619](https://arxiv.org/html/2605.03619v1)
- [ClickFix in 2026 Trust-Flow Patterns — cyberdesserts](https://blog.cyberdesserts.com/what-is-clickfix-social-engineering-attack/)
- [LeakNet Ransomware ClickFix + Deno — Aviatrix 2026](https://aviatrix.ai/threat-research-center/leaknet-ransomware-2026-clickfix-deno-in-memory-loader/)
- [ClickFix Technique Overview — ANY.RUN 2026-05](https://medium.com/@anyrun/clickfix-technique-overview-89977d1882b4)
- [KongTuke ClickFix WordPress — Trend Micro 2026-03](https://www.trendmicro.com/en_us/research/26/c/kongtuke-clickfix-abuse-of-compromised-wordpress-sites.html)
- [Red Canary Intelligence Insights Feb 2026 — ClickFix](https://redcanary.com/blog/threat-intelligence/intelligence-insights-february-2026/)
- [Wretch Client ClickFix infostealer — Elastic Security Labs](https://www.elastic.co/security-labs/a-wretch-client)
- [Mockingjay — Bleeping Computer](https://www.bleepingcomputer.com/news/security/new-mockingjay-process-injection-technique-evades-edr-detection/)
- [Mockingjay execution-only — gbhackers](https://gbhackers.com/new-process-injection-technique-evades-edr/)
- [Mockingjay Slips By EDR — Dark Reading](https://www.darkreading.com/application-security/mockingjay-edr-tools-process-injection-technique)
- [BOAZ Multilayered AV/EDR Evasion — DEF CON 33](https://forum.defcon.org/node/253439)
- [BOAZ repo — thomasxm](https://github.com/thomasxm/BOAZ)
- [BOAZ-MCP — Yenn503](https://github.com/Yenn503/BOAZ-MCP)
- [AIMAL — EndritShaqiri](https://github.com/EndritShaqiri/AIMaL)
- [BlackHat USA 2025 Olaf Hartong — I'm in Your Logs Now](https://www.youtube.com/watch?v=G3Ft0gtmm4I)
- [DEF CON 33 Workshops — defcon.org](https://defcon.org/html/defcon-33/dc-33-workshops.html)
- [HijackLoader new modules — Cybersecurity News](https://cybersecuritynews.com/hijackloader-with-new-modules/)
- [HijackLoader updates — Zscaler ThreatLabz](https://www.zscaler.com/blogs/security-research/hijackloader-updates)
- [RenEngine + HijackLoader 2025-2026 — Cyderes](https://www.cyderes.com/howler-cell/renengine-loader-hijackloader-attack-chain)
- [WDAC Bypass Loki C2 — IBM X-Force](https://www.ibm.com/think/x-force/bypassing-windows-defender-application-control-loki-c2)
- [imgmgr deserialization WDAC bypass — dotSec](https://www.dotsec.com/insecure-deserialisation-app-control-bypass/)
- [Backdooring Electron Applications — White Knight Labs 2026-01](https://whiteknightlabs.com/2026/01/20/backdooring-electron-applications/)
- [Browser Exploit Pivot to WDAC Bypass — IBM X-Force](https://www.ibm.com/think/x-force/operationalizing-browser-exploits-to-bypass-wdac)
- [Mark-of-the-Web LNK Bypass 6yr Old — The Cyber Express](https://thecyberexpress.com/windows-smart-app-control-smartscreen-bypass/)
- [Smart App Control toggle 2026-04 — CIAOPS](https://blog.ciaops.com/2026/04/16/existing-systems-can-now-enable-windows-smart-app-control-and-you-should/)
- [Dismantling Smart App Control — Elastic Security Labs](https://www.elastic.co/security-labs/dismantling-smart-app-control)
- [EDRSilencer — Splunk Detection](https://research.splunk.com/endpoint/a206324d-4945-4b0c-a731-87c311ddae2f/)
- [EDR-Freeze — Axelarator blog](https://blog.axelarator.net/hunting-for-edr-freeze/)
- [Avoiding Memory Scanners — DEF CON 30 (Kyle Avery)](https://media.defcon.org/DEF%20CON%2030/DEF%20CON%2030%20presentations/Kyle%20Avery%20-%20Avoiding%20Memory%20Scanners%20Customizing%20Malware%20to%20Evade%20YARA%20PE-sieve%20and%20More.pdf)
- [ShellcodeFluctuation — mgeeky](https://github.com/mgeeky/ShellcodeFluctuation)
- [ThreadStackSpoofer — mgeeky](https://github.com/mgeeky/ThreadStackSpoofer)
- [HVCI Memory Integrity — Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/hardware-security/enable-virtualization-based-protection-of-code-integrity)
- [CET Shadow Stack — Intel docs](https://www.intel.com/content/www/us/en/developer/articles/technical/technical-look-control-flow-enforcement-technology.html)
- [Hardware-enforced Stack Protection — Microsoft Community Hub](https://techcommunity.microsoft.com/blog/windowsosplatform/developer-guidance-for-hardware-enforced-stack-protection/2163340)
- [MalDev-Analyzer-MCP — RootInj3c](https://github.com/RootInj3c/MalDev-Analyzer-MCP)
- [Vibe-coding evasion frameworks — SANS Webcast](https://www.sans.org/webcasts/vibe-coding-evasion-framework-ai-assisted-red-team-tool-development)

## Open questions (v3 candidates)

- Real-world detection latency: how many builds before EDR vendor cluster signature on the LLM polymorphism mode? Need engagement data.
- CET shadow stack: are there *user-mode* bypasses landing in 2026 H2? Currently nothing public reliable.
- Windows 11 25H2 mitigations beyond Bindlink. Microsoft hinted at hardened service-group enforcement for build 26100+ but no public details.
- macOS / Linux loader parity. Venom is Windows-first today; macOS ClickFix variants and Linux container-escape loaders are growing.
- Cobalt Strike 5.x format compat — CS 4.12 BOF API changes still apply?
- AI red-team frameworks (AIMAL, RedTeamLLM) as upstream Venom modules — should the dashboard surface "ask the LLM to suggest a pipeline" capability?
