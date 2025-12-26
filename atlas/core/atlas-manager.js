/**
 * ATLAS Manager - Main Controller
 * Coordinates patch database, device management, and MIDI I/O
 * Supports both MIDI 1.0 and MIDI 2.0
 */

const PatchDatabase = require('./patch-database.js');
const MIDIIOManager = require('./midi-io.js');
const PluginScanner = require('./plugin-scanner.js');
const CategoryConfig = require('./category-config.js');

class AtlasManager {
    constructor() {
        this.database = new PatchDatabase();
        this.midiIO = new MIDIIOManager();
        this.pluginScanner = new PluginScanner();
        this.initialized = false;
        this.currentDevice = null;
        this._midiActivityCallback = null;
        this._inputForOutput = new Map(); // outputDeviceId -> inputDeviceId
        this._deviceImportCallback = null;
        this._importSessions = new Map(); // outputDeviceId -> { started, deviceName, messages: number[][], createdAt }

        // "Last active input" tracking (for audition-thru source selection)
        this._lastActiveInputId = null;
        this._lastActiveInputTs = 0;

        // Temporary audition-thru session (controller -> device while auditioning)
        this._auditionThru = {
            active: false,
            inputId: null,
            outputId: null,
            startedAt: 0,
            durationMs: 0,
            handler: null,
            timer: null
        };
    }

    /**
     * Provide a callback to receive incoming MIDI activity events (main process can forward to UI).
     */
    setMidiActivityCallback(cb) {
        this._midiActivityCallback = typeof cb === 'function' ? cb : null;
    }

    setDeviceImportCallback(cb) {
        this._deviceImportCallback = typeof cb === 'function' ? cb : null;
    }

    async startDeviceImport(deviceId, options = {}) {
        try {
            if (!this.initialized) await this.initialize();
            const discovery = await this.midiIO.discoverDevices();
            const all = discovery?.devices || [];
            const out = all.find(d => d.id === deviceId) || null;
            const deviceName = out?.name || String(options.deviceName || deviceId);

            this._importSessions.set(deviceId, {
                started: true,
                deviceName,
                messages: [],
                createdAt: Date.now()
            });

            if (this._deviceImportCallback) {
                this._deviceImportCallback({ deviceId, status: 'started', count: 0, ts: Date.now() });
            }

            return { success: true, deviceId, deviceName };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async stopDeviceImport(deviceId) {
        try {
            const s = this._importSessions.get(deviceId);
            if (!s) return { success: false, error: 'No active import session' };
            s.started = false;
            if (this._deviceImportCallback) {
                this._deviceImportCallback({ deviceId, status: 'stopped', count: s.messages.length, ts: Date.now() });
            }
            return { success: true, deviceId, count: s.messages.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async saveDeviceImport(deviceId, options = {}) {
        try {
            if (!this.initialized) await this.initialize();
            const s = this._importSessions.get(deviceId);
            if (!s) return { success: false, error: 'No active import session' };

            const deviceName = s.deviceName || String(options.deviceName || deviceId);
            const baseName = String(options.baseName || `Imported ${deviceName}`).trim();
            const tagExtra = Array.isArray(options.tags) ? options.tags : [];

            let saved = 0;
            let failed = 0;

            for (let i = 0; i < s.messages.length; i++) {
                const msg = s.messages[i];
                try {
                    const patchData = {
                        name: `${baseName} #${String(i + 1).padStart(3, '0')}`,
                        device: deviceName,
                        manufacturer: options.manufacturer || null,
                        category: 'Imported',
                        tags: ['imported', 'sysex', ...tagExtra],
                        patchType: 'hardware',
                        sysex: Buffer.from(msg),
                        parameters: null
                    };
                    const r = await this.database.savePatch(patchData);
                    if (r && r.success) saved++;
                    else failed++;
                } catch {
                    failed++;
                }
            }

            // clear session after save
            this._importSessions.delete(deviceId);
            if (this._deviceImportCallback) {
                this._deviceImportCallback({ deviceId, status: 'saved', count: saved, failed, ts: Date.now() });
            }

            return { success: true, saved, failed };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Initialize ATLAS
     */
    async initialize() {
        if (this.initialized) {
            return { success: true, message: 'ATLAS already initialized' };
        }
        
        console.log('🏔️  Initializing ATLAS - Automatic Transfer and Librarian for Audio Synthesizers');
        console.log('   "Holding Your Patch Universe"');
        console.log('');
        
        try {
            // Initialize database
            const dbResult = await this.database.initialize();
            if (!dbResult.success) {
                throw new Error('Database initialization failed: ' + dbResult.error);
            }

            // Seed device playbooks (local-first Knowledge)
            await this.ensureSeedKnowledgeDocs();
            
            // Initialize MIDI I/O
            const midiResult = await this.midiIO.initialize();
            if (!midiResult.success) {
                throw new Error('MIDI initialization failed: ' + midiResult.error);
            }
            
            console.log('');
            console.log('✅ ATLAS initialized successfully');
            console.log(`   Protocol: ${midiResult.protocol.toUpperCase()}`);
            
            if (midiResult.protocol === 'midi2') {
                console.log('   🎯 MIDI 2.0 Enhanced Features Active:');
                console.log('      • Query patches directly from devices');
                console.log('      • 32-bit parameter precision');
                console.log('      • Bidirectional communication');
                console.log('      • Automatic device discovery');
            } else {
                console.log('   ℹ️  MIDI 1.0 Mode (Standard Compatibility)');
                console.log('      • SysEx patch transfer');
                console.log('      • Manual patch management');
                console.log('      • Wide device compatibility');
            }
            
            this.initialized = true;
            
            return { 
                success: true, 
                message: 'ATLAS initialized',
                protocol: midiResult.protocol,
                capabilities: midiResult.capabilities
            };
        } catch (error) {
            console.error('❌ ATLAS initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    async ensureSeedKnowledgeDocs() {
        try {
            const saveSeed = async ({ id, title, manufacturer = null, tags = [], content }) => {
                await this.database.saveKnowledgeDoc({
                    id,
                    title,
                    source: 'ATLAS (built-in playbook)',
                    manufacturer,
                    docType: 'device-playbook',
                    tags: Array.isArray(tags) ? tags : [],
                    content
                });
            };

            // Universal import playbook (applies to every hardware device)
            await saveSeed({
                id: 'seed-universal-device-import-v1',
                title: 'Hardware Device — Import / Backup into ATLAS (Universal)',
                manufacturer: null,
                tags: ['device', 'import', 'sysex', 'universal', 'playbook'],
                content: [
                    'Hardware Device — Import / Backup into ATLAS (Universal Playbook)',
                    '',
                    'What “Import” means in ATLAS (today)',
                    '- ATLAS can capture incoming MIDI data (including SysEx dumps) and store it as Library entries.',
                    '- After import, use the Device tab to bundle patches into Sets and send them back in order.',
                    '',
                    'Basic workflow (works for most legacy hardware)',
                    '1) Connect your MIDI interface / device.',
                    '2) In ATLAS: connect the device (output) and ensure the matching input is open.',
                    '3) Press keys/pads to confirm “Verified” (activity LED pulses).',
                    '4) Start Device Import (SysEx capture).',
                    '5) On the hardware: transmit/dump patches/banks over MIDI.',
                    '6) Stop import → Save → patches appear in Library + Device tab.',
                    '',
                    'Common blockers',
                    '- Cabling direction: device MIDI OUT must reach the computer interface MIDI IN.',
                    '- Interface routing (especially multiport interfaces): ensure DIN/USB routing is enabled.',
                    '- SysEx may be disabled in device global settings.',
                    '',
                    'Best next step',
                    '- Import the manufacturer manual PDF into Knowledge and search for “SysEx”, “Dump”, “Bulk”, “MIDI Dump”, “Data Transfer”.'
                ].join('\n')
            });

            // Interface routing playbook (helps when port name is the interface)
            await saveSeed({
                id: 'seed-interface-routing-v1',
                title: 'MIDI Interface Routing — Fix “Connected but no MIDI activity”',
                manufacturer: null,
                tags: ['midi', 'interface', 'routing', 'troubleshoot', 'playbook'],
                content: [
                    'MIDI Interface Routing — Fix “Connected but no MIDI activity”',
                    '',
                    'Symptom',
                    '- ATLAS connects to a port, but the LED never pulses when you play keys/pads.',
                    '',
                    'Checklist',
                    '- Verify device MIDI OUT → interface MIDI IN (correct DIN port).',
                    '- Verify interface routing in its control panel (DIN → USB/computer).',
                    '- Try the other DIN port (DIN 1 vs DIN 2) if unsure.',
                    '- If the device has multiple ports (“DAW CTRL”, “CTRL”, “EXT”), use the main instrument port.',
                    '',
                    'Why this happens',
                    '- Many interfaces expose ports, but routing is configurable; the computer might not receive the DIN stream by default.'
                ].join('\n')
            });

            // Per-manufacturer playbooks (generic scaffolds; user imports manual PDFs for exact steps)
            const manufacturers = [
                'Roland', 'Korg', 'Yamaha', 'Moog', 'Akai', 'Alesis', 'Kurzweil', 'Nord',
                'Sequential', 'Novation', 'Arturia', 'Behringer', 'Elektron', 'Waldorf',
                'Teenage Engineering', 'Dave Smith', 'iConnectivity', 'Universal Audio'
            ];

            for (const m of manufacturers) {
                const key = String(m).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                await saveSeed({
                    id: `seed-mfg-${key}-import-v1`,
                    title: `${m} — Import into ATLAS (Quick Start)`,
                    manufacturer: m,
                    tags: [key, 'manufacturer', 'import', 'device', 'playbook'],
                    content: [
                        `${m} — Import into ATLAS (Quick Start)`,
                        '',
                        'Recommended flow',
                        '- Import the official manual PDF into Knowledge.',
                        '- Search for “SysEx”, “Dump”, “Bulk”, “MIDI Dump”, “Data Transfer”, “Backup”.',
                        '',
                        'ATLAS steps',
                        '1) Connect device/port and confirm Verified (LED pulse).',
                        '2) Start Device Import (SysEx capture).',
                        '3) Trigger the device’s dump/transmit feature.',
                        '4) Stop import → Save → organize in Sets.',
                        '',
                        'Notes',
                        '- Some newer devices use USB backup folders or editor/librarian apps rather than front-panel dumps.',
                        '- If the device is behind a MIDI interface port name, use ATLAS Port Label to name the instrument.'
                    ].join('\n')
                });
            }
        } catch {
            // ignore
        }
    }
    
    /**
     * Discover devices
     */
    async discoverDevices() {
        if (!this.initialized) {
            await this.initialize();
        }

        const res = await this.midiIO.discoverDevices();

        // Best-effort: open all input ports for lightweight activity tracking.
        // This enables "last active input" without requiring manual selection.
        // NOTE: On macOS CoreMIDI, multiple apps can usually share inputs.
        try {
            const devices = res?.devices || [];
            const inputs = devices.filter(d => d && d.type === 'input' && d.id);
            for (const d of inputs) {
                const inputId = String(d.id);
                const open = await this.midiIO.openDevice(inputId, 'input');
                if (!open?.success) continue;

                // Register a passive listener to update last-active input.
                // Do NOT spam renderer if a device isn't selected; UI filters activity anyway.
                this.midiIO.onMessage(inputId, () => {
                    this._lastActiveInputId = inputId;
                    this._lastActiveInputTs = Date.now();
                });
            }
        } catch {
            // ignore
        }

        return res;
    }
    
    /**
     * Connect to device
     */
    async connectDevice(deviceId, options = {}) {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Ensure we have a fresh device list so we can pair input/output correctly.
            const discovery = await this.midiIO.discoverDevices();
            const all = discovery?.devices || [];
            const out = all.find(d => d.id === deviceId) || null;
            const requestedInputId = options && options.inputId ? String(options.inputId) : '';
            const inputMatch = out ? all.find(d => d.type === 'input' && d.name === out.name) : null;
            const inputId = requestedInputId || (inputMatch ? inputMatch.id : deviceId); // fallback (best-effort)

            // Open output + the matching input (by name) when possible
            const outputResult = await this.midiIO.openDevice(deviceId, 'output');
            const inputResult = await this.midiIO.openDevice(inputId, 'input');
            
            if (outputResult.success) {
                this.currentDevice = deviceId;
                console.log(`✅ Connected to device: ${deviceId}`);
                this._inputForOutput.set(deviceId, inputId);
            }

            // Wire MIDI activity (proof-of-life) if input opened
            if (inputResult.success) {
                this.midiIO.onMessage(inputId, (deltaTime, message) => {
                    if (!this._midiActivityCallback) return;
                    try {
                        // Track last active input for "Audition Thru" (Option C)
                        this._lastActiveInputId = inputId;
                        this._lastActiveInputTs = Date.now();

                        const isSysex = Array.isArray(message) && message[0] === 0xF0;
                        const isIdentityReply = isSysex && message[1] === 0x7E && message[3] === 0x06 && message[4] === 0x02;

                        // Capture SysEx into an active import session (best-effort)
                        const session = this._importSessions.get(deviceId);
                        if (session && session.started && isSysex && message[message.length - 1] === 0xF7) {
                            session.messages.push(message);
                            if (this._deviceImportCallback) {
                                this._deviceImportCallback({
                                    deviceId,
                                    status: 'capturing',
                                    count: session.messages.length,
                                    lastBytes: message.length,
                                    ts: Date.now()
                                });
                            }
                        }

                        this._midiActivityCallback({
                            deviceId,
                            inputId,
                            deltaTime,
                            message,
                            kind: isIdentityReply ? 'identityReply' : (isSysex ? 'sysex' : 'midi'),
                            ts: Date.now()
                        });
                    } catch {
                        // ignore callback errors
                    }
                });
            }

            // Best-effort handshake: SysEx Identity Request (many devices respond without needing key press)
            // Universal Non-realtime SysEx: F0 7E <dev> 06 01 F7 (dev 7F = all-call)
            if (outputResult.success) {
                try {
                    await this.midiIO.sendSysEx(deviceId, [0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7]);
                } catch {
                    // ignore handshake send errors
                }
            }
            
            return { 
                success: outputResult.success && inputResult.success,
                device: deviceId,
                input: inputId
            };
        } catch (error) {
            console.error('❌ Connect device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Disconnect from device
     */
    async disconnectDevice(deviceId) {
        try {
            await this.midiIO.closeDevice(deviceId, 'output');

            const inputId = this._inputForOutput.get(deviceId) || deviceId;
            await this.midiIO.closeDevice(inputId, 'input');
            this._inputForOutput.delete(deviceId);
            
            if (this.currentDevice === deviceId) {
                this.currentDevice = null;
            }
            
            console.log(`✅ Disconnected from device: ${deviceId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Disconnect device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Save patch to library
     */
    async savePatch(patchData) {
        // Auto-detect category if not provided
        if (!patchData.category || patchData.category === 'Uncategorized') {
            patchData.category = CategoryConfig.detectPatchCategory(
                patchData.name, 
                patchData.tags
            );
        }
        
        return this.database.savePatch(patchData);
    }
    
    /**
     * Load patch from library
     */
    async loadPatch(patchId) {
        const result = this.database.getPatch(patchId);
        
        if (result.success) {
            // Update last used timestamp
            this.database.updateLastUsed(patchId);
        }
        
        return result;
    }
    
    /**
     * Send patch to device
     */
    async sendPatchToDevice(deviceId, patchId, options = {}) {
        try {
            // Get patch from database
            const patchResult = await this.loadPatch(patchId);
            
            if (!patchResult.success) {
                return patchResult;
            }
            
            console.log(`📤 Sending patch "${patchResult.patch.name}" to device...`);
            
            // Send via MIDI
            const sendResult = await this.midiIO.sendPatch(
                deviceId, 
                patchResult.patch,
                options
            );
            
            if (sendResult.success) {
                console.log(`✅ Patch sent successfully (${sendResult.protocol || 'unknown protocol'})`);
            }
            
            return sendResult;
        } catch (error) {
            console.error('❌ Send patch to device error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Audition a patch inline (hardware-first):
     * - Sends patch to device
     * - Plays a short MIDI note so user hears it immediately
     */
    async auditionPatch(deviceId, patchId, options = {}) {
        try {
            const sendResult = await this.sendPatchToDevice(deviceId, patchId, options);
            if (!sendResult.success) return sendResult;

            // Enable temporary audition-thru (Option C: last active input) so user can play immediately.
            // This is auto-disabled after a short window to avoid surprise routing / feedback loops.
            const thruWindowMs = Number.isFinite(options.thruMs) ? Number(options.thruMs) : 25000;
            const thru = await this.startAuditionThru(deviceId, { durationMs: thruWindowMs });

            const channel = Number.isFinite(options.channel) ? options.channel : 0; // 0-15
            const note = Number.isFinite(options.note) ? options.note : 60; // C4
            const velocity = Number.isFinite(options.velocity) ? options.velocity : 100;
            const durationMs = Number.isFinite(options.durationMs) ? options.durationMs : 250;

            const ch = Math.max(0, Math.min(15, channel));
            const n = Math.max(0, Math.min(127, note));
            const v = Math.max(1, Math.min(127, velocity));

            // Note On
            const on = [0x90 | ch, n, v];
            const onRes = this.midiIO.sendMessage(deviceId, on);
            if (!onRes?.success) {
                return { success: false, error: onRes?.error || 'Failed to send Note On' };
            }

            await new Promise(r => setTimeout(r, Math.max(20, durationMs)));

            // Note Off
            const off = [0x80 | ch, n, 0];
            const offRes = this.midiIO.sendMessage(deviceId, off);
            if (!offRes?.success) {
                return { success: false, error: offRes?.error || 'Failed to send Note Off' };
            }

            return { success: true, thru };
        } catch (error) {
            console.error('❌ Audition patch error:', error);
            return { success: false, error: error.message };
        }
    }

    stopAuditionThru() {
        try {
            const s = this._auditionThru;
            if (!s || !s.active) return { success: true, stopped: false };

            if (s.timer) {
                try { clearTimeout(s.timer); } catch { /* ignore */ }
            }
            if (s.inputId && s.handler) {
                try { this.midiIO.offMessage(s.inputId, s.handler); } catch { /* ignore */ }
            }
            this._auditionThru = { active: false, inputId: null, outputId: null, startedAt: 0, durationMs: 0, handler: null, timer: null };
            return { success: true, stopped: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async startAuditionThru(outputDeviceId, { durationMs = 25000 } = {}) {
        try {
            // Stop any existing thru session
            this.stopAuditionThru();

            const outId = String(outputDeviceId || '').trim();
            if (!outId) return { enabled: false, reason: 'Missing output device' };

            const now = Date.now();
            const recentWindowMs = 15000; // "last active" must be recent
            const lastOk = this._lastActiveInputId && (now - (this._lastActiveInputTs || 0)) <= recentWindowMs;
            const fallback = this._inputForOutput.get(outId) || null;
            const inputId = String((lastOk ? this._lastActiveInputId : fallback) || '').trim();
            if (!inputId) return { enabled: false, reason: 'No active MIDI input detected' };

            // Ensure input is open (monitor mode may have already opened it)
            await this.midiIO.openDevice(inputId, 'input');

            const handler = (deltaTime, message) => {
                try {
                    if (!Array.isArray(message) || message.length === 0) return;
                    const status = message[0] & 0xFF;
                    // Only forward channel voice messages (avoid SysEx / timing clock / etc.)
                    if (status < 0x80 || status >= 0xF0) return;

                    // Safer default: forward notes + common performance controls
                    const hi = status & 0xF0;
                    const allowed = (hi === 0x80 || hi === 0x90 || hi === 0xA0 || hi === 0xB0 || hi === 0xD0 || hi === 0xE0);
                    if (!allowed) return;

                    // Forward as-is to the currently auditioned output
                    this.midiIO.sendMessage(outId, message);
                } catch {
                    // ignore
                }
            };

            const dur = Math.max(5000, Math.min(120000, Number(durationMs) || 25000));
            this.midiIO.onMessage(inputId, handler);

            const timer = setTimeout(() => {
                this.stopAuditionThru();
            }, dur);

            this._auditionThru = {
                active: true,
                inputId,
                outputId: outId,
                startedAt: now,
                durationMs: dur,
                handler,
                timer
            };

            return { enabled: true, inputId, outputId: outId, durationMs: dur };
        } catch (e) {
            return { enabled: false, reason: e.message };
        }
    }
    
    /**
     * Read current patch from device (MIDI 2.0 only)
     */
    async readPatchFromDevice(deviceId, saveToDB = true) {
        try {
            console.log('📥 Reading current patch from device...');
            
            const result = await this.midiIO.queryCurrentPatch(deviceId);
            
            if (!result.success) {
                return result;
            }
            
            if (saveToDB) {
                // Save to database
                const deviceInfo = await this.midiIO.getDeviceInfo(deviceId);
                
                const patchData = {
                    name: result.patch.name || 'Imported Patch',
                    device: deviceInfo.device?.name || 'Unknown Device',
                    manufacturer: deviceInfo.device?.manufacturer,
                    category: CategoryConfig.detectPatchCategory(
                        result.patch.name || 'Imported Patch',
                        ['imported', 'midi2']
                    ),
                    tags: ['imported', 'midi2'],
                    parameters: result.patch,
                    sysex: null // MIDI 2.0 doesn't use SysEx for parameters
                };
                
                const saveResult = await this.savePatch(patchData);
                
                if (saveResult.success) {
                    console.log(`✅ Patch imported and saved: ${patchData.name}`);
                    return { 
                        success: true, 
                        patch: patchData,
                        patchId: saveResult.id
                    };
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ Read patch from device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Search patches
     */
    async searchPatches(query) {
        return this.database.searchPatches(query);
    }

    // =========================
    // Patch Sets (Bundles)
    // =========================

    async createPatchSet(data) {
        if (!this.initialized) await this.initialize();
        return this.database.createPatchSet(data);
    }

    async listPatchSets(deviceName) {
        if (!this.initialized) await this.initialize();
        return this.database.listPatchSets(deviceName);
    }

    async getPatchSetItems(setId) {
        if (!this.initialized) await this.initialize();
        return this.database.getPatchSetItems(setId);
    }

    async addPatchesToSet(setId, patchIds) {
        if (!this.initialized) await this.initialize();
        return this.database.addPatchesToSet(setId, patchIds);
    }

    async removePatchFromSet(setId, patchId) {
        if (!this.initialized) await this.initialize();
        return this.database.removePatchFromSet(setId, patchId);
    }

    async updatePatchSet(setId, data) {
        if (!this.initialized) await this.initialize();
        return this.database.updatePatchSet(setId, data);
    }

    async deletePatchSet(setId) {
        if (!this.initialized) await this.initialize();
        return this.database.deletePatchSet(setId);
    }

    async reorderPatchSetItems(setId, orderedPatchIds) {
        if (!this.initialized) await this.initialize();
        return this.database.reorderPatchSetItems(setId, orderedPatchIds);
    }

    async exportPatchSet(setId) {
        if (!this.initialized) await this.initialize();
        return this.database.exportPatchSet(setId);
    }

    async importPatchSet(exportData, options = {}) {
        try {
            if (!this.initialized) await this.initialize();
            const data = exportData || {};
            if (data.kind !== 'atlas-patch-set') {
                return { success: false, error: 'Invalid file (not an ATLAS set export)' };
            }
            const set = data.set || {};
            const patches = Array.isArray(data.patches) ? data.patches : [];
            const targetDevice = String(options.deviceName || set.device || '').trim();
            if (!targetDevice) return { success: false, error: 'Missing target device name' };

            const createRes = await this.createPatchSet({
                name: String(set.name || 'Imported Set'),
                device: targetDevice,
                description: String(set.description || '')
            });
            if (!createRes.success) return createRes;
            const newSetId = createRes.set.id;

            let importedPatches = 0;
            const importedPatchIds = [];

            for (const p of patches) {
                const patch = { ...(p || {}) };
                // Always generate new IDs on import to avoid collisions
                delete patch.id;
                patch.device = targetDevice;
                patch.patchType = patch.patchType || 'hardware';

                // Decode SysEx if present
                if (patch.sysex && typeof patch.sysex === 'string' && String(patch.sysexEncoding || '').toLowerCase() === 'base64') {
                    try {
                        patch.sysex = Buffer.from(patch.sysex, 'base64');
                    } catch {
                        patch.sysex = null;
                    }
                }

                // Ensure minimum fields
                patch.name = String(patch.name || 'Imported Patch').trim() || 'Imported Patch';
                patch.category = patch.category || 'Imported';
                patch.tags = Array.isArray(patch.tags) ? patch.tags : [];
                patch.tags = Array.from(new Set([...patch.tags, 'imported', 'set']));

                // eslint-disable-next-line no-await-in-loop
                const saveRes = await this.savePatch(patch);
                if (saveRes && saveRes.success) {
                    importedPatches += 1;
                    importedPatchIds.push(saveRes.id);
                }
            }

            await this.addPatchesToSet(newSetId, importedPatchIds);
            await this.reorderPatchSetItems(newSetId, importedPatchIds);

            return {
                success: true,
                setId: newSetId,
                importedPatches,
                device: targetDevice
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    /**
     * Delete patch
     */
    async deletePatch(patchId) {
        return this.database.deletePatch(patchId);
    }

    /**
     * Clear entire patch library
     */
    async clearLibrary() {
        return this.database.deleteAllPatches();
    }

    // =========================
    // Knowledge / Copilot
    // =========================

    async saveKnowledgeDoc(doc) {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.database.saveKnowledgeDoc(doc);
    }

    async listKnowledgeDocs(limit = 200) {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.database.listKnowledgeDocs(limit);
    }

    async deleteKnowledgeDoc(docId) {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.database.deleteKnowledgeDoc(docId);
    }

    async searchKnowledge(q, limit = 5) {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.database.searchKnowledge(q, limit);
    }

    /**
     * Local-first "copilot" (no cloud LLM):
     * - retrieves relevant knowledge passages
     * - recommends relevant patches/presets from your library (ranked)
     * - adds lightweight rule-based suggestions
     */
    async askCopilot(question, context = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const q = String(question || '').trim();
        if (!q) return { success: false, error: 'Question is empty' };

        const provider = String(context.provider || 'local');
        const model = String(context.model || 'local-rules');
        const temperature = Number.isFinite(Number(context.temperature)) ? Number(context.temperature) : 0.3;
        const apiKey = String(context.apiKey || '').trim();
        const baseUrl = String(context.baseUrl || '').trim();
        const enableTools = Boolean(context.enableTools);
        const searchProvider = String(context.searchProvider || '').trim(); // 'serper' | 'searxng' | ''
        const searchApiKey = String(context.searchApiKey || '').trim();
        const searchBaseUrl = String(context.searchBaseUrl || '').trim();

        // -----------------------
        // Knowledge retrieval
        // -----------------------
        const knowledge = await this.searchKnowledge(q, 6);
        const passages = (knowledge.results || []).map(r => ({
            id: r.id,
            title: r.title,
            excerpt: r.excerpt
        }));

        // Optional: Web search tool (opt-in)
        const web = [];
        if (enableTools && searchProvider) {
            try {
                const results = await this.webSearch(q, { provider: searchProvider, apiKey: searchApiKey, baseUrl: searchBaseUrl, limit: 5 });
                (results || []).forEach(r => web.push(r));
            } catch {
                // ignore
            }
        }

        // -----------------------
        // Library recommendations (local scoring)
        // -----------------------
        const CategoryConfig = require('./category-config.js');
        const detectedCategory = CategoryConfig.detectPatchCategory(q, []);

        const normalize = (s) => String(s || '').toLowerCase();
        const words = normalize(q)
            .replace(/[^\w\s&-]/g, ' ')
            .split(/\s+/)
            .map(w => w.trim())
            .filter(w => w && w.length >= 3);

        const uniqueWords = Array.from(new Set(words)).slice(0, 12);
        const detectFromList = (list) => {
            const lower = normalize(q);
            return (list || []).find(item => lower.includes(normalize(item)));
        };

        const detectedGenre = context.genre || detectFromList(CategoryConfig.GENRES);
        const detectedMood = detectFromList(CategoryConfig.MOODS);

        // Optional: seed recommendations from a specific patch/preset
        let seedPatch = null;
        if (context && context.seedPatchId) {
            try {
                const seedRes = await this.loadPatch(context.seedPatchId);
                if (seedRes && seedRes.success && seedRes.patch) {
                    seedPatch = seedRes.patch;
                }
            } catch {
                seedPatch = null;
            }
        }

        // Optional: preference context (from local UI memory)
        const pref = context && context.preference && typeof context.preference === 'object'
            ? context.preference
            : { categories: [], tags: [], devices: [], plugins: [] };
        const prefCategories = Array.isArray(pref.categories) ? pref.categories.map(normalize) : [];
        const prefTags = Array.isArray(pref.tags) ? pref.tags.map(normalize) : [];
        const prefDevices = Array.isArray(pref.devices) ? pref.devices.map(normalize) : [];
        const prefPlugins = Array.isArray(pref.plugins) ? pref.plugins.map(normalize) : [];

        // Pull a reasonable candidate set; scoring refines it.
        const candidateRes = await this.searchPatches({ limit: 800 });
        const candidates = (candidateRes.patches || []).slice();
        const now = Date.now();

        const scorePatch = (patch) => {
            let score = 0;
            const why = [];

            const name = normalize(patch.name);
            const device = normalize(patch.device);
            const pluginName = normalize(patch.pluginName);
            const category = String(patch.category || 'Uncategorized');
            const tags = Array.isArray(patch.tags) ? patch.tags.map(t => normalize(t)) : [];

            // Category alignment
            if (detectedCategory && category === detectedCategory) {
                score += 6;
                why.push(`category:${category}`);
            }

            // Term matches (name weighted highest)
            for (const term of uniqueWords) {
                if (name.includes(term)) { score += 3; why.push(`name:${term}`); continue; }
                if (tags.some(t => t.includes(term))) { score += 2; why.push(`tag:${term}`); continue; }
                if (device.includes(term) || pluginName.includes(term)) { score += 1.5; why.push(`source:${term}`); }
            }

            // Genre / mood metadata if present
            if (detectedGenre && patch.genre && String(patch.genre) === String(detectedGenre)) {
                score += 2.5;
                why.push(`genre:${detectedGenre}`);
            }
            if (detectedMood && patch.mood && String(patch.mood) === String(detectedMood)) {
                score += 1.5;
                why.push(`mood:${detectedMood}`);
            }

            // Preference boosts (learned taste)
            if (prefCategories.length && prefCategories.includes(normalize(category))) {
                score += 2.0;
                why.push('pref:category');
            }
            if (prefDevices.length && prefDevices.some(d => d && (device.includes(d) || pluginName.includes(d)))) {
                score += 1.25;
                why.push('pref:device');
            }
            if (prefPlugins.length && prefPlugins.some(pn => pn && pluginName.includes(pn))) {
                score += 1.75;
                why.push('pref:plugin');
            }
            if (prefTags.length) {
                const overlap = tags.filter(t => prefTags.includes(t)).slice(0, 4);
                if (overlap.length) {
                    score += 0.75 * overlap.length;
                    why.push('pref:tags');
                }
            }

            // Seed similarity boosts (content-based)
            if (seedPatch && patch.id !== seedPatch.id) {
                const seedCat = String(seedPatch.category || '');
                const seedDevice = normalize(seedPatch.device);
                const seedPluginName = normalize(seedPatch.pluginName);
                const seedTags = Array.isArray(seedPatch.tags) ? seedPatch.tags.map(t => normalize(t)) : [];

                if (seedCat && String(category) === seedCat) {
                    score += 5;
                    why.push('seed:category');
                }

                const tagOverlap = tags.filter(t => seedTags.includes(t)).slice(0, 6);
                if (tagOverlap.length) {
                    score += 1.2 * tagOverlap.length;
                    why.push('seed:tags');
                }

                if (seedPluginName && pluginName && pluginName.includes(seedPluginName)) {
                    score += 3;
                    why.push('seed:plugin');
                } else if (seedDevice && device && device.includes(seedDevice)) {
                    score += 2;
                    why.push('seed:device');
                }

                if ((seedPatch.patchType || 'hardware') === (patch.patchType || 'hardware')) {
                    score += 0.75;
                    why.push('seed:type');
                }
            }

            // Light recency bias (lastUsed)
            const lastUsed = Number(patch.lastUsed || 0);
            if (lastUsed > 0) {
                const days = Math.max(0, (now - lastUsed) / (1000 * 60 * 60 * 24));
                const bump = Math.max(0, 2 - Math.min(2, days / 14)); // up to +2 if used within ~2 weeks
                score += bump;
                if (bump > 0.25) why.push('recently-used');
            }

            return { score, why: Array.from(new Set(why)).slice(0, 6) };
        };

        const scored = candidates
            .map(p => {
                const s = scorePatch(p);
                return { patch: p, score: s.score, why: s.why };
            })
            .filter(x => x.score > 0.5 && (!seedPatch || x.patch.id !== seedPatch.id))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(x => ({
                id: x.patch.id,
                name: x.patch.name,
                device: x.patch.device,
                manufacturer: x.patch.manufacturer || null,
                category: x.patch.category || 'Uncategorized',
                tags: x.patch.tags || [],
                patchType: x.patch.patchType || 'hardware',
                pluginName: x.patch.pluginName || null,
                pluginType: x.patch.pluginType || null,
                score: Number(x.score.toFixed(2)),
                why: x.why
            }));

        const lower = q.toLowerCase();
        const tips = [];

        // Minimal production heuristics (expand over time)
        if (lower.includes('vocal')) {
            tips.push('Vocals: start with HPF (80–120Hz), gentle compression (3–6dB GR), then de-ess if needed.');
        }
        if (lower.includes('drum') || lower.includes('kick') || lower.includes('snare')) {
            tips.push('Drums: shape transients (attack/release), parallel compression for punch, saturation for density.');
        }
        if (lower.includes('bass')) {
            tips.push('Bass: control low-end with compression, add harmonics/saturation for translation, watch phase/mono.');
        }
        if (lower.includes('master') || lower.includes('mastering')) {
            tips.push('Mastering: keep it subtle—broad EQ, gentle comp, limiter last; aim for dynamics + translation.');
        }

        if (context.genre) {
            tips.push(`Genre context (${context.genre}): I can tailor chains and plugin choices—tell me if you want “clean”, “gritty”, or “lush”.`);
        }

        // Optional: LLM overlay (ChatGPT/OpenAI or local OpenAI-compatible)
        let answer = '';
        if (provider === 'openai' || provider === 'local_llm') {
            try {
                answer = await this.generateCopilotAnswerWithLLM(q, {
                    provider,
                    model,
                    temperature,
                    apiKey,
                    baseUrl,
                    passages,
                    recommendations: { patches: scored },
                    web
                });
            } catch (e) {
                answer = `LLM call failed (${e.message}). Falling back to local guidance.`;
            }
        }

        return {
            success: true,
            provider,
            model,
            answer,
            question: q,
            detected: {
                category: detectedCategory || null,
                genre: detectedGenre || null,
                mood: detectedMood || null
            },
            seed: seedPatch ? {
                id: seedPatch.id,
                name: seedPatch.name,
                category: seedPatch.category || null,
                patchType: seedPatch.patchType || 'hardware'
            } : null,
            recommendations: {
                patches: scored
            },
            passages,
            web,
            tips
        };
    }

    async generateCopilotAnswerWithLLM(question, { provider, model, temperature, apiKey, baseUrl, passages, recommendations, web }) {
        const sys = [
            'You are ATLAS Copilot, an expert assistant for hardware synths/samplers/drum machines and VST/AU plugins.',
            'Be concise, actionable, and local-first.',
            'Prefer Knowledge passages when available; web snippets are supplementary.',
            'Use short numbered steps for procedures.',
            'If uncertain, say what needs confirming.'
        ].join('\n');

        const ctx = [
            'Context:',
            '',
            `Knowledge passages (${(passages || []).length}):`,
            ...(passages || []).slice(0, 6).map(p => `- ${p.title}: ${p.excerpt || ''}`),
            '',
            `Library recommendations (${(recommendations?.patches || []).length}):`,
            ...(recommendations?.patches || []).slice(0, 6).map(p => `- ${p.name} (${p.category || 'Uncategorized'} • ${p.patchType === 'plugin' ? (p.pluginName || p.device) : p.device})`),
            '',
            `Web snippets (${(web || []).length}):`,
            ...(web || []).slice(0, 5).map(r => `- ${r.title}: ${r.snippet || ''}`),
        ].join('\n');

        const messages = [
            { role: 'system', content: sys },
            { role: 'user', content: `${question}\n\n${ctx}` }
        ];

        if (provider === 'openai') {
            if (!apiKey) throw new Error('Missing OpenAI API key');
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: (model && model !== 'local-rules' && model !== 'local-knowledge') ? model : 'gpt-4o-mini',
                    temperature,
                    messages
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
            return String(data?.choices?.[0]?.message?.content || '').trim();
        }

        // local_llm: OpenAI-compatible endpoints (Ollama/LM Studio)
        if (!baseUrl) throw new Error('Missing baseUrl for Local LLM');
        const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: model && model !== 'local-rules' && model !== 'local-knowledge' ? model : 'llama3.1',
                temperature,
                messages
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
        return String(data?.choices?.[0]?.message?.content || '').trim();
    }

    async webSearch(query, { provider, apiKey, baseUrl, limit = 5 } = {}) {
        const q = String(query || '').trim();
        if (!q) return [];
        const p = String(provider || '').toLowerCase();
        const n = Math.max(1, Math.min(10, Number(limit) || 5));

        // Serper (Google results via API): https://serper.dev
        if (p === 'serper') {
            if (!apiKey) throw new Error('Missing Serper API key');
            const res = await fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': apiKey
                },
                body: JSON.stringify({ q, num: n })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
            const organic = Array.isArray(data?.organic) ? data.organic : [];
            return organic.slice(0, n).map(r => ({ title: r.title || '', url: r.link || '', snippet: r.snippet || '' }));
        }

        // SearXNG (self-hosted meta-search): expects JSON
        if (p === 'searxng') {
            if (!baseUrl) throw new Error('Missing SearXNG baseUrl');
            const u = baseUrl.replace(/\/+$/, '') + `/search?q=${encodeURIComponent(q)}&format=json`;
            const res = await fetch(u);
            const data = await res.json();
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const results = Array.isArray(data?.results) ? data.results : [];
            return results.slice(0, n).map(r => ({ title: r.title || '', url: r.url || '', snippet: r.content || '' }));
        }

        return [];
    }
    
    /**
     * Export patches
     */
    async exportPatches(deviceName = null) {
        return this.database.exportPatches(deviceName);
    }
    
    /**
     * Import patches
     */
    async importPatches(exportData) {
        return this.database.importPatches(exportData);
    }
    
    /**
     * Backup all patches for a device
     */
    async backupDevice(deviceId) {
        try {
            const deviceInfo = await this.midiIO.getDeviceInfo(deviceId);
            
            if (!deviceInfo.success) {
                return deviceInfo;
            }
            
            const deviceName = deviceInfo.device.name;
            
            console.log(`💾 Backing up all patches from ${deviceName}...`);
            
            // Export patches for this device
            const exportResult = await this.exportPatches(deviceName);
            
            if (!exportResult.success) {
                return exportResult;
            }
            
            const filename = `atlas-backup-${deviceName.replace(/\s+/g, '-')}-${Date.now()}.json`;
            
            return {
                success: true,
                filename,
                data: exportResult.data,
                count: exportResult.data.patches.length
            };
        } catch (error) {
            console.error('❌ Backup device error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get protocol information
     */
    getProtocolInfo() {
        return this.midiIO.getProtocolInfo();
    }
    
    /**
     * Discover plugins
     */
    async discoverPlugins() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            const result = await this.pluginScanner.discoverPlugins();
            
            // Save discovered plugins to database
            if (result.success) {
                for (const plugin of result.plugins) {
                    await this.database.savePlugin(plugin);
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ Discover plugins error:', error);
            return { success: false, error: error.message, plugins: [] };
        }
    }

    inferManufacturerFromWeb(pluginName, results = []) {
        const name = String(pluginName || '').trim();
        const text = (r) => `${r.title || ''}\n${r.snippet || ''}\n${r.url || ''}`.toLowerCase();
        const known = [
            'output', 'native instruments', 'arturia', 'spectrasonics', 'u-he', 'xfer', 'waves', 'fabfilter',
            'soundtoys', 'valhalla', 'izotope', 'softube', 'slate digital', 'plugin alliance', 'brainworx',
            'universal audio', 'uad', 'kilohearts', 'ableton', 'steinberg', 'melda', 'psp audioware',
            'eventide', 'tc electronic', 'sound radix', 'sonible', 'acustica', 'ua', 'air music', 'akai',
            'roland', 'korg', 'yamaha', 'moog'
        ];

        // domain->manufacturer
        const domainMap = [
            { re: /output\.com/i, name: 'Output' },
            { re: /native-instruments\.com|ni\.com/i, name: 'Native Instruments' },
            { re: /arturia\.com/i, name: 'Arturia' },
            { re: /spectrasonics\.net/i, name: 'Spectrasonics' },
            { re: /u-he\.com/i, name: 'u-he' },
            { re: /xferrecords\.com/i, name: 'Xfer' },
            { re: /waves\.com/i, name: 'Waves' },
            { re: /fabfilter\.com/i, name: 'FabFilter' },
            { re: /soundtoys\.com/i, name: 'Soundtoys' },
            { re: /valhalladsp\.com/i, name: 'Valhalla DSP' },
            { re: /izotope\.com/i, name: 'iZotope' },
            { re: /softube\.com/i, name: 'Softube' },
            { re: /slatedigital\.com/i, name: 'Slate Digital' },
            { re: /plugin-alliance\.com|brainworx\.audio/i, name: 'Plugin Alliance' },
            { re: /uaudio\.com|universal-audio\.com/i, name: 'Universal Audio' },
        ];

        for (const r of results) {
            const url = String(r.url || '');
            const d = domainMap.find(x => x.re.test(url));
            if (d) return { manufacturer: d.name, confidence: 0.85, sourceUrl: url };
        }

        for (const r of results) {
            const blob = text(r);
            for (const k of known) {
                if (blob.includes(k)) {
                    const pretty = k === 'uad' ? 'Universal Audio' :
                        k === 'izotope' ? 'iZotope' :
                        k === 'valhalla' ? 'Valhalla DSP' :
                        k.replace(/\b\w/g, c => c.toUpperCase());
                    return { manufacturer: pretty, confidence: 0.6, sourceUrl: r.url || '' };
                }
            }
        }

        // Fallback: if plugin name contains a known vendor token (rare)
        const lower = name.toLowerCase();
        if (lower.includes('arcade')) return { manufacturer: 'Output', confidence: 0.95, sourceUrl: '' };

        return null;
    }

    async enrichUnknownPluginManufacturers(options = {}) {
        try {
            if (!this.initialized) await this.initialize();

            const provider = String(options.searchProvider || '').trim(); // serper|searxng
            const apiKey = String(options.searchApiKey || '').trim();
            const baseUrl = String(options.searchBaseUrl || '').trim();
            const limit = Math.max(1, Math.min(50, Number(options.limit) || 20));

            if (!provider) return { success: false, error: 'Search provider is not configured' };

            const all = await this.database.getPlugins();
            if (!all.success) return { success: false, error: all.error || 'Failed to load plugins' };

            const plugins = (all.plugins || []).filter(p => !p.manufacturer || String(p.manufacturer).toLowerCase() === 'unknown');
            const targets = plugins.slice(0, limit);
            let updated = 0;
            let skipped = 0;

            for (const p of targets) {
                const key = `pluginVendor:${String(p.name || '').toLowerCase()}`.slice(0, 200);
                const cached = this.database.getVendorCache(key);
                if (cached.success && cached.value && cached.value.manufacturer) {
                    const m = cached.value.manufacturer;
                    if (m && m !== 'Unknown') {
                        await this.database.savePlugin({ ...p, manufacturer: m });
                        updated += 1;
                        continue;
                    }
                }

                // Web query
                const q = `${p.name} plugin manufacturer`;
                // eslint-disable-next-line no-await-in-loop
                const results = await this.webSearch(q, { provider, apiKey, baseUrl, limit: 5 });
                const inf = this.inferManufacturerFromWeb(p.name, results);
                if (!inf) {
                    this.database.saveVendorCache({ key, manufacturer: null, sourceUrl: '', confidence: 0.0 });
                    skipped += 1;
                    continue;
                }

                this.database.saveVendorCache({ key, manufacturer: inf.manufacturer, sourceUrl: inf.sourceUrl || '', confidence: inf.confidence || 0.5 });
                await this.database.savePlugin({ ...p, manufacturer: inf.manufacturer });
                updated += 1;
            }

            return { success: true, updated, skipped, attempted: targets.length };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Extract presets from a plugin
     */
    async extractPluginPresets(pluginId, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            // First check if plugin is in discoveredPlugins
            let plugin = this.pluginScanner.discoveredPlugins.find(p => p.id === pluginId);
            
            // If not found, try to load from database and reconstruct plugin info
            if (!plugin) {
                console.log(`⚠️  Plugin ${pluginId} not in discoveredPlugins, loading from database...`);
                const pluginsResult = await this.database.getPlugins();
                const dbPlugin = pluginsResult.plugins?.find(p => p.id === pluginId);
                
                if (!dbPlugin) {
                    return { success: false, error: `Plugin ${pluginId} not found in database` };
                }
                
                // Reconstruct plugin info for extraction
                // We need to find preset paths from the file system
                const fs = require('fs');
                const path = require('path');
                
                plugin = {
                    id: dbPlugin.id,
                    name: dbPlugin.name,
                    type: dbPlugin.type,
                    path: dbPlugin.path,
                    manufacturer: dbPlugin.manufacturer,
                    category: dbPlugin.category,
                    presetPaths: []
                };
                
                // Try to find preset paths (use the same smart discovery as the scanner)
                try {
                    if (fs.existsSync(dbPlugin.path)) {
                        const ext = path.extname(String(dbPlugin.path || '')).toLowerCase();
                        if (ext === '.vst3') {
                            plugin.presetPaths = this.pluginScanner.findVST3PresetPaths(dbPlugin.path) || [];
                        } else if (ext === '.component') {
                            plugin.presetPaths = this.pluginScanner.findAUPresetPaths(dbPlugin.path) || [];
                        } else {
                            // Fallback: bundle-only scan (legacy / unknown formats)
                            const presetLocations = [
                                path.join(dbPlugin.path, 'Contents', 'Resources', 'Presets'),
                                path.join(dbPlugin.path, 'Presets'),
                                path.join(dbPlugin.path, 'Contents', 'Presets')
                            ];
                            for (const presetLoc of presetLocations) {
                                if (!fs.existsSync(presetLoc)) continue;
                                try {
                                    const entries = fs.readdirSync(presetLoc, { recursive: true });
                                    for (const entry of entries) {
                                        const fullPath = path.join(presetLoc, entry);
                                        if (fs.statSync(fullPath).isFile()) {
                                            if (entry.match(/\.(vstpreset|aupreset|fxp|fxb|preset)$/i)) {
                                                plugin.presetPaths.push(fullPath);
                                            }
                                        }
                                    }
                                } catch (err) {
                                    console.warn(`⚠️  Error reading preset directory ${presetLoc}:`, err.message);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('⚠️  Smart preset discovery failed:', e.message);
                }
                
                // Temporarily add to discoveredPlugins so extractPresets can find it
                this.pluginScanner.discoveredPlugins.push(plugin);
            }
            
            console.log(`🔍 Extracting presets from plugin: ${plugin.name} (${pluginId})`);
            console.log(`   Plugin path: ${plugin.path}`);
            console.log(`   Preset paths found: ${plugin.presetPaths.length}`);
            
            const result = await this.pluginScanner.extractPresets(pluginId, options);
            
            console.log(`📊 Extraction result:`, {
                success: result.success,
                presetCount: result.presets?.length || 0,
                error: result.error
            });
            
            // Save plugin presets to database as patches
            if (result.success && result.presets && result.presets.length > 0) {
                let savedCount = 0;
                let errorCount = 0;
                
                for (const preset of result.presets) {
                    try {
                        console.log(`   💾 Attempting to save preset: ${preset.name}`);
                        console.log(`      Plugin: ${preset.pluginName}, Type: ${preset.pluginType}`);
                        
                        const patchData = {
                            name: preset.name,
                            device: preset.pluginName,
                            manufacturer: plugin.manufacturer,
                            category: (() => {
                                const c = CategoryConfig.detectPatchCategory(
                                    preset.name,
                                    ['plugin', preset.pluginType.toLowerCase()]
                                );
                                // Many plugin packs (ex: Roland .fzi) don't have enough info for Lead/Bass/etc.
                                // Default to a useful category instead of "Uncategorized".
                                return (!c || c === 'Uncategorized') ? 'Plugin Preset' : c;
                            })(),
                            tags: ['plugin', preset.pluginType.toLowerCase()],
                            patchType: 'plugin',
                            pluginId: preset.pluginId,
                            pluginName: preset.pluginName,
                            pluginType: preset.pluginType,
                            pluginPath: preset.path,
                            parameters: preset.parameters || {}
                        };
                        
                        console.log(`      Patch data prepared:`, {
                            name: patchData.name,
                            device: patchData.device,
                            category: patchData.category,
                            patchType: patchData.patchType,
                            pluginId: patchData.pluginId
                        });
                        
                        const saveResult = await this.database.savePatch(patchData);
                        console.log(`      Save result:`, saveResult);
                        
                        if (saveResult.success) {
                            savedCount++;
                            console.log(`   ✅ Saved preset: ${preset.name} (ID: ${saveResult.id})`);
                        } else {
                            errorCount++;
                            const errorMsg = saveResult.error || 'Unknown error';
                            const errorDetails = saveResult.details || '';
                            console.error(`   ❌ Failed to save preset ${preset.name}:`, errorMsg);
                            console.error(`      Full error object:`, JSON.stringify(saveResult, null, 2));
                            
                            // Store error details for return to renderer
                            if (!result.saveErrors) result.saveErrors = [];
                            result.saveErrors.push({
                                presetName: preset.name,
                                error: errorMsg,
                                details: errorDetails
                            });
                        }
                    } catch (err) {
                        errorCount++;
                        console.error(`   ❌ Exception saving preset ${preset.name}:`, err);
                        console.error(`      Error stack:`, err.stack);
                        
                        // Store error details for return to renderer
                        if (!result.saveErrors) result.saveErrors = [];
                        result.saveErrors.push({
                            presetName: preset.name,
                            error: err.message,
                            details: err.stack
                        });
                    }
                }
                
                console.log(`✅ Extracted ${result.presets.length} preset(s), saved ${savedCount}, errors: ${errorCount} from ${plugin.name}`);
                
                // Return updated result with save info and error details
                return {
                    ...result,
                    savedCount,
                    errorCount,
                    saveErrors: result.saveErrors || []
                };
            } else if (result.success && (!result.presets || result.presets.length === 0)) {
                console.warn(`⚠️  Extraction succeeded but no presets found for ${plugin.name}`);
                return {
                    ...result,
                    warning: 'No presets found in plugin files'
                };
            }
            
            return result;
        } catch (error) {
            console.error('❌ Extract plugin presets error:', error);
            return { success: false, error: error.message, presets: [] };
        }
    }

    /**
     * Get all plugins
     */
    async getPlugins() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        return this.database.getPlugins();
    }

    /**
     * Persist a manual vendor override for a plugin (local-first)
     */
    async setPluginManufacturer(pluginId, manufacturer) {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.database.setPluginManufacturer(pluginId, manufacturer);
    }

    /**
     * Get all categories
     */
    async getCategories() {
        return this.database.getCategories();
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        try {
            const allPatches = await this.searchPatches({ limit: null });
            const categories = await this.database.getCategories();
            const devices = await this.database.getDevicesWithPatches();
            const plugins = await this.getPlugins();
            const protocolInfo = this.getProtocolInfo();
            
            // Count hardware vs plugin patches
            const hardwarePatches = allPatches.patches.filter(p => !p.patchType || p.patchType === 'hardware').length;
            const pluginPatches = allPatches.patches.filter(p => p.patchType === 'plugin').length;
            
            return {
                success: true,
                stats: {
                    totalPatches: allPatches.count,
                    hardwarePatches: hardwarePatches,
                    pluginPatches: pluginPatches,
                    categories: categories.categories.length,
                    devices: devices.devices.length,
                    plugins: plugins.plugins?.length || 0,
                    protocol: protocolInfo.current,
                    midi2Available: protocolInfo.available.midi2
                }
            };
        } catch (error) {
            console.error('❌ Get statistics error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Shutdown ATLAS
     */
    async shutdown() {
        console.log('🔌 Shutting down ATLAS...');
        
        await this.midiIO.closeAll();
        this.database.close();
        
        this.initialized = false;
        console.log('✅ ATLAS shutdown complete');
        
        return { success: true };
    }
}

module.exports = AtlasManager;
