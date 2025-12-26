# MIDI 2.0 in ATLAS (Design Notes)

ATLAS is **local-first** and runs in Electron. For MIDI 2.0, the key challenge is that **MIDI 2.0 uses UMP (Universal MIDI Packet)**, which typically requires an OS-level API and (in Node/Electron) a **native bridge**.

## No license required

There is **no license** required to implement MIDI 2.0 message support. The MIDI Association publishes the spec. What matters is **which platform APIs** we use to talk to devices.

## What ATLAS needs for “real” MIDI 2.0

- **UMP transport** (send/receive 32/64/128-bit packets)
- **Device enumeration** for MIDI 2.0 endpoints (often separate from MIDI 1.0 ports)
- Optional: **MIDI-CI** (capability inquiry), **Profiles**, **Property Exchange**

## Platform realities

- **macOS**: CoreMIDI provides MIDI 2.0/UMP endpoints on supported OS versions.
  - In Electron/Node, this usually means a **native addon** or helper process bridging CoreMIDI to JS.
- **Windows**: MIDI 2.0 is via **Windows MIDI Services** (not legacy WinMM).
- **Linux**: UMP support depends on ALSA/kernel/userland.

## Current status in this repo

`atlas/core/midi-io.js` is structured to support a MIDI 2.0 backend, but the backend is currently a **stub** (`atlas/core/midi2-manager.js`).

That means:
- ATLAS runs in **MIDI 1.0 mode today** (SysEx and classic MIDI messages).
- The codebase is ready to plug in a real MIDI 2.0 backend later without rewriting higher-level device workflows.

## Next implementation step (macOS focus)

Build a macOS UMP bridge that can:
- Enumerate MIDI endpoints and label which are MIDI 2.0-capable
- Open input/output endpoints
- Emit incoming UMP packets to JS
- Send UMP packets from JS to device

Once transport exists, we can iteratively add:
- MIDI-CI negotiation
- Property Exchange queries for richer device librarian flows (where supported)


