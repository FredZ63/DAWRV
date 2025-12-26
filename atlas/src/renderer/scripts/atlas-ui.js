/**
 * ATLAS UI Controller
 * Manages the main user interface
 */

class AtlasUI {
    constructor() {
        this.currentDevice = null;
        this.patches = [];
        this.devicePatches = [];
        this.devices = [];
        this.deviceManufacturerFilter = '';
        this.deviceModelFilter = '';
        this.plugins = [];
        this.allPlugins = []; // Store all plugins (unfiltered)
        this.pluginCategoryFilter = null; // Current plugin category filter
        this.pluginVendorFilter = '';
        this.pluginFilterModeKey = 'atlas_plugin_filter_mode_v1';
        this.pluginFilterMode = (() => {
            try { return localStorage.getItem('atlas_plugin_filter_mode_v1') || 'types'; } catch { return 'types'; }
        })(); // 'types' | 'vendors'
        this.protocolInfo = null;
        this.dawConnected = false;
        this.viewMode = 'all'; // 'all', 'hardware', 'plugins'
        this.pluginSearchTerm = '';
        this.debug = false;
        this.selectedPluginId = null;
        this.pluginPresetView = null; // { pluginId, name }
        this.pluginPresetSearch = '';
        this.pluginCategoryCollapsedKey = 'atlas_plugin_category_collapsed_v1';
        this.pluginCategoryCollapsed = this.loadPluginCategoryCollapsed();
        this.activeTab = 'library'; // 'library' | 'device' | 'knowledge'
        this.copilotConfigKey = 'atlas_copilot_config';
        this.copilotConfig = this.loadCopilotConfig();
        this._midiPulseTimer = null;
        this._midiLastSignalTsByDevice = new Map(); // outputDeviceId -> ts
        this._midiVerifiedDevices = new Set(); // outputDeviceId
        this._midiTitleTimer = setInterval(() => this.refreshMidiIndicatorTitles(), 1000);
        this._importPromptedDevices = new Set();
        this._importHelpPromptedDevices = new Set();
        this._activeDeviceImport = null; // { deviceId, count, deviceName }

        // Device Librarian state
        this.activePatchSetId = null;
        this.deviceSelectedPatchIds = new Set();

        // Port labels (instrument-behind-port) - local-first
        this.portAliasesKey = 'atlas_port_aliases_v1'; // keyed by port name string
        this.portAliases = this.loadPortAliases();
    }

    loadPluginCategoryCollapsed() {
        try {
            const raw = localStorage.getItem(this.pluginCategoryCollapsedKey);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    savePluginCategoryCollapsed() {
        try {
            localStorage.setItem(this.pluginCategoryCollapsedKey, JSON.stringify(this.pluginCategoryCollapsed || {}));
        } catch {
            // ignore
        }
    }

    isPluginCategoryCollapsed(category) {
        return Boolean(this.pluginCategoryCollapsed && this.pluginCategoryCollapsed[String(category || 'unknown')]);
    }

    setPluginCategoryCollapsed(category, collapsed) {
        const key = String(category || 'unknown');
        if (!this.pluginCategoryCollapsed) this.pluginCategoryCollapsed = {};
        this.pluginCategoryCollapsed[key] = Boolean(collapsed);
        this.savePluginCategoryCollapsed();
    }

    toggleAllPluginCategories(collapse) {
        const desired = Boolean(collapse);
        const keys = ['instrument', 'fx', 'outboard', 'guitar', 'miditools', 'mastering', 'analyzer', 'saturation', 'synth', 'sampler', 'drum', 'unknown'];
        if (!this.pluginCategoryCollapsed) this.pluginCategoryCollapsed = {};
        keys.forEach(k => { this.pluginCategoryCollapsed[k] = desired; });
        this.savePluginCategoryCollapsed();
        this.renderPluginList();
    }

    loadPortAliases() {
        try {
            const raw = localStorage.getItem(this.portAliasesKey);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    savePortAliases() {
        try {
            localStorage.setItem(this.portAliasesKey, JSON.stringify(this.portAliases || {}));
        } catch {
            // ignore
        }
    }

    getPortAliasLabel(portName) {
        const key = String(portName || '');
        const entry = this.portAliases && this.portAliases[key] ? this.portAliases[key] : null;
        const label = entry && entry.label ? String(entry.label).trim() : '';
        return label;
    }

    setPortAliasLabel(portName, label) {
        const key = String(portName || '');
        if (!key) return;
        const v = String(label || '').trim();
        if (!v) {
            if (this.portAliases) delete this.portAliases[key];
        } else {
            if (!this.portAliases) this.portAliases = {};
            this.portAliases[key] = { label: v, updated: Date.now() };
        }
        this.savePortAliases();
    }

    showPortLabelModal(portName) {
        const pn = String(portName || '').trim();
        if (!pn) return;

        if (!this._portLabelModal) {
            const backdrop = document.createElement('div');
            backdrop.className = 'atlas-modal-backdrop';
            backdrop.style.display = 'none';
            backdrop.innerHTML = `
                <div class="atlas-modal" style="width:min(560px, 92vw);">
                    <h2>Label MIDI Port</h2>
                    <div class="atlas-help">
                        Use this to name the instrument behind an interface port (ex: <strong>Kurzweil K2000</strong>).
                    </div>
                    <div class="atlas-form-row" style="margin-top:16px;">
                        <label>Port</label>
                        <input id="port-label-port" disabled />
                    </div>
                    <div class="atlas-form-row">
                        <label>Instrument label</label>
                        <input id="port-label-value" placeholder="Kurzweil K2000" />
                        <div class="atlas-help">Leave blank to clear the label.</div>
                    </div>
                    <div class="atlas-modal-actions">
                        <button class="btn-primary" id="port-label-save">Save</button>
                        <button class="btn-action btn-action--danger" id="port-label-cancel">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            this._portLabelModal = backdrop;

            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) backdrop.style.display = 'none';
            });
        }

        const m = this._portLabelModal;
        m.style.display = 'flex';

        const portEl = m.querySelector('#port-label-port');
        const valueEl = m.querySelector('#port-label-value');
        const saveBtn = m.querySelector('#port-label-save');
        const cancelBtn = m.querySelector('#port-label-cancel');

        if (portEl) portEl.value = pn;
        if (valueEl) valueEl.value = this.getPortAliasLabel(pn) || '';
        if (valueEl) setTimeout(() => valueEl.focus(), 50);

        const close = () => { m.style.display = 'none'; };

        if (cancelBtn) cancelBtn.onclick = () => close();

        if (saveBtn) {
            saveBtn.onclick = () => {
                const next = valueEl ? String(valueEl.value || '') : '';
                this.setPortAliasLabel(pn, next);
                close();
                this.renderDeviceList();
                if (this.activeTab === 'device') this.refreshDeviceLibrarian();
                this.setStatus('Port label saved ✅');
            };
        }

        if (valueEl) {
            valueEl.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (saveBtn) saveBtn.click();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                }
            };
        }
    }

    showPluginVendorFixModal(pluginId) {
        const pid = String(pluginId || '').trim();
        if (!pid) return;
        const plugin = (this.allPlugins || []).find(p => String(p?.id || '') === pid);
        if (!plugin) {
            this.showError('Plugin not found.');
            return;
        }

        if (!this._pluginVendorModal) {
            const backdrop = document.createElement('div');
            backdrop.className = 'atlas-modal-backdrop';
            backdrop.style.display = 'none';
            backdrop.innerHTML = `
                <div class="atlas-modal" style="width:min(640px, 92vw);">
                    <h2>Fix Plugin Vendor</h2>
                    <div class="atlas-help">
                        If a plugin shows <strong>Unknown</strong> or the wrong vendor, set it here. This is stored locally in your ATLAS database.
                    </div>
                    <div class="atlas-form-row" style="margin-top:16px;">
                        <label>Plugin</label>
                        <input id="plugin-vendor-plugin" disabled />
                    </div>
                    <div class="atlas-form-row">
                        <label>Vendor (Manufacturer)</label>
                        <input id="plugin-vendor-value" list="plugin-vendor-suggestions" placeholder="Roland, Universal Audio, KORG…" />
                        <datalist id="plugin-vendor-suggestions"></datalist>
                        <div class="atlas-help">Leave blank to set vendor to <strong>Unknown</strong>.</div>
                    </div>
                    <div class="atlas-modal-actions">
                        <button class="btn-primary" id="plugin-vendor-save">Save</button>
                        <button class="btn-action btn-action--danger" id="plugin-vendor-cancel">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            this._pluginVendorModal = backdrop;

            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) backdrop.style.display = 'none';
            });
        }

        const m = this._pluginVendorModal;
        m.style.display = 'flex';

        const pluginEl = m.querySelector('#plugin-vendor-plugin');
        const valueEl = m.querySelector('#plugin-vendor-value');
        const saveBtn = m.querySelector('#plugin-vendor-save');
        const cancelBtn = m.querySelector('#plugin-vendor-cancel');
        const dl = m.querySelector('#plugin-vendor-suggestions');

        if (dl) {
            const vendors = Array.isArray(this._pluginVendors) ? this._pluginVendors : [];
            dl.innerHTML = vendors.map(v => `<option value="${this.escapeHtml(v)}"></option>`).join('');
        }

        if (pluginEl) pluginEl.value = `${plugin.name} (${plugin.type || 'Plugin'})`;
        if (valueEl) valueEl.value = String(plugin.manufacturer || 'Unknown');
        if (valueEl) setTimeout(() => valueEl.focus(), 50);

        const close = () => { m.style.display = 'none'; };
        if (cancelBtn) cancelBtn.onclick = () => close();

        const persist = async () => {
            if (!window.atlas?.pluginsSetManufacturer) {
                this.showError('Vendor override API not available in this build.');
                return;
            }
            const next = valueEl ? String(valueEl.value || '').trim() : '';
            const manufacturer = next || 'Unknown';

            this.setStatus('Saving vendor…');
            const res = await window.atlas.pluginsSetManufacturer(pid, manufacturer);
            if (!res || !res.success) {
                this.showError(res?.error || 'Failed to save vendor');
                return;
            }

            // Reload plugins (authoritative) so filters/counts refresh correctly
            const refreshed = await window.atlas.getPlugins();
            if (refreshed?.success) {
                this.allPlugins = refreshed.plugins || [];
                this.populatePluginVendorFilter();
                this.syncPluginFilterModeUI();
                this.applyPluginFilter();

                // If we're in vendor preset view, refresh the vendor scope
                if (this.pluginPresetView?.mode === 'vendor' && this.pluginPresetView.vendor) {
                    this.openPluginVendorPresetView(this.pluginPresetView.vendor);
                }
            }

            close();
            this.setStatus('Vendor saved ✅');
        };

        if (saveBtn) saveBtn.onclick = () => { persist(); };

        if (valueEl) {
            valueEl.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (saveBtn) saveBtn.click();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                }
            };
        }
    }

    showPatchCategoryModal(patchId) {
        const pid = String(patchId || '').trim();
        if (!pid) return;

        const ensureModal = () => {
            if (this._patchCategoryModal) return this._patchCategoryModal;
            const backdrop = document.createElement('div');
            backdrop.className = 'atlas-modal-backdrop';
            backdrop.style.display = 'none';
            backdrop.innerHTML = `
                <div class="atlas-modal" style="width:min(640px, 92vw);">
                    <h2>Set Category</h2>
                    <div class="atlas-help">
                        Assign a musical category (Lead/Bass/Pad/etc) or create a custom one. This updates the Library immediately.
                    </div>
                    <div class="atlas-form-row" style="margin-top:16px;">
                        <label>Patch</label>
                        <input id="patch-cat-name" disabled />
                    </div>
                    <div class="atlas-form-row">
                        <label>Choose a category</label>
                        <select id="patch-cat-select"></select>
                        <div class="atlas-help">Tip: choose “Auto-detect” to let ATLAS re-categorize based on the patch name/tags.</div>
                    </div>
                    <div class="atlas-form-row">
                        <label>Custom category (optional)</label>
                        <input id="patch-cat-custom" placeholder="e.g. 'Chords', 'Plucks', 'Cinematic Pads'"/>
                        <div class="atlas-help">If you type a custom category, it overrides the dropdown selection.</div>
                    </div>
                    <div class="atlas-modal-actions">
                        <button class="btn-primary" id="patch-cat-save">Save</button>
                        <button class="btn-action btn-action--danger" id="patch-cat-cancel">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) backdrop.style.display = 'none';
            });
            this._patchCategoryModal = backdrop;
            return backdrop;
        };

        const modal = ensureModal();
        modal.style.display = 'flex';

        const nameEl = modal.querySelector('#patch-cat-name');
        const selEl = modal.querySelector('#patch-cat-select');
        const customEl = modal.querySelector('#patch-cat-custom');
        const saveBtn = modal.querySelector('#patch-cat-save');
        const cancelBtn = modal.querySelector('#patch-cat-cancel');

        const close = () => { modal.style.display = 'none'; };
        if (cancelBtn) cancelBtn.onclick = () => close();

        const standardCategories = [
            'Lead', 'Bass', 'Pad', 'Keys', 'Drums', 'FX/Textures',
            'Brass', 'Strings', 'Woodwind', 'Vocals', 'Sequences', 'Ambient',
            'Imported', 'Plugin Preset'
        ];

        // Pull categories from the filter dropdown (already includes DB categories)
        const fromFilter = (() => {
            const cf = document.getElementById('category-filter');
            if (!cf) return [];
            return Array.from(cf.querySelectorAll('option'))
                .map(o => String(o.value || '').trim())
                .filter(v => v && v !== 'Uncategorized');
        })();

        const allCats = Array.from(new Set(['__auto__', ...standardCategories, ...fromFilter]))
            .filter(Boolean)
            .map(c => String(c))
            .sort((a, b) => {
                if (a === '__auto__') return -1;
                if (b === '__auto__') return 1;
                return a.localeCompare(b);
            });

        const populateSelect = (currentCategory) => {
            if (!selEl) return;
            selEl.innerHTML = allCats.map(c => {
                const label = c === '__auto__' ? 'Auto-detect' : c;
                const val = c === '__auto__' ? '__auto__' : c;
                return `<option value="${this.escapeHtml(val)}">${this.escapeHtml(label)}</option>`;
            }).join('');

            const cur = String(currentCategory || '').trim();
            if (!cur || cur === 'Uncategorized') selEl.value = '__auto__';
            else selEl.value = allCats.includes(cur) ? cur : '__auto__';
        };

        // Load patch details from DB so we persist safely
        (async () => {
            const res = await window.atlas.loadPatch(pid);
            if (!res || !res.success || !res.patch) {
                this.showError(res?.error || 'Failed to load patch');
                close();
                return;
            }
            const patch = res.patch;

            if (nameEl) nameEl.value = patch.name || '(unnamed)';
            if (customEl) customEl.value = '';
            populateSelect(patch.category);
            if (customEl) setTimeout(() => customEl.focus(), 50);

            const persist = async () => {
                const custom = customEl ? String(customEl.value || '').trim() : '';
                const sel = selEl ? String(selEl.value || '').trim() : '';
                const nextCategory = custom || (sel === '__auto__' ? 'Uncategorized' : sel);

                const toSave = { ...patch, category: nextCategory };
                const saveRes = await window.atlas.savePatch(toSave);
                if (!saveRes || !saveRes.success) {
                    this.showError(saveRes?.error || 'Failed to save category');
                    return;
                }

                close();
                this.setStatus('Category updated ✅');

                // Refresh category dropdowns and current view
                await this.loadCategories();
                await this.applyFilters();
            };

            if (saveBtn) saveBtn.onclick = () => { persist(); };
            if (customEl) {
                customEl.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (saveBtn) saveBtn.click();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                    }
                };
            }
            if (selEl) {
                selEl.onkeydown = (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                    }
                };
            }
        })();
    }

    showPluginPresetAuditionModal(patch) {
        const p = patch || {};
        const name = String(p.name || '').trim() || 'Preset';
        const pluginName = String(p.pluginName || p.device || '').trim() || 'Plugin';
        const pluginType = String(p.pluginType || '').trim() || 'Plugin';
        const filePath = String(p.pluginPath || '').trim();
        const manufacturer = String(p.manufacturer || '').trim() || 'Unknown';
        const ext = filePath ? (filePath.split('.').pop() || '').toLowerCase() : '';

        const isPack = ext === 'fzi' || ext === 'fxb';
        const headline = isPack ? 'Preset Pack' : 'Preset File';

        const instructions = (() => {
            if (!filePath) {
                return [
                    'This preset entry does not include a file path.',
                    'If the plugin stores presets internally, ATLAS cannot audition it directly yet.'
                ].join('\n');
            }
            if (ext === 'fzi') {
                return [
                    'Roland Cloud (.fzi) packs are loaded inside ZENOLOGY / ZENOLOGY FX.',
                    '',
                    'Suggested workflow:',
                    '- Open your DAW',
                    `- Insert ${pluginName}`,
                    '- In the plugin browser, use Import/Load (or Library) and select this .fzi file',
                    '- Audition patches from the plugin’s internal browser'
                ].join('\n');
            }
            if (ext === 'aupreset') {
                return [
                    'Audio Unit preset file (.aupreset).',
                    '',
                    'Suggested workflow (Logic Pro / AU hosts):',
                    `- Insert ${pluginName} (AU) on a track`,
                    '- Open the plugin preset menu (top of plugin window)',
                    '- Choose “Load/Import preset…” and select this file'
                ].join('\n');
            }
            if (ext === 'vstpreset') {
                return [
                    'VST3 preset file (.vstpreset).',
                    '',
                    'Suggested workflow (most DAWs):',
                    `- Insert ${pluginName} (VST3) on a track`,
                    '- Open the plugin preset browser',
                    '- Use Import/Load and select this file'
                ].join('\n');
            }
            if (ext === 'fxp' || ext === 'fxb') {
                return [
                    'Legacy VST preset/bank (.fxp/.fxb).',
                    '',
                    'Suggested workflow:',
                    `- Insert ${pluginName} on a track`,
                    '- Use the plugin’s preset/bank load feature (varies by plugin/DAW)',
                    '- Select this file'
                ].join('\n');
            }
            return [
                'Preset file detected.',
                '',
                'Suggested workflow:',
                `- Insert ${pluginName} on a track`,
                '- Use the plugin’s preset load/import feature',
                '- Select this file'
            ].join('\n');
        })();

        if (!this._pluginAuditionModal) {
            const backdrop = document.createElement('div');
            backdrop.className = 'atlas-modal-backdrop';
            backdrop.style.display = 'none';
            backdrop.innerHTML = `
                <div class="atlas-modal" style="width:min(720px, 92vw);">
                    <h2>Audition Plugin Preset</h2>
                    <div class="atlas-help" id="plugin-audition-subtitle"></div>
                    <div class="atlas-form-row" style="margin-top:16px;">
                        <label>Preset</label>
                        <input id="plugin-audition-preset" disabled />
                    </div>
                    <div class="atlas-form-row">
                        <label>Source</label>
                        <input id="plugin-audition-path" disabled />
                        <div class="atlas-help">ATLAS is local-first. Preset audition for plugins is DAW-driven (ATLAS doesn’t host plugins yet).</div>
                    </div>
                    <div class="atlas-form-row">
                        <label>How to audition</label>
                        <textarea id="plugin-audition-instructions" class="knowledge-textarea" style="min-height: 170px;" readonly></textarea>
                    </div>
                    <div class="atlas-modal-actions">
                        <button class="btn-primary" id="plugin-audition-reveal">Reveal</button>
                        <button class="btn-primary" id="plugin-audition-copy">Copy Path</button>
                        <button class="btn-action btn-action--danger" id="plugin-audition-close">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) backdrop.style.display = 'none';
            });
            this._pluginAuditionModal = backdrop;
        }

        const m = this._pluginAuditionModal;
        m.style.display = 'flex';
        const subtitleEl = m.querySelector('#plugin-audition-subtitle');
        const presetEl = m.querySelector('#plugin-audition-preset');
        const pathEl = m.querySelector('#plugin-audition-path');
        const instrEl = m.querySelector('#plugin-audition-instructions');
        const revealBtn = m.querySelector('#plugin-audition-reveal');
        const copyBtn = m.querySelector('#plugin-audition-copy');
        const closeBtn = m.querySelector('#plugin-audition-close');

        if (subtitleEl) subtitleEl.textContent = `${headline} • ${pluginName} • ${pluginType}${manufacturer ? ` • ${manufacturer}` : ''}`;
        if (presetEl) presetEl.value = name;
        if (pathEl) pathEl.value = filePath || '(no file path)';
        if (instrEl) instrEl.value = instructions;

        const close = () => { m.style.display = 'none'; };
        if (closeBtn) closeBtn.onclick = () => close();

        if (revealBtn) {
            revealBtn.disabled = !filePath;
            revealBtn.classList.toggle('is-disabled', !filePath);
            revealBtn.onclick = async () => {
                if (!filePath) return;
                if (window.atlas?.revealPath) await window.atlas.revealPath(filePath);
            };
        }

        if (copyBtn) {
            copyBtn.disabled = !filePath;
            copyBtn.classList.toggle('is-disabled', !filePath);
            copyBtn.onclick = async () => {
                if (!filePath) return;
                try {
                    await navigator.clipboard.writeText(filePath);
                    this.setStatus('Preset path copied ✅');
                } catch {
                    // fallback
                    const tmp = document.createElement('textarea');
                    tmp.value = filePath;
                    document.body.appendChild(tmp);
                    tmp.select();
                    try { document.execCommand('copy'); } catch { /* ignore */ }
                    document.body.removeChild(tmp);
                    this.setStatus('Preset path copied ✅');
                }
            };
        }
    }
    
    /**
     * Initialize UI
     */
    async initialize() {
        console.log('🎨 Initializing ATLAS UI...');
        
        // Initialize ATLAS core
        const initResult = await window.atlas.initialize();
        
        if (initResult.success) {
            console.log('✅ ATLAS initialized:', initResult);
            this.updateProtocolBadge(initResult.protocol, initResult.capabilities);
        } else {
            console.error('❌ ATLAS initialization failed:', initResult.error);
            this.showError('Failed to initialize ATLAS: ' + initResult.error);
        }
        
        // Get protocol info
        const protocolResult = await window.atlas.getProtocolInfo();
        if (protocolResult.success) {
            this.protocolInfo = protocolResult.info;
        }
        
        // Setup event listeners
        this.setupEventListeners();

        // MIDI activity indicator (proof-of-life)
        if (window.atlas && typeof window.atlas.onMidiActivity === 'function') {
            window.atlas.onMidiActivity((payload) => this.onMidiActivity(payload));
        }
        if (window.atlas && typeof window.atlas.onDeviceImportProgress === 'function') {
            window.atlas.onDeviceImportProgress((payload) => this.onDeviceImportProgress(payload));
        }
        
        // Load initial data
        await this.refreshStatistics();
        await this.loadCategories();
        await this.loadPatches();
        await this.loadPlugins();
        
        console.log('✅ ATLAS UI ready');
    }

    onMidiActivity(payload) {
        try {
            if (!payload) return;
            // Only show activity for the currently selected device (avoid noise)
            if (this.currentDevice && payload.deviceId && payload.deviceId !== this.currentDevice) return;

            const dot = document.getElementById('midi-activity-dot');
            if (!dot) return;

            const now = Date.now();
            const devId = payload.deviceId || this.currentDevice || '';
            if (devId) {
                this._midiLastSignalTsByDevice.set(devId, now);
                const wasVerified = this._midiVerifiedDevices.has(devId);
                this._midiVerifiedDevices.add(devId);
                if (!wasVerified) {
                    // First-time verification: offer "Load All" import prompt (one-time per device per session)
                    this.maybePromptDeviceImport(devId);
                    this.maybePromptDeviceImportHelp(devId);
                }
            }

            dot.classList.remove('is-off');
            dot.classList.add('is-armed');
            dot.classList.add('is-verified');
            dot.classList.add('is-pulse');
            dot.title = 'Verified • last signal: just now';

            // Also pulse the device card dot (sidebar)
            const cardDot = this.currentDevice ? document.getElementById(`midi-dot-${this.currentDevice}`) : null;
            if (cardDot) {
                cardDot.classList.remove('is-off');
                cardDot.classList.add('is-armed');
                cardDot.classList.add('is-verified');
                cardDot.classList.add('is-pulse');
                cardDot.title = 'Verified • last signal: just now';
            }

            if (this._midiPulseTimer) clearTimeout(this._midiPulseTimer);
            this._midiPulseTimer = setTimeout(() => {
                dot.classList.remove('is-pulse');
                dot.title = 'Verified • last signal: just now';
                if (cardDot) {
                    cardDot.classList.remove('is-pulse');
                    cardDot.title = 'Verified • last signal: just now';
                }
            }, 220);
        } catch {
            // ignore
        }
    }

    maybePromptDeviceImportHelp(deviceId) {
        try {
            const devId = String(deviceId || '');
            if (!devId || this._importHelpPromptedDevices.has(devId)) return;
            this._importHelpPromptedDevices.add(devId);

            const device = this.devices.find(d => d.id === devId) || null;
            const portName = device?.name || devId;
            const alias = this.getPortAliasLabel(portName);
            const manufacturer = device?.manufacturer && device.manufacturer !== 'Unknown' ? device.manufacturer : '';
            const display = alias ? `${alias}` : portName;

            if (!this._deviceHelpModal) {
                const backdrop = document.createElement('div');
                backdrop.className = 'atlas-modal-backdrop';
                backdrop.style.display = 'none';
                backdrop.innerHTML = `
                    <div class="atlas-modal" style="width:min(640px, 92vw);">
                        <h2>Import Help</h2>
                        <div class="atlas-help" id="device-help-sub"></div>
                        <div class="atlas-help" style="margin-top:12px;">
                            ATLAS can guide you using built-in playbooks + your imported manuals (local-first).
                        </div>
                        <div class="atlas-modal-actions" style="margin-top:18px;">
                            <button class="btn-primary" id="device-help-open">Open Import Help</button>
                            <button class="btn-primary" id="device-help-import-manual">Import Manual PDF</button>
                        </div>
                        <div class="atlas-modal-actions" style="margin-top:10px;">
                            <button class="btn-action btn-action--danger" id="device-help-close">Not now</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(backdrop);
                this._deviceHelpModal = backdrop;
                backdrop.addEventListener('click', (e) => {
                    if (e.target === backdrop) backdrop.style.display = 'none';
                });
            }

            const m = this._deviceHelpModal;
            m.style.display = 'flex';
            const sub = m.querySelector('#device-help-sub');
            if (sub) {
                const mfg = manufacturer ? `${manufacturer} • ` : '';
                sub.textContent = `Verified: ${mfg}${display}`;
            }

            const close = () => { m.style.display = 'none'; };
            const openBtn = m.querySelector('#device-help-open');
            const importBtn = m.querySelector('#device-help-import-manual');
            const closeBtn = m.querySelector('#device-help-close');

            if (closeBtn) closeBtn.onclick = () => close();
            if (openBtn) openBtn.onclick = async () => {
                close();
                const q = [alias, manufacturer, portName, 'import', 'dump', 'sysex', 'backup'].filter(Boolean).join(' ');
                await this.openKnowledgeSearch(q);
            };
            if (importBtn) importBtn.onclick = async () => {
                close();
                await this.importManualForActiveDevice();
            };
        } catch {
            // ignore
        }
    }

    async importManualForActiveDevice() {
        if (!window.atlas?.knowledgeImportFiles || !window.atlas?.knowledgeSaveDoc) {
            this.showError('Knowledge import is not available in this build.');
            return;
        }

        const info = this.getActiveDeviceInfo();
        const portName = this.getActiveDevicePortName();
        const alias = this.getPortAliasLabel(portName);
        const manufacturer = info?.manufacturer && info.manufacturer !== 'Unknown' ? info.manufacturer : null;

        const res = await window.atlas.knowledgeImportFiles();
        if (!res.success) {
            this.showError(res.error || 'Import failed');
            return;
        }
        const files = res.files || [];
        let imported = 0;
        for (const f of files) {
            if (f.error || !f.content) continue;
            const tags = [];
            if (manufacturer) tags.push(String(manufacturer).toLowerCase());
            if (alias) tags.push(String(alias).toLowerCase().replace(/\s+/g, '-'));
            tags.push('manual');
            tags.push('import');

            // eslint-disable-next-line no-await-in-loop
            const saveRes = await window.atlas.knowledgeSaveDoc({
                title: f.name,
                source: f.path,
                content: f.content,
                docType: 'manual',
                manufacturer: manufacturer || null,
                tags
            });
            if (saveRes.success) imported++;
        }
        await this.refreshKnowledgeList?.();
        this.setStatus(`Imported ${imported} manual file(s) ✅`);
    }

    maybePromptDeviceImport(deviceId) {
        try {
            if (!deviceId || this._importPromptedDevices.has(deviceId)) return;
            this._importPromptedDevices.add(deviceId);

            const device = this.devices.find(d => d.id === deviceId);
            const name = device?.name || deviceId;
            const manufacturer = device?.manufacturer || null;

            // JUNO-X: no front-panel bulk SysEx dump; use USB backup workflow.
            if (String(name).toUpperCase().includes('JUNO-X')) {
                this.showJunoXImportChoiceModal(deviceId, { deviceName: name, manufacturer });
                return;
            }

            const ok = confirm(`✅ Verified: ${name}\n\nLoad All?\n\nATLAS can import your device content by capturing a bulk dump (SysEx) from the device.\n\nClick OK to start capture, then trigger “Bulk Dump / Backup / Export” on the device.`);
            if (!ok) return;
            this.showDeviceImportModal(deviceId, name, { manufacturer });
        } catch {
            // ignore
        }
    }

    async importUsbBackupForDevice(deviceId, { deviceName, manufacturer } = {}) {
        const name = deviceName || deviceId;
        const res = await window.atlas.deviceImportUsbBackup(deviceId, { deviceName: name, manufacturer });
        if (!res.success) {
            this.showError(res.error || 'USB backup import failed');
            return;
        }
        if (res.canceled) return;
        this.setStatus(`USB backup imported for ${name} ✅`);
        // Show in Knowledge so user can find it immediately
        await this.refreshKnowledgeList?.();
    }

    showJunoXImportChoiceModal(deviceId, { deviceName, manufacturer } = {}) {
        if (!this._junoXImportModal) {
            const backdrop = document.createElement('div');
            backdrop.className = 'atlas-modal-backdrop';
            backdrop.style.display = 'none';
            backdrop.innerHTML = `
                <div class="atlas-modal">
                    <h2>Load All (JUNO-X)</h2>
                    <div class="atlas-help">
                        JUNO-X “dump everything” is done via <strong>USB Backup</strong> (not a front-panel SysEx bulk dump).
                    </div>
                    <div class="atlas-help" style="margin-top:10px;">
                        Menu path: <code>[MENU] → UTILITY → BACKUP</code>
                    </div>
                    <div class="atlas-modal-actions" style="margin-top:18px;">
                        <button class="btn-primary" id="jx-import-svd">Import backup.svd</button>
                        <button class="btn-primary" id="jx-import-folder">Import Backup Folder</button>
                    </div>
                    <div class="atlas-form-row" style="margin-top:16px;">
                        <label for="jx-svd-path">Or paste path to <code>.svd</code> (optional)</label>
                        <input id="jx-svd-path" placeholder="/Users/you/.../Backup/junox backup.svd" />
                        <div class="atlas-modal-actions" style="margin-top:10px;">
                            <button class="btn-primary" id="jx-import-svd-path">Import from path</button>
                        </div>
                    </div>
                    <div class="atlas-modal-actions" style="margin-top:10px;">
                        <button class="btn-action btn-action--danger" id="jx-import-cancel">Cancel</button>
                    </div>
                    <div class="atlas-help" style="margin-top:10px;">
                        ATLAS will store the backup and index any readable names into Knowledge for search/Copilot.
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            this._junoXImportModal = backdrop;
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) backdrop.style.display = 'none';
            });
        }

        const m = this._junoXImportModal;
        m.style.display = 'flex';
        const close = () => { m.style.display = 'none'; };

        const svdBtn = m.querySelector('#jx-import-svd');
        const folderBtn = m.querySelector('#jx-import-folder');
        const cancelBtn = m.querySelector('#jx-import-cancel');
        const svdPathBtn = m.querySelector('#jx-import-svd-path');
        const svdPathInput = m.querySelector('#jx-svd-path');

        if (svdBtn) svdBtn.onclick = async () => {
            close();
            await this.importJunoXSvd(deviceId, { deviceName, manufacturer });
        };
        if (folderBtn) folderBtn.onclick = async () => {
            close();
            await this.importUsbBackupForDevice(deviceId, { deviceName, manufacturer });
        };
        if (svdPathBtn) svdPathBtn.onclick = async () => {
            const sourceFile = svdPathInput ? String(svdPathInput.value || '').trim() : '';
            if (!sourceFile) {
                this.showError('Paste a full path to a .svd file first.');
                return;
            }
            close();
            await this.importJunoXSvd(deviceId, { deviceName, manufacturer, sourceFile });
        };
        if (cancelBtn) cancelBtn.onclick = () => close();
    }

    async importJunoXSvd(deviceId, { deviceName, manufacturer, sourceFile } = {}) {
        const name = deviceName || deviceId;
        if (!window.atlas.deviceImportJunoXSvd) {
            this.showError('JUNO-X SVD import is not available in this build.');
            return;
        }
        const res = await window.atlas.deviceImportJunoXSvd(deviceId, { deviceName: name, manufacturer: manufacturer || 'Roland', sourceFile: sourceFile || '' });
        if (!res.success) {
            this.showError(res.error || 'backup.svd import failed');
            return;
        }
        if (res.canceled) return;
        this.setStatus(`Imported backup.svd for ${name} ✅`);
        await this.refreshKnowledgeList?.();
    }

    async showDeviceImportModal(deviceId, deviceName, { manufacturer = null } = {}) {
        // Create modal lazily (reuse existing modal styles)
        if (!this._deviceImportModal) {
            const backdrop = document.createElement('div');
            backdrop.className = 'atlas-modal-backdrop';
            backdrop.style.display = 'none';
            backdrop.innerHTML = `
                <div class="atlas-modal">
                    <h2>Load All (Device Import)</h2>
                    <div class="atlas-help" id="device-import-sub"></div>
                    <div class="atlas-help" id="device-import-count" style="margin-top:10px;font-weight:800;"></div>
                    <div class="atlas-help" id="device-import-steps" style="margin-top:10px;"></div>
                    <div class="atlas-modal-actions" style="margin-top:14px;">
                        <button class="btn-primary" id="device-import-start">Start Capture</button>
                        <button class="btn-small" id="device-import-open-help">Open Import Help</button>
                    </div>
                    <div class="atlas-help" style="margin-top:10px;">
                        On your device, run: <strong>Bulk Dump / Backup / Export</strong> (SysEx). ATLAS will capture each bank/patch message and save it to your Library.
                    </div>
                    <div class="atlas-help" style="margin-top:10px;">
                        <strong>JUNO-X note:</strong> use <code>[MENU] → UTILITY → BACKUP</code> (USB stick). For JUNO-X, use the USB Backup import prompt instead of SysEx capture.
                    </div>
                    <div class="atlas-modal-actions">
                        <button class="btn-primary" id="device-import-stop">Stop</button>
                        <button class="btn-primary" id="device-import-save">Save to Library</button>
                    </div>
                    <div class="atlas-modal-actions" style="margin-top:10px;">
                        <button class="btn-action btn-action--danger" id="device-import-cancel">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            this._deviceImportModal = backdrop;

            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.hideDeviceImportModal();
            });
        }

        const sub = this._deviceImportModal.querySelector('#device-import-sub');
        const countEl = this._deviceImportModal.querySelector('#device-import-count');
        const stepsEl = this._deviceImportModal.querySelector('#device-import-steps');
        const mfg = String(manufacturer || '').trim();
        const upperName = String(deviceName || '').toUpperCase();
        const upperMfg = mfg.toUpperCase();
        const isKurzweil = upperMfg.includes('KURZWEIL') || upperName.includes('K2000') || upperName.includes('K2500') || upperName.includes('K2600');

        if (sub) sub.textContent = `Device: ${deviceName}${mfg ? ` • ${mfg}` : ''} • Status: Ready`;
        if (countEl) countEl.textContent = 'Captured: 0';
        if (stepsEl) {
            const common = [
                '1) Confirm cabling: device MIDI OUT → interface MIDI IN',
                '2) Confirm SysEx is enabled on the device (global/system settings)',
                '3) Click “Start Capture” in ATLAS',
                '4) On the device, run Bulk Dump / MIDI Dump / SysEx Dump',
                '5) Watch the counter increase, then click “Save to Library”'
            ];
            const kurz = [
                'Kurzweil note:',
                '- K2000 sends “object” data via SysEx (Programs/Setups/etc). In the manual, search for: “System Exclusive”, “Dump”, “MIDI Dump”, “Object Dump”.'
            ];
            stepsEl.innerHTML = `
                <div style="font-weight:900; margin-bottom:6px;">Guided steps</div>
                ${common.map(s => `<div>• ${this.escapeHtml(s)}</div>`).join('')}
                ${isKurzweil ? `<div style="margin-top:10px;">${kurz.map(s => `<div>${this.escapeHtml(s)}</div>`).join('')}</div>` : ''}
            `;
        }

        this._activeDeviceImport = { deviceId, deviceName, count: 0 };
        this._deviceImportModal.style.display = 'flex';

        const startBtn = this._deviceImportModal.querySelector('#device-import-start');
        const stopBtn = this._deviceImportModal.querySelector('#device-import-stop');
        const saveBtn = this._deviceImportModal.querySelector('#device-import-save');
        const cancelBtn = this._deviceImportModal.querySelector('#device-import-cancel');
        const openHelpBtn = this._deviceImportModal.querySelector('#device-import-open-help');

        // Disable stop/save until capture starts
        if (stopBtn) stopBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;

        if (openHelpBtn) openHelpBtn.onclick = async () => {
            const q = [deviceName, mfg, 'import', 'dump', 'sysex'].filter(Boolean).join(' ');
            await this.openKnowledgeSearch(q);
        };

        if (startBtn) startBtn.onclick = async () => {
            const startRes = await window.atlas.deviceImportStart(deviceId, { deviceName });
            if (!startRes.success) {
                this.showError(startRes.error || 'Failed to start device import');
                return;
            }
            if (sub) sub.textContent = `Device: ${deviceName}${mfg ? ` • ${mfg}` : ''} • Status: Capturing…`;
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            if (saveBtn) saveBtn.disabled = false;
        };

        if (stopBtn) stopBtn.onclick = async () => {
            await window.atlas.deviceImportStop(deviceId);
            if (sub) sub.textContent = `Device: ${deviceName} • Status: Stopped`;
        };
        if (saveBtn) saveBtn.onclick = async () => {
            const r = await window.atlas.deviceImportSave(deviceId, { deviceName });
            if (!r.success) {
                this.showError(r.error || 'Failed to save import');
                return;
            }
            this.setStatus(`Imported ${r.saved} patch(es) from ${deviceName} ✅`);
            await this.loadPatches({});
            await this.refreshStatistics();
            this.hideDeviceImportModal();
        };
        if (cancelBtn) cancelBtn.onclick = async () => {
            await window.atlas.deviceImportStop(deviceId);
            this.hideDeviceImportModal();
        };
    }

    hideDeviceImportModal() {
        if (this._deviceImportModal) this._deviceImportModal.style.display = 'none';
        this._activeDeviceImport = null;
    }

    onDeviceImportProgress(payload) {
        try {
            if (!payload || !this._activeDeviceImport) return;
            if (payload.deviceId !== this._activeDeviceImport.deviceId) return;

            if (payload.status === 'capturing') {
                this._activeDeviceImport.count = payload.count || 0;
            }

            const sub = this._deviceImportModal?.querySelector('#device-import-sub');
            const countEl = this._deviceImportModal?.querySelector('#device-import-count');
            if (countEl) countEl.textContent = `Captured: ${this._activeDeviceImport.count}`;
            if (sub) {
                const status = payload.status === 'capturing' ? `Capturing… (${payload.lastBytes || 0} bytes)` : payload.status;
                sub.textContent = `Device: ${this._activeDeviceImport.deviceName} • Status: ${status}`;
            }
        } catch {
            // ignore
        }
    }

    refreshMidiIndicatorTitles() {
        try {
            const devId = this.currentDevice;
            const dot = document.getElementById('midi-activity-dot');
            const cardDot = devId ? document.getElementById(`midi-dot-${devId}`) : null;

            const setTitle = (el, title) => { if (el) el.title = title; };
            const setState = (el, { off, armed, verified }) => {
                if (!el) return;
                el.classList.toggle('is-off', Boolean(off));
                el.classList.toggle('is-armed', Boolean(armed));
                el.classList.toggle('is-verified', Boolean(verified));
            };

            if (!devId) {
                setState(dot, { off: true, armed: false, verified: false });
                setTitle(dot, 'No device connected');
                if (cardDot) {
                    setState(cardDot, { off: true, armed: false, verified: false });
                    setTitle(cardDot, 'No device connected');
                }
                return;
            }

            const last = this._midiLastSignalTsByDevice.get(devId) || 0;
            const verified = this._midiVerifiedDevices.has(devId);

            if (!verified) {
                setState(dot, { off: false, armed: true, verified: false });
                setTitle(dot, 'Connected • verifying… (waiting for MIDI/identity reply)');
                if (cardDot) {
                    setState(cardDot, { off: false, armed: true, verified: false });
                    setTitle(cardDot, 'Connected • verifying… (waiting for MIDI/identity reply)');
                }
                return;
            }

            const secs = last ? Math.max(0, Math.floor((Date.now() - last) / 1000)) : 0;
            const title = last ? `Verified • last signal: ${secs}s ago` : 'Verified';
            setState(dot, { off: false, armed: true, verified: true });
            setTitle(dot, title);
            if (cardDot) {
                setState(cardDot, { off: false, armed: true, verified: true });
                setTitle(cardDot, title);
            }
        } catch {
            // ignore
        }
    }
    
    /**
     * Load categories and populate filter dropdowns
     */
    async loadCategories() {
        try {
            const categoriesResult = await window.atlas.getCategories();
            if (categoriesResult.success) {
                this.populateCategoryFilter(categoriesResult.categories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    /**
     * Populate category filter dropdown
     */
    populateCategoryFilter(categories) {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;
        
        // Clear existing options except "All Categories"
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        // Add standard patch categories
        const standardCategories = [
            'Lead', 'Bass', 'Pad', 'Keys', 'Drums', 'FX/Textures',
            'Brass', 'Strings', 'Woodwind', 'Vocals', 'Sequences', 'Ambient',
            'Imported', 'Plugin Preset', 'Uncategorized'
        ];
        
        // Combine standard categories with database categories
        const allCategories = [...new Set([...standardCategories, ...categories])].sort();
        
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tabs
        const tabLibrary = document.getElementById('tab-library');
        const tabDevice = document.getElementById('tab-device');
        const tabKnowledge = document.getElementById('tab-knowledge');
        const btnCopilotSettings = document.getElementById('btn-copilot-settings');
        if (tabLibrary && tabKnowledge) {
            tabLibrary.addEventListener('click', () => this.setTab('library'));
            tabKnowledge.addEventListener('click', () => this.setTab('knowledge'));
        }
        if (tabDevice) {
            tabDevice.addEventListener('click', () => this.setTab('device'));
        }
        if (btnCopilotSettings) {
            btnCopilotSettings.addEventListener('click', () => this.showCopilotSettings());
        }

        // Device discovery
        document.getElementById('discover-devices').addEventListener('click', () => {
            this.discoverDevices();
        });
        
        document.getElementById('refresh-devices').addEventListener('click', () => {
            this.discoverDevices();
        });

        // Device manufacturer filter
        const mfgFilter = document.getElementById('device-manufacturer-filter');
        if (mfgFilter) {
            mfgFilter.addEventListener('change', (e) => {
                this.deviceManufacturerFilter = String(e.target.value || '');
                // Reset model when manufacturer changes
                this.deviceModelFilter = '';
                this.populateDeviceModelFilter(this.devices);
                this.renderDeviceList();
            });
        }

        // Device model filter
        const modelFilter = document.getElementById('device-model-filter');
        if (modelFilter) {
            modelFilter.addEventListener('change', (e) => {
                this.deviceModelFilter = String(e.target.value || '');
                this.renderDeviceList();
            });
        }

        // Manual pairing controls
        const manualConnect = document.getElementById('manual-connect-btn');
        if (manualConnect) {
            manualConnect.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.connectManualPairing();
            });
        }
        const manualReset = document.getElementById('manual-reset-btn');
        if (manualReset) {
            manualReset.addEventListener('click', (e) => {
                e.preventDefault();
                const outEl = document.getElementById('manual-output-port');
                const inEl = document.getElementById('manual-input-port');
                if (outEl) outEl.value = '';
                if (inEl) inEl.value = '';
            });
        }
        
        // Plugin discovery
        document.getElementById('discover-plugins').addEventListener('click', () => {
            this.discoverPlugins();
        });
        
        document.getElementById('refresh-plugins').addEventListener('click', () => {
            this.discoverPlugins();
        });
        
        // Quick actions
        document.getElementById('btn-new-patch').addEventListener('click', () => {
            this.showNewPatchDialog();
        });
        
        document.getElementById('btn-import').addEventListener('click', () => {
            this.importPatches();
        });
        
        document.getElementById('btn-export').addEventListener('click', () => {
            this.exportPatches();
        });
        
        document.getElementById('btn-backup').addEventListener('click', () => {
            this.backupCurrentDevice();
        });

        // Clear library
        const clearBtn = document.getElementById('btn-clear-library');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLibrary());
        }
        
        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchPatches(e.target.value);
        });
        
        document.getElementById('search-btn').addEventListener('click', () => {
            const query = document.getElementById('search-input').value;
            this.searchPatches(query);
        });
        
        // Filters
        document.getElementById('category-filter').addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('device-filter').addEventListener('change', () => {
            this.applyFilters();
        });
        
        const pluginCategoryFilter = document.getElementById('plugin-category-filter');
        if (pluginCategoryFilter) {
            pluginCategoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Plugin filter tabs (types vs vendors)
        const tabTypes = document.getElementById('plugin-filter-tab-types');
        const tabVendors = document.getElementById('plugin-filter-tab-vendors');
        if (tabTypes && tabVendors) {
            tabTypes.addEventListener('click', () => this.setPluginFilterMode('types'));
            tabVendors.addEventListener('click', () => this.setPluginFilterMode('vendors'));
        }

        const vendorFilter = document.getElementById('plugin-vendor-filter');
        if (vendorFilter) {
            vendorFilter.addEventListener('change', () => {
                this.pluginVendorFilter = String(vendorFilter.value || '');
                this.syncPluginFilterModeUI();
                // Always refresh the plugin list when vendor changes
                this.applyPluginFilter();

                // Pro librarian behavior: selecting a vendor automatically switches Library to that vendor's presets (if extracted)
                if (this.pluginFilterMode === 'vendors') {
                    const v = String(this.pluginVendorFilter || '').trim();
                    if (v) {
                        this.openPluginVendorPresetView(v);
                        return;
                    }
                    // cleared vendor -> exit vendor preset view if active
                    if (this.pluginPresetView?.mode === 'vendor') {
                        this.clearPluginPresetView();
                        return;
                    }
                }

                this.applyFilters();
            });
        }

        const vendorPresetsBtn = document.getElementById('plugin-vendor-presets-btn');
        if (vendorPresetsBtn) {
            vendorPresetsBtn.addEventListener('click', () => {
                const v = String(this.pluginVendorFilter || '').trim();
                if (!v) return;
                this.openPluginVendorPresetView(v);
            });
        }

        // Plugin search (sidebar)
        const pluginSearch = document.getElementById('plugin-search');
        if (pluginSearch) {
            pluginSearch.addEventListener('input', (e) => {
                this.pluginSearchTerm = String(e.target.value || '').trim().toLowerCase();
                this.applyPluginFilter();
            });
        }

        // Extract selected plugin (action bar)
        const extractSelectedBtn = document.getElementById('extract-selected');
        if (extractSelectedBtn) {
            extractSelectedBtn.addEventListener('click', () => this.extractSelectedPlugin());
        }

        const viewSelectedPresetsBtn = document.getElementById('view-selected-presets');
        if (viewSelectedPresetsBtn) {
            viewSelectedPresetsBtn.addEventListener('click', () => {
                if (this.selectedPluginId) this.openPluginPresetView(this.selectedPluginId);
            });
        }

        const presetSearch = document.getElementById('plugin-presets-search');
        if (presetSearch) {
            presetSearch.addEventListener('input', (e) => {
                this.pluginPresetSearch = String(e.target.value || '').trim();
                if (this.pluginPresetView) this.refreshPluginPresetView();
            });
        }
        const presetClear = document.getElementById('plugin-presets-clear');
        if (presetClear) {
            presetClear.addEventListener('click', () => this.clearPluginPresetView());
        }

        // Collapse/expand plugin categories (sidebar)
        const togglePluginCats = document.getElementById('toggle-plugin-categories');
        if (togglePluginCats) {
            togglePluginCats.addEventListener('click', (e) => {
                e.preventDefault();
                // If any category is expanded, collapse all; otherwise expand all.
                const anyExpanded = ['instrument', 'fx', 'outboard', 'guitar', 'miditools', 'mastering', 'analyzer', 'saturation', 'synth', 'sampler', 'drum', 'unknown']
                    .some(k => !this.isPluginCategoryCollapsed(k));
                this.toggleAllPluginCategories(anyExpanded);
            });
        }
        
        document.getElementById('sort-by').addEventListener('change', () => {
            this.applyFilters();
        });
        
        // DAW integration buttons
        document.querySelectorAll('.btn-daw').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dawType = e.currentTarget.dataset.daw;
                this.connectToDAW(dawType);
            });
        });
        
        // Menu events
        window.atlas.onMenuDiscoverDevices(() => this.discoverDevices());
        window.atlas.onMenuNewPatch(() => this.showNewPatchDialog());
        window.atlas.onMenuImportPatches(() => this.importPatches());
        window.atlas.onMenuExportPatches(() => this.exportPatches());
        window.atlas.onMenuBackupDevice(() => this.backupCurrentDevice());
        window.atlas.onMenuConnectReaper(() => this.connectToDAW('reaper'));
        window.atlas.onMenuConnectAbleton(() => this.connectToDAW('ableton'));
        window.atlas.onMenuConnectLogic(() => this.connectToDAW('logic'));
        window.atlas.onMenuDisconnectDAW(() => this.disconnectFromDAW());

        // Copilot drawer (Library)
        const drawerClose = document.getElementById('copilot-drawer-close');
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeCopilotDrawer());
    }

    // =========================
    // Copilot Config (Local-first)
    // =========================

    getDefaultCopilotConfig() {
        return {
            provider: 'local', // local-first
            apiKey: '',
            model: 'local-rules',
            baseUrl: '',
            temperature: 0.3,
            enableMemory: true,
            enableTools: false,
            searchProvider: '', // '' | 'serper' | 'searxng'
            searchApiKey: '',
            searchBaseUrl: '',
            onlineMode: 'ask' // 'off' | 'ask' | 'auto'
            ,
            pluginVendorEnrichment: 'off', // 'off' | 'ask' | 'auto'
            pluginVendorEnrichmentLimit: 20
        };
    }

    // =========================
    // Copilot Preference Memory (Local-first)
    // =========================

    getCopilotPrefs() {
        try {
            const raw = localStorage.getItem('atlas.copilotPrefs');
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed && typeof parsed === 'object' ? parsed : {
                categories: {},
                tags: {},
                devices: {},
                plugins: {}
            };
        } catch {
            return { categories: {}, tags: {}, devices: {}, plugins: {} };
        }
    }

    saveCopilotPrefs(prefs) {
        try {
            localStorage.setItem('atlas.copilotPrefs', JSON.stringify(prefs || {}));
        } catch {
            // ignore
        }
    }

    recordCopilotPreference(patch, direction = 'more') {
        if (!patch) return;
        const prefs = this.getCopilotPrefs();
        const bump = direction === 'less' ? -1 : 1;

        const inc = (map, key, amt) => {
            if (!key) return;
            const k = String(key);
            map[k] = (map[k] || 0) + amt;
            // prune near-zero to keep it tidy
            if (Math.abs(map[k]) < 0.5) delete map[k];
        };

        inc(prefs.categories, patch.category, 2 * bump);
        inc(prefs.devices, patch.patchType === 'plugin' ? (patch.pluginName || patch.device) : patch.device, 1 * bump);
        if (patch.patchType === 'plugin' && patch.pluginName) inc(prefs.plugins, patch.pluginName, 2 * bump);
        (Array.isArray(patch.tags) ? patch.tags : []).slice(0, 8).forEach(t => inc(prefs.tags, t, 1 * bump));

        this.saveCopilotPrefs(prefs);
    }

    buildCopilotPreferenceContext() {
        const prefs = this.getCopilotPrefs();
        const topN = (obj, n = 6) =>
            Object.entries(obj || {})
                .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                .slice(0, n)
                .map(([k]) => k);

        return {
            categories: topN(prefs.categories, 5),
            tags: topN(prefs.tags, 8),
            devices: topN(prefs.devices, 4),
            plugins: topN(prefs.plugins, 4)
        };
    }

    loadCopilotConfig() {
        try {
            const raw = localStorage.getItem(this.copilotConfigKey);
            if (!raw) return this.getDefaultCopilotConfig();
            const parsed = JSON.parse(raw);
            return { ...this.getDefaultCopilotConfig(), ...parsed };
        } catch (e) {
            return this.getDefaultCopilotConfig();
        }
    }

    saveCopilotConfig(next) {
        this.copilotConfig = { ...this.getDefaultCopilotConfig(), ...next };
        localStorage.setItem(this.copilotConfigKey, JSON.stringify(this.copilotConfig));
    }

    ensureCopilotModal() {
        if (this._copilotModal) return;

        const backdrop = document.createElement('div');
        backdrop.className = 'atlas-modal-backdrop';
        backdrop.id = 'copilot-config-modal';
        backdrop.innerHTML = `
            <div class="atlas-modal" role="dialog" aria-modal="true" aria-label="ATLAS Copilot Configuration">
                <h2>🤖 ATLAS Copilot Configuration</h2>

                <div class="atlas-form-row">
                    <label>Provider</label>
                    <select id="atlas-ai-provider">
                        <option value="local">Local (Recommended)</option>
                        <option value="openai">OpenAI (Optional)</option>
                        <option value="local_llm">Local LLM (Ollama / LM Studio)</option>
                    </select>
                    <div class="atlas-help">Local-first uses your Knowledge + built-in heuristics (no internet).</div>
                </div>

                <div class="atlas-form-row">
                    <label>API Key</label>
                    <input type="password" id="atlas-ai-api-key" placeholder="For local-first, leave empty">
                    <div class="atlas-help">Stored locally on this machine.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Model</label>
                    <select id="atlas-ai-model">
                        <option value="local-rules">Local Rules (Fast)</option>
                        <option value="local-knowledge">Local Knowledge (Retrieve + Summarize)</option>
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="custom">Custom (type below)</option>
                    </select>
                    <input type="text" id="atlas-ai-model-custom" placeholder="Custom model name…" style="margin-top:8px; display:none;">
                    <div class="atlas-help">Cloud models are optional; local-first remains the default.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Base URL (Optional)</label>
                    <input type="text" id="atlas-ai-base-url" placeholder="http://localhost:11434/v1 (for Ollama/LM Studio)">
                    <div class="atlas-help">Only needed for Local LLM providers.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Temperature: <span id="atlas-ai-temp-value">0.3</span></label>
                    <input type="range" id="atlas-ai-temperature" min="0" max="1" step="0.1" value="0.3">
                    <div class="atlas-help">Lower = more focused, Higher = more creative.</div>
                </div>

                <div class="atlas-form-row">
                    <label class="atlas-checkbox">
                        <input type="checkbox" id="atlas-ai-enable-memory" checked>
                        Enable Conversation Memory
                    </label>
                    <div class="atlas-help">Local memory for Copilot preferences (coming next).</div>
                </div>

                <div class="atlas-form-row">
                    <label class="atlas-checkbox">
                        <input type="checkbox" id="atlas-ai-enable-tools">
                        Enable Tool Calling
                    </label>
                    <div class="atlas-help">Enables optional web search + future DAW actions. Safe default is off.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Online Mode</label>
                    <select id="atlas-ai-online-mode">
                        <option value="off">Off (never)</option>
                        <option value="ask">Ask to go online (recommended)</option>
                        <option value="auto">Auto (use online when configured)</option>
                    </select>
                    <div class="atlas-help">Ask mode runs local-first and only goes online after you approve.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Web Search Provider (Optional)</label>
                    <select id="atlas-search-provider">
                        <option value="">Off</option>
                        <option value="serper">Google (via Serper API)</option>
                        <option value="searxng">SearXNG (self-hosted)</option>
                    </select>
                    <div class="atlas-help">Only used when Tool Calling is enabled.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Web Search API Key (Optional)</label>
                    <input type="password" id="atlas-search-api-key" placeholder="Serper API key (if using Serper)">
                    <div class="atlas-help">Stored locally on this machine.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Web Search Base URL (Optional)</label>
                    <input type="text" id="atlas-search-base-url" placeholder="https://your-searxng-instance (if using SearXNG)">
                    <div class="atlas-help">Only needed for SearXNG.</div>
                </div>

                <div class="atlas-form-row">
                    <label>Plugin Vendor Enrichment</label>
                    <select id="atlas-plugin-vendor-enrich">
                        <option value="off">Off</option>
                        <option value="ask">Ask on launch</option>
                        <option value="auto">Auto on launch</option>
                    </select>
                    <div class="atlas-help">Uses your Web Search provider to identify “Unknown” plugin manufacturers (cached locally).</div>
                </div>

                <div class="atlas-form-row">
                    <label>Vendor enrichment max per launch</label>
                    <input type="number" id="atlas-plugin-vendor-enrich-limit" min="1" max="50" step="1" value="20">
                    <div class="atlas-help">Keeps API usage controlled. ATLAS caches results so Unknown shrinks over time.</div>
                </div>

                <div class="atlas-modal-actions">
                    <button class="btn-primary" id="atlas-ai-save">Save</button>
                    <button class="btn-action" id="atlas-ai-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        this._copilotModal = backdrop;

        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) this.hideCopilotSettings();
        });

        // Wiring
        backdrop.querySelector('#atlas-ai-close').addEventListener('click', () => this.hideCopilotSettings());
        backdrop.querySelector('#atlas-ai-save').addEventListener('click', () => this.onSaveCopilotSettings());
        backdrop.querySelector('#atlas-ai-temperature').addEventListener('input', (e) => {
            backdrop.querySelector('#atlas-ai-temp-value').textContent = e.target.value;
        });
        backdrop.querySelector('#atlas-ai-model').addEventListener('change', (e) => {
            const custom = backdrop.querySelector('#atlas-ai-model-custom');
            custom.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
    }

    showCopilotSettings() {
        this.ensureCopilotModal();
        const cfg = this.copilotConfig || this.getDefaultCopilotConfig();
        const m = this._copilotModal;

        m.querySelector('#atlas-ai-provider').value = cfg.provider;
        m.querySelector('#atlas-ai-api-key').value = cfg.apiKey || '';
        m.querySelector('#atlas-ai-model').value = cfg.model === 'custom' ? 'custom' : cfg.model;
        m.querySelector('#atlas-ai-model-custom').style.display = (cfg.model && cfg.model !== 'local-rules' && cfg.model !== 'local-knowledge' && !cfg.model.startsWith('gpt-')) ? 'block' : 'none';
        m.querySelector('#atlas-ai-model-custom').value = m.querySelector('#atlas-ai-model-custom').style.display === 'block' ? cfg.model : '';
        m.querySelector('#atlas-ai-base-url').value = cfg.baseUrl || '';
        m.querySelector('#atlas-ai-temperature').value = String(cfg.temperature ?? 0.3);
        m.querySelector('#atlas-ai-temp-value').textContent = String(cfg.temperature ?? 0.3);
        m.querySelector('#atlas-ai-enable-memory').checked = Boolean(cfg.enableMemory);
        m.querySelector('#atlas-ai-enable-tools').checked = Boolean(cfg.enableTools);
        m.querySelector('#atlas-search-provider').value = cfg.searchProvider || '';
        m.querySelector('#atlas-search-api-key').value = cfg.searchApiKey || '';
        m.querySelector('#atlas-search-base-url').value = cfg.searchBaseUrl || '';
        m.querySelector('#atlas-ai-online-mode').value = cfg.onlineMode || 'ask';
        m.querySelector('#atlas-plugin-vendor-enrich').value = cfg.pluginVendorEnrichment || 'off';
        m.querySelector('#atlas-plugin-vendor-enrich-limit').value = String(cfg.pluginVendorEnrichmentLimit || 20);

        m.style.display = 'flex';
    }

    hideCopilotSettings() {
        if (this._copilotModal) this._copilotModal.style.display = 'none';
    }

    onSaveCopilotSettings() {
        const m = this._copilotModal;
        const provider = m.querySelector('#atlas-ai-provider').value;
        const apiKey = m.querySelector('#atlas-ai-api-key').value || '';
        const modelSel = m.querySelector('#atlas-ai-model').value;
        const model = modelSel === 'custom' ? (m.querySelector('#atlas-ai-model-custom').value || 'custom') : modelSel;
        const baseUrl = m.querySelector('#atlas-ai-base-url').value || '';
        const temperature = Number(m.querySelector('#atlas-ai-temperature').value);
        const enableMemory = Boolean(m.querySelector('#atlas-ai-enable-memory').checked);
        const enableTools = Boolean(m.querySelector('#atlas-ai-enable-tools').checked);
        const onlineMode = m.querySelector('#atlas-ai-online-mode').value || 'ask';
        const searchProvider = m.querySelector('#atlas-search-provider').value || '';
        const searchApiKey = m.querySelector('#atlas-search-api-key').value || '';
        const searchBaseUrl = m.querySelector('#atlas-search-base-url').value || '';
        const pluginVendorEnrichment = m.querySelector('#atlas-plugin-vendor-enrich').value || 'off';
        const pluginVendorEnrichmentLimit = Math.max(1, Math.min(50, Number(m.querySelector('#atlas-plugin-vendor-enrich-limit').value) || 20));

        this.saveCopilotConfig({ provider, apiKey, model, baseUrl, temperature, enableMemory, enableTools, onlineMode, searchProvider, searchApiKey, searchBaseUrl, pluginVendorEnrichment, pluginVendorEnrichmentLimit });
        this.setStatus('Copilot settings saved ✅');
        this.hideCopilotSettings();
    }

    shouldOfferOnline(cfg) {
        // Offer online if user configured an online provider or web tool.
        const provider = String(cfg.provider || 'local');
        const wantsLLM = provider === 'openai' || provider === 'local_llm';
        const wantsWeb = Boolean(cfg.enableTools) && Boolean(cfg.searchProvider);
        return wantsLLM || wantsWeb;
    }

    async confirmGoOnline({ provider, searchProvider } = {}) {
        const p = String(provider || '');
        const s = String(searchProvider || '');
        const parts = [];
        if (p === 'openai') parts.push('OpenAI');
        if (p === 'local_llm') parts.push('Local LLM endpoint');
        if (s) parts.push(`Web search (${s})`);
        const target = parts.length ? parts.join(' + ') : 'online tools';

        if (!this._goOnlineModal) {
            const backdrop = document.createElement('div');
            backdrop.className = 'atlas-modal-backdrop';
            backdrop.style.display = 'none';
            backdrop.innerHTML = `
                <div class="atlas-modal" style="width:min(640px, 92vw);">
                    <h2>Go Online?</h2>
                    <div class="atlas-help" id="go-online-sub"></div>
                    <div class="atlas-help" style="margin-top:12px;">
                        This will send your question and short local excerpts (Knowledge + patch names) to the configured provider(s).
                    </div>
                    <div class="atlas-modal-actions" style="margin-top:18px;">
                        <button class="btn-primary" id="go-online-yes">Go Online</button>
                        <button class="btn-action btn-action--danger" id="go-online-no">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            this._goOnlineModal = backdrop;
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) backdrop.style.display = 'none';
            });
        }

        const m = this._goOnlineModal;
        const sub = m.querySelector('#go-online-sub');
        if (sub) sub.textContent = `Use: ${target}`;
        m.style.display = 'flex';

        return await new Promise(resolve => {
            const close = (v) => { m.style.display = 'none'; resolve(v); };
            const yes = m.querySelector('#go-online-yes');
            const no = m.querySelector('#go-online-no');
            if (yes) yes.onclick = () => close(true);
            if (no) no.onclick = () => close(false);
        });
    }

    setTab(tab) {
        this.activeTab = tab;
        const tabLibrary = document.getElementById('tab-library');
        const tabDevice = document.getElementById('tab-device');
        const tabKnowledge = document.getElementById('tab-knowledge');
        const libraryView = document.getElementById('library-view');
        const deviceView = document.getElementById('device-view');
        const knowledgeView = document.getElementById('knowledge-view');
        const toolbarSearch = document.querySelector('.search-bar');
        const filters = document.querySelector('.filters');

        if (tabLibrary && tabKnowledge) {
            tabLibrary.classList.toggle('is-active', tab === 'library');
            tabKnowledge.classList.toggle('is-active', tab === 'knowledge');
        }
        if (tabDevice) tabDevice.classList.toggle('is-active', tab === 'device');

        if (libraryView) libraryView.style.display = tab === 'library' ? '' : 'none';
        if (deviceView) deviceView.style.display = tab === 'device' ? '' : 'none';
        if (knowledgeView) knowledgeView.style.display = tab === 'knowledge' ? '' : 'none';
        if (toolbarSearch) toolbarSearch.style.display = tab === 'library' ? '' : 'none';
        if (filters) filters.style.display = tab === 'library' ? '' : 'none';

        if (tab === 'knowledge') {
            this.closeCopilotDrawer();
            this.initializeKnowledgeUI();
        }
        if (tab === 'device') {
            this.closeCopilotDrawer();
            this.refreshDeviceLibrarian();
        }
    }

    async openKnowledgeSearch(query) {
        this.setTab('knowledge');
        this.initializeKnowledgeUI();
        const input = document.getElementById('knowledge-search');
        if (input) input.value = String(query || '');
        await this.searchKnowledge();
    }

    async openKnowledgeSearch(query) {
        this.setTab('knowledge');
        this.initializeKnowledgeUI();
        const input = document.getElementById('knowledge-search');
        if (input) input.value = String(query || '');
        await this.searchKnowledge();
    }

    initializeKnowledgeUI() {
        // Wire once
        if (this._knowledgeInitialized) return;
        this._knowledgeInitialized = true;

        const importBtn = document.getElementById('btn-knowledge-import');
        const saveBtn = document.getElementById('btn-knowledge-save');
        const clearBtn = document.getElementById('btn-knowledge-clear');
        const searchBtn = document.getElementById('knowledge-search-btn');
        const searchInput = document.getElementById('knowledge-search');
        const askBtn = document.getElementById('btn-copilot-ask');

        if (importBtn) importBtn.addEventListener('click', () => this.importKnowledgeFiles());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveKnowledgeFromForm());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearKnowledge());
        if (searchBtn) searchBtn.addEventListener('click', () => this.searchKnowledge());
        if (searchInput) searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.searchKnowledge();
        });
        if (askBtn) askBtn.addEventListener('click', () => this.askCopilot());

        this.refreshKnowledgeList();
    }

    async refreshKnowledgeList() {
        const listEl = document.getElementById('knowledge-list');
        if (!listEl) return;
        const res = await window.atlas.knowledgeListDocs(200);
        if (!res.success) {
            listEl.innerHTML = `<div class="empty-state"><p>Failed to load knowledge: ${this.escapeHtml(res.error || '')}</p></div>`;
            return;
        }
        const docs = res.docs || [];
        if (docs.length === 0) {
            listEl.innerHTML = `<div class="empty-state"><p>No knowledge added yet.</p></div>`;
            return;
        }

        listEl.innerHTML = '';
        docs.forEach(d => {
            const row = document.createElement('div');
            row.className = 'knowledge-item';
            row.innerHTML = `
                <div class="knowledge-item-title">${this.escapeHtml(d.title)}</div>
                <div class="knowledge-item-meta">${this.escapeHtml(d.source || '')}</div>
                <button class="btn-small btn-knowledge-delete" title="Delete">Delete</button>
            `;
            row.querySelector('.btn-knowledge-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                const ok = confirm(`Delete knowledge doc "${d.title}"?`);
                if (!ok) return;
                await window.atlas.knowledgeDeleteDoc(d.id);
                await this.refreshKnowledgeList();
            });
            listEl.appendChild(row);
        });
    }

    async importKnowledgeFiles() {
        const res = await window.atlas.knowledgeImportFiles();
        if (!res.success) {
            this.showError(res.error || 'Import failed');
            return;
        }
        const files = res.files || [];
        let imported = 0;
        for (const f of files) {
            if (f.error || !f.content) continue;
            const saveRes = await window.atlas.knowledgeSaveDoc({
                title: f.name,
                source: f.path,
                content: f.content,
                docType: 'file'
            });
            if (saveRes.success) imported++;
        }
        await this.refreshKnowledgeList();
        this.setStatus(`Imported ${imported} knowledge file(s) ✅`);
    }

    async saveKnowledgeFromForm() {
        const title = document.getElementById('knowledge-title')?.value || '';
        const source = document.getElementById('knowledge-source')?.value || '';
        const content = document.getElementById('knowledge-content')?.value || '';

        const res = await window.atlas.knowledgeSaveDoc({
            title: title.trim() || 'Untitled',
            source: source.trim() || null,
            content,
            docType: 'note'
        });

        if (!res.success) {
            this.showError(res.error || 'Save failed');
            return;
        }

        document.getElementById('knowledge-content').value = '';
        await this.refreshKnowledgeList();
        this.setStatus('Knowledge saved ✅');
    }

    async searchKnowledge() {
        const q = document.getElementById('knowledge-search')?.value || '';
        const resultsEl = document.getElementById('knowledge-results');
        if (!resultsEl) return;

        const res = await window.atlas.knowledgeSearch(q, 8);
        if (!res.success) {
            resultsEl.innerHTML = `<div class="empty-state"><p>${this.escapeHtml(res.error || 'Search failed')}</p></div>`;
            return;
        }

        const results = res.results || [];
        if (results.length === 0) {
            resultsEl.innerHTML = `<div class="empty-state"><p>No matches.</p></div>`;
            return;
        }

        resultsEl.innerHTML = results.map(r => `
            <div class="knowledge-result">
                <div class="knowledge-result-title">${this.escapeHtml(r.title)}</div>
                <div class="knowledge-result-excerpt">${this.escapeHtml(r.excerpt || '')}</div>
            </div>
        `).join('');
    }

    async askCopilot() {
        const question = document.getElementById('copilot-question')?.value || '';
        const genre = document.getElementById('copilot-genre')?.value || '';
        const out = document.getElementById('copilot-answer');
        if (!out) return;

        const preference = this.buildCopilotPreferenceContext();

        out.innerHTML = '';
        const cfg = this.copilotConfig || this.getDefaultCopilotConfig();
        const onlineMode = String(cfg.onlineMode || 'ask');
        const offerOnline = this.shouldOfferOnline(cfg);
        const hasLLM = (String(cfg.provider || '') === 'openai' || String(cfg.provider || '') === 'local_llm');
        const hasWeb = Boolean(cfg.enableTools) && Boolean(cfg.searchProvider);

        const localContext = {
            genre: genre.trim() || null,
            preference,
            provider: 'local',
            model: 'local-rules',
            temperature: cfg.temperature,
            apiKey: '',
            baseUrl: '',
            enableTools: false,
            searchProvider: '',
            searchApiKey: '',
            searchBaseUrl: ''
        };

        const onlineContext = {
            genre: genre.trim() || null,
            preference,
            provider: cfg.provider,
            model: cfg.model,
            temperature: cfg.temperature,
            apiKey: cfg.apiKey,
            baseUrl: cfg.baseUrl,
            enableTools: cfg.enableTools,
            searchProvider: cfg.searchProvider,
            searchApiKey: cfg.searchApiKey,
            searchBaseUrl: cfg.searchBaseUrl
        };

        // Split online contexts
        const onlineContextLLM = {
            ...onlineContext,
            enableTools: false,
            searchProvider: '',
            searchApiKey: '',
            searchBaseUrl: ''
        };

        const onlineContextWeb = {
            ...onlineContext,
            provider: 'local',
            model: 'local-rules',
            apiKey: '',
            baseUrl: ''
        };

        const firstContext = (onlineMode === 'auto') ? onlineContext : localContext;
        const res = await window.atlas.copilotAsk(question, firstContext);
        if (!res.success) {
            out.innerHTML = `<div class="empty-state"><p>${this.escapeHtml(res.error || 'Failed')}</p></div>`;
            return;
        }

        const tips = res.tips || [];
        const passages = res.passages || [];
        const web = res.web || [];
        const recos = res.recommendations?.patches || [];
        const detected = res.detected || {};

        out.innerHTML = `
            ${res.answer ? `<div class="copilot-section"><div class="copilot-title">Copilot Answer</div><div class="copilot-tip">${this.escapeHtml(res.answer)}</div></div>` : ''}
            ${(onlineMode === 'ask' && offerOnline) ? `
                <div class="copilot-section">
                    <div class="copilot-title">Advanced Intelligence</div>
                    <div class="copilot-subtitle">Local-first is on. You can optionally go online for a stronger answer.</div>
                    <div class="atlas-modal-actions" style="margin-top:10px;">
                        ${hasLLM ? `<button class="btn-primary" id="btn-copilot-go-online-llm">Go Online (LLM)</button>` : ''}
                        ${hasWeb ? `<button class="btn-primary" id="btn-copilot-go-online-web">Web Search</button>` : ''}
                    </div>
                </div>
            ` : ''}
            ${recos.length ? `
                <div class="copilot-section">
                    <div class="copilot-title">Top matches in your Library</div>
                    <div class="copilot-subtitle">
                        ${detected.category ? `Detected: <span class="copilot-chip">${this.escapeHtml(detected.category)}</span>` : ''}
                        ${detected.genre ? `<span class="copilot-chip">${this.escapeHtml(detected.genre)}</span>` : ''}
                        ${detected.mood ? `<span class="copilot-chip">${this.escapeHtml(detected.mood)}</span>` : ''}
                    </div>
                    <div class="copilot-recos">
                        ${recos.map(p => `
                            <div class="copilot-reco">
                                <div class="copilot-reco-main">
                                    <div class="copilot-reco-name">${this.escapeHtml(p.name)}</div>
                                    <div class="copilot-reco-meta">
                                        <span class="copilot-chip">${this.escapeHtml(p.category || 'Uncategorized')}</span>
                                        <span class="copilot-reco-dot">•</span>
                                        <span class="copilot-reco-source">${this.escapeHtml(p.patchType === 'plugin' ? (p.pluginName || p.device) : p.device)}</span>
                                        ${p.patchType === 'plugin' ? `<span class="copilot-chip copilot-chip--muted">${this.escapeHtml(p.pluginType || 'Plugin')}</span>` : `<span class="copilot-chip copilot-chip--muted">Hardware</span>`}
                                    </div>
                                    ${Array.isArray(p.why) && p.why.length ? `<div class="copilot-reco-why">Matched: ${this.escapeHtml(p.why.join(', '))}</div>` : ''}
                                </div>
                                <div class="copilot-reco-actions">
                                    <button class="btn-small btn-copilot-show" data-patch-name="${this.escapeHtml(p.name)}" title="Show in Library">Show</button>
                                    <button class="btn-small btn-copilot-similar" data-patch-id="${this.escapeHtml(p.id)}" title="Find similar">Similar</button>
                                    <button class="btn-small btn-copilot-more" data-patch='${this.escapeHtml(JSON.stringify(p))}' title="Tune Atlas toward this vibe">More</button>
                                    ${p.patchType !== 'plugin' ? `<button class="btn-small btn-copilot-audition ${this.currentDevice ? '' : 'is-disabled'}" data-patch-id="${this.escapeHtml(p.id)}" ${this.currentDevice ? '' : 'disabled'} title="${this.currentDevice ? 'Audition' : 'Connect a device to audition'}">▶︎</button>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${tips.length ? `<div class="copilot-section"><div class="copilot-title">Suggestions</div>${tips.map(t => `<div class="copilot-tip">• ${this.escapeHtml(t)}</div>`).join('')}</div>` : ''}
            ${passages.length ? `<div class="copilot-section"><div class="copilot-title">From your Knowledge</div>${passages.map(p => `<div class="copilot-passage"><div class="copilot-passage-title">${this.escapeHtml(p.title)}</div><div class="copilot-passage-excerpt">${this.escapeHtml(p.excerpt || '')}</div></div>`).join('')}</div>` : `<div class="empty-state"><p>No matching knowledge passages yet. Import a manual or paste notes first.</p></div>`}
            ${web.length ? `<div class="copilot-section"><div class="copilot-title">Web (Tool)</div>${web.map(r => `<div class="copilot-passage"><div class="copilot-passage-title">${this.escapeHtml(r.title || '')}</div><div class="copilot-passage-excerpt">${this.escapeHtml(r.snippet || '')}</div></div>`).join('')}</div>` : ''}
        `;

        const renderSimple = (res2) => {
            const tips2 = res2.tips || [];
            const passages2 = res2.passages || [];
            const web2 = res2.web || [];
            const recos2 = res2.recommendations?.patches || [];
            const detected2 = res2.detected || {};
            out.innerHTML = `
                ${res2.answer ? `<div class="copilot-section"><div class="copilot-title">Copilot Answer</div><div class="copilot-tip">${this.escapeHtml(res2.answer)}</div></div>` : ''}
                ${recos2.length ? `
                    <div class="copilot-section">
                        <div class="copilot-title">Top matches in your Library</div>
                        <div class="copilot-subtitle">
                            ${detected2.category ? `Detected: <span class="copilot-chip">${this.escapeHtml(detected2.category)}</span>` : ''}
                            ${detected2.genre ? `<span class="copilot-chip">${this.escapeHtml(detected2.genre)}</span>` : ''}
                            ${detected2.mood ? `<span class="copilot-chip">${this.escapeHtml(detected2.mood)}</span>` : ''}
                        </div>
                        <div class="copilot-recos">
                            ${recos2.map(p => `
                                <div class="copilot-reco">
                                    <div class="copilot-reco-main">
                                        <div class="copilot-reco-name">${this.escapeHtml(p.name)}</div>
                                        <div class="copilot-reco-meta">
                                            <span class="copilot-chip">${this.escapeHtml(p.category || 'Uncategorized')}</span>
                                            <span class="copilot-reco-dot">•</span>
                                            <span class="copilot-reco-source">${this.escapeHtml(p.patchType === 'plugin' ? (p.pluginName || p.device) : p.device)}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${tips2.length ? `<div class="copilot-section"><div class="copilot-title">Suggestions</div>${tips2.map(t => `<div class="copilot-tip">• ${this.escapeHtml(t)}</div>`).join('')}</div>` : ''}
                ${passages2.length ? `<div class="copilot-section"><div class="copilot-title">From your Knowledge</div>${passages2.map(p => `<div class="copilot-passage"><div class="copilot-passage-title">${this.escapeHtml(p.title)}</div><div class="copilot-passage-excerpt">${this.escapeHtml(p.excerpt || '')}</div></div>`).join('')}</div>` : ''}
                ${web2.length ? `<div class="copilot-section"><div class="copilot-title">Web (Tool)</div>${web2.map(r => `<div class="copilot-passage"><div class="copilot-passage-title">${this.escapeHtml(r.title || '')}</div><div class="copilot-passage-excerpt">${this.escapeHtml(r.snippet || '')}</div></div>`).join('')}</div>` : ''}
            `;
        };

        // Wire "Go Online (LLM)"
        const goLLM = out.querySelector('#btn-copilot-go-online-llm');
        if (goLLM) {
            goLLM.addEventListener('click', async () => {
                const ok = await this.confirmGoOnline({ provider: cfg.provider, searchProvider: '' });
                if (!ok) return;

                if (cfg.provider === 'openai' && !String(cfg.apiKey || '').trim()) {
                    this.showError('OpenAI API key is missing (Copilot Settings).');
                    return;
                }
                if (cfg.provider === 'local_llm' && !String(cfg.baseUrl || '').trim()) {
                    this.showError('Local LLM Base URL is missing (Copilot Settings).');
                    return;
                }

                out.innerHTML = `<div class="empty-state"><p>Going online (LLM)…</p></div>`;
                const res2 = await window.atlas.copilotAsk(question, onlineContextLLM);
                if (!res2.success) {
                    out.innerHTML = `<div class="empty-state"><p>${this.escapeHtml(res2.error || 'Failed')}</p></div>`;
                    return;
                }
                renderSimple(res2);
            });
        }

        // Wire "Web Search" (no LLM)
        const goWeb = out.querySelector('#btn-copilot-go-online-web');
        if (goWeb) {
            goWeb.addEventListener('click', async () => {
                const ok = await this.confirmGoOnline({ provider: '', searchProvider: cfg.searchProvider });
                if (!ok) return;

                if (!cfg.searchProvider) {
                    this.showError('Web search provider is not configured (Copilot Settings).');
                    return;
                }
                if (cfg.searchProvider === 'serper' && !String(cfg.searchApiKey || '').trim()) {
                    this.showError('Serper API key is missing (Copilot Settings).');
                    return;
                }
                if (cfg.searchProvider === 'searxng' && !String(cfg.searchBaseUrl || '').trim()) {
                    this.showError('SearXNG Base URL is missing (Copilot Settings).');
                    return;
                }

                out.innerHTML = `<div class="empty-state"><p>Searching the web…</p></div>`;
                const res2 = await window.atlas.copilotAsk(question, onlineContextWeb);
                if (!res2.success) {
                    out.innerHTML = `<div class="empty-state"><p>${this.escapeHtml(res2.error || 'Failed')}</p></div>`;
                    return;
                }
                renderSimple(res2);
            });
        }

        // Wire inline actions (Show/Audition) without re-binding the whole UI
        out.querySelectorAll('.btn-copilot-show').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-patch-name') || '';
                this.setTab('library');
                const input = document.getElementById('search-input');
                if (input) input.value = name;
                this.searchPatches(name);
            });
        });
        out.querySelectorAll('.btn-copilot-audition').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-patch-id');
                if (id) this.auditionPatchInline(id);
            });
        });

        out.querySelectorAll('.btn-copilot-similar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const seedPatchId = e.currentTarget.getAttribute('data-patch-id');
                await this.askCopilotWithSeed(seedPatchId);
            });
        });

        out.querySelectorAll('.btn-copilot-more').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const raw = e.currentTarget.getAttribute('data-patch') || '';
                let patch = null;
                try { patch = JSON.parse(raw); } catch { /* ignore */ }
                if (patch) this.recordCopilotPreference(patch, 'more');
                await this.askCopilot(); // re-run with updated prefs
                this.setStatus('Atlas tuned to your taste ✅');
            });
        });
    }

    async askCopilotWithSeed(seedPatchId) {
        const question = document.getElementById('copilot-question')?.value || '';
        const genre = document.getElementById('copilot-genre')?.value || '';
        const out = document.getElementById('copilot-answer');
        if (!out) return;

        const preference = this.buildCopilotPreferenceContext();

        out.innerHTML = '';
        const cfg = this.copilotConfig || this.getDefaultCopilotConfig();
        const res = await window.atlas.copilotAsk(question, {
            genre: genre.trim() || null,
            seedPatchId: seedPatchId || null,
            preference,
            provider: cfg.provider,
            model: cfg.model,
            temperature: cfg.temperature
        });

        if (!res.success) {
            out.innerHTML = `<div class="empty-state"><p>${this.escapeHtml(res.error || 'Failed')}</p></div>`;
            return;
        }

        // reuse normal renderer by temporarily swapping response into a fake object
        // simplest: re-run the renderer logic by calling askCopilot() after stashing res
        // but to avoid a second IPC call, render inline here by setting a flag.
        // For now, render by calling a private helper pattern: just set fields and call askCopilot's renderer via a small trick.
        // (We keep it minimal: assign then call render block.)
        const tips = res.tips || [];
        const passages = res.passages || [];
        const recos = res.recommendations?.patches || [];
        const detected = res.detected || {};

        out.innerHTML = `
            ${recos.length ? `
                <div class="copilot-section">
                    <div class="copilot-title">Top matches in your Library</div>
                    <div class="copilot-subtitle">
                        ${detected.category ? `Detected: <span class="copilot-chip">${this.escapeHtml(detected.category)}</span>` : ''}
                        ${detected.genre ? `<span class="copilot-chip">${this.escapeHtml(detected.genre)}</span>` : ''}
                        ${detected.mood ? `<span class="copilot-chip">${this.escapeHtml(detected.mood)}</span>` : ''}
                    </div>
                    <div class="copilot-recos">
                        ${recos.map(p => `
                            <div class="copilot-reco">
                                <div class="copilot-reco-main">
                                    <div class="copilot-reco-name">${this.escapeHtml(p.name)}</div>
                                    <div class="copilot-reco-meta">
                                        <span class="copilot-chip">${this.escapeHtml(p.category || 'Uncategorized')}</span>
                                        <span class="copilot-reco-dot">•</span>
                                        <span class="copilot-reco-source">${this.escapeHtml(p.patchType === 'plugin' ? (p.pluginName || p.device) : p.device)}</span>
                                        ${p.patchType === 'plugin' ? `<span class="copilot-chip copilot-chip--muted">${this.escapeHtml(p.pluginType || 'Plugin')}</span>` : `<span class="copilot-chip copilot-chip--muted">Hardware</span>`}
                                    </div>
                                    ${Array.isArray(p.why) && p.why.length ? `<div class="copilot-reco-why">Matched: ${this.escapeHtml(p.why.join(', '))}</div>` : ''}
                                </div>
                                <div class="copilot-reco-actions">
                                    <button class="btn-small btn-copilot-show" data-patch-name="${this.escapeHtml(p.name)}" title="Show in Library">Show</button>
                                    <button class="btn-small btn-copilot-similar" data-patch-id="${this.escapeHtml(p.id)}" title="Find similar">Similar</button>
                                    <button class="btn-small btn-copilot-more" data-patch='${this.escapeHtml(JSON.stringify(p))}' title="Tune Atlas toward this vibe">More</button>
                                    ${p.patchType !== 'plugin' ? `<button class="btn-small btn-copilot-audition ${this.currentDevice ? '' : 'is-disabled'}" data-patch-id="${this.escapeHtml(p.id)}" ${this.currentDevice ? '' : 'disabled'} title="${this.currentDevice ? 'Audition' : 'Connect a device to audition'}">▶︎</button>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            ${tips.length ? `<div class="copilot-section"><div class="copilot-title">Suggestions</div>${tips.map(t => `<div class="copilot-tip">• ${this.escapeHtml(t)}</div>`).join('')}</div>` : ''}
            ${passages.length ? `<div class="copilot-section"><div class="copilot-title">From your Knowledge</div>${passages.map(p => `<div class="copilot-passage"><div class="copilot-passage-title">${this.escapeHtml(p.title)}</div><div class="copilot-passage-excerpt">${this.escapeHtml(p.excerpt || '')}</div></div>`).join('')}</div>` : `<div class="empty-state"><p>No matching knowledge passages yet. Import a manual or paste notes first.</p></div>`}
        `;

        // wire same handlers
        out.querySelectorAll('.btn-copilot-show').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-patch-name') || '';
                this.setTab('library');
                const input = document.getElementById('search-input');
                if (input) input.value = name;
                this.searchPatches(name);
            });
        });
        out.querySelectorAll('.btn-copilot-audition').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-patch-id');
                if (id) this.auditionPatchInline(id);
            });
        });
        out.querySelectorAll('.btn-copilot-similar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const nextSeed = e.currentTarget.getAttribute('data-patch-id');
                await this.askCopilotWithSeed(nextSeed);
            });
        });
        out.querySelectorAll('.btn-copilot-more').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const raw = e.currentTarget.getAttribute('data-patch') || '';
                let patch = null;
                try { patch = JSON.parse(raw); } catch { /* ignore */ }
                if (patch) this.recordCopilotPreference(patch, 'more');
                await this.askCopilotWithSeed(seedPatchId);
                this.setStatus('Atlas tuned to your taste ✅');
            });
        });
    }

    async clearKnowledge() {
        const ok = confirm('Clear Knowledge?\n\nThis deletes all imported/pasted knowledge documents.\nThis cannot be undone.');
        if (!ok) return;
        // brute-force delete by listing then deleting
        const list = await window.atlas.knowledgeListDocs(1000);
        for (const d of (list.docs || [])) {
            await window.atlas.knowledgeDeleteDoc(d.id);
        }
        document.getElementById('knowledge-results').innerHTML = '';
        document.getElementById('copilot-answer').innerHTML = '';
        await this.refreshKnowledgeList();
        this.setStatus('Knowledge cleared ✅');
    }
    
    /**
     * Update protocol badge
     */
    updateProtocolBadge(protocol, capabilities) {
        const badge = document.getElementById('protocol-badge');
        const text = badge.querySelector('.protocol-text');
        
        if (protocol === 'midi2') {
            badge.classList.add('midi2');
            text.textContent = 'MIDI 2.0 ⚡';
            badge.title = 'Enhanced features: 32-bit precision, bidirectional queries';
        } else {
            badge.classList.add('midi1');
            text.textContent = 'MIDI 1.0';
            badge.title = 'Standard compatibility mode';
        }
    }
    
    /**
     * Discover MIDI devices
     */
    async discoverDevices() {
        this.setStatus('Discovering MIDI devices...');
        
        const result = await window.atlas.discoverDevices();
        
        if (result.success) {
            this.devices = result.devices;
            this.populateDeviceManufacturerFilter(result.devices);
            this.populateDeviceModelFilter(result.devices);
            this.populateManualPairingPorts(result.devices);
            this.renderDeviceList();
            this.setStatus(`Found ${result.devices.length} device(s)`);
        } else {
            this.showError('Device discovery failed: ' + result.error);
        }
    }

    populateManualPairingPorts(devices) {
        const outEl = document.getElementById('manual-output-port');
        const inEl = document.getElementById('manual-input-port');
        if (!outEl || !inEl) return;

        const outputs = (devices || []).filter(d => d.type === 'output');
        const inputs = (devices || []).filter(d => d.type === 'input');

        const opt = (d) => `<option value="${this.escapeHtml(d.id)}">${this.escapeHtml(d.name)}${d.manufacturer && d.manufacturer !== 'Unknown' ? ` — ${this.escapeHtml(d.manufacturer)}` : ''}</option>`;
        outEl.innerHTML = `<option value="">Output port…</option>${outputs.map(opt).join('')}`;
        inEl.innerHTML = `<option value="">Input port…</option>${inputs.map(opt).join('')}`;

        // preselect sensible defaults
        if (this.currentDevice) {
            outEl.value = this.currentDevice;
            const out = outputs.find(o => o.id === this.currentDevice);
            if (out) {
                const match = inputs.find(i => i.name === out.name);
                if (match) inEl.value = match.id;
            }
        }
    }

    async connectManualPairing() {
        const outEl = document.getElementById('manual-output-port');
        const inEl = document.getElementById('manual-input-port');
        const outputId = outEl ? String(outEl.value || '') : '';
        const inputId = inEl ? String(inEl.value || '') : '';

        if (!outputId || !inputId) {
            this.showError('Select both an Output port and an Input port.');
            return;
        }

        this.setStatus('Connecting (manual pairing)…');
        const result = await window.atlas.connectDevice(outputId, { inputId });

        if (result.success) {
            this.currentDevice = outputId;
            this._midiVerifiedDevices.delete(outputId);
            this._midiLastSignalTsByDevice.delete(outputId);
            this.updateSelectedDevice(outputId);
            this.onDeviceConnected(outputId);
            this.renderDeviceList();
            this.setStatus('Device connected (manual pairing) ✅');
        } else {
            this.showError('Failed to connect: ' + (result.error || 'Unknown error'));
        }
    }

    populateDeviceManufacturerFilter(devices) {
        const el = document.getElementById('device-manufacturer-filter');
        if (!el) return;

        const popular = Object.keys(this.getPopularDeviceCatalog());

        const found = new Set((devices || []).map(d => String(d.manufacturer || 'Unknown')).filter(Boolean));
        const merged = Array.from(new Set([...popular, ...Array.from(found)])).sort((a, b) => a.localeCompare(b));

        const prev = String(this.deviceManufacturerFilter || '');
        el.innerHTML = `<option value="">All manufacturers</option>${merged.map(m => `<option value="${this.escapeHtml(m)}">${this.escapeHtml(m)}</option>`).join('')}`;
        el.value = prev && merged.includes(prev) ? prev : '';
        this.deviceManufacturerFilter = el.value;
    }

    getPopularDeviceCatalog() {
        // Curated list of common hardware brands + popular models (used for the 2-level menu).
        return {
            'Roland': ['JUNO-X', 'JUPITER-X', 'FANTOM', 'TR-8S', 'TR-6S', 'SP-404MKII', 'MC-707', 'MC-101'],
            'Korg': ['minilogue', 'minilogue xd', 'prologue', 'wavestate', 'opsix', 'modwave', 'Kronos', 'Nautilus'],
            'Yamaha': ['Montage', 'MODX', 'Reface CS', 'Reface DX', 'DX7', 'CP'],
            'Moog': ['Subsequent 37', 'Matriarch', 'Grandmother', 'Mother-32', 'DFAM'],
            'Akai': ['MPC One', 'MPC Live', 'MPC X', 'MPK', 'Force'],
            'Alesis': ['SR-16', 'SR-18', 'DM10', 'Strike'],
            'Sequential': ['Prophet-6', 'Prophet-5', 'Prophet Rev2', 'OB-6', 'Take 5'],
            'Novation': ['Peak', 'Summit', 'Bass Station', 'Launchkey', 'SL MKIII'],
            'Arturia': ['MicroFreak', 'MiniFreak', 'KeyLab', 'MiniLab', 'DrumBrute'],
            'Behringer': ['DeepMind', 'Model D', 'Neutron', 'TD-3', 'RD-8'],
            'Nord': ['Nord Lead', 'Nord Stage', 'Nord Electro'],
            'Elektron': ['Digitakt', 'Digitone', 'Syntakt', 'Analog Rytm', 'Octatrack'],
            'Teenage Engineering': ['OP-1', 'OP-Z', 'PO-33'],
            'Universal Audio': ['Volt', 'Apollo', 'UAD']
        };
    }

    populateDeviceModelFilter(devices) {
        const el = document.getElementById('device-model-filter');
        if (!el) return;

        const catalog = this.getPopularDeviceCatalog();
        const mfg = String(this.deviceManufacturerFilter || '');

        // Detected output device names (optionally scoped by manufacturer)
        let outputs = (devices || []).filter(d => d.type === 'output');
        if (mfg) outputs = outputs.filter(d => String(d.manufacturer || 'Unknown') === mfg);
        const detectedNames = Array.from(new Set(outputs.map(d => String(d.name || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

        const popularModels = mfg && catalog[mfg] ? catalog[mfg] : [];

        const optGroup = (label, options) => {
            if (!options.length) return '';
            return `<optgroup label="${this.escapeHtml(label)}">${options.map(o => `<option value="${this.escapeHtml(o)}">${this.escapeHtml(o)}</option>`).join('')}</optgroup>`;
        };

        el.innerHTML = `
            <option value="">All models</option>
            ${optGroup('Detected', detectedNames)}
            ${optGroup('Popular', popularModels)}
        `;

        // Preserve selection if still valid
        const prev = String(this.deviceModelFilter || '');
        const valid = new Set([...detectedNames, ...popularModels]);
        el.value = prev && valid.has(prev) ? prev : '';
        this.deviceModelFilter = el.value;

        // Hint update
        const hint = document.getElementById('device-filter-hint');
        if (hint) {
            if (mfg && detectedNames.length === 0) {
                hint.textContent = 'No detected devices for this manufacturer. Plug in and click refresh.';
            } else {
                hint.textContent = 'Tip: filters help you find devices; ATLAS can only connect to devices detected by macOS MIDI.';
            }
        }
    }
    
    /**
     * Render device list
     */
    renderDeviceList() {
        const deviceList = document.getElementById('device-list');
        
        if (this.devices.length === 0) {
            deviceList.innerHTML = `
                <div class="empty-state">
                    <p>No devices connected</p>
                    <button class="btn-primary" onclick="atlasUI.discoverDevices()">
                        Discover Devices
                    </button>
                </div>
            `;
            return;
        }
        
        deviceList.innerHTML = '';
        
        // Group by type (input/output)
        let outputs = this.devices.filter(d => d.type === 'output');

        // Manufacturer filter (sidebar)
        if (this.deviceManufacturerFilter) {
            outputs = outputs.filter(d => String(d.manufacturer || 'Unknown') === this.deviceManufacturerFilter);
        }

        // Model filter (sidebar)
        if (this.deviceModelFilter) {
            const needle = String(this.deviceModelFilter).toLowerCase();
            outputs = outputs.filter(d => String(d.name || '').toLowerCase().includes(needle));
        }

        // If user is filtering but nothing is detected, show a "no dead ends" troubleshoot card.
        if (outputs.length === 0 && (this.deviceManufacturerFilter || this.deviceModelFilter)) {
            const mfg = this.deviceManufacturerFilter ? this.escapeHtml(this.deviceManufacturerFilter) : 'Any manufacturer';
            const model = this.deviceModelFilter ? this.escapeHtml(this.deviceModelFilter) : 'Any model';
            deviceList.innerHTML = `
                <div class="device-troubleshoot">
                    <div class="device-troubleshoot-title">Not detected</div>
                    <div class="device-troubleshoot-sub">Filters: <strong>${mfg}</strong> • <strong>${model}</strong></div>
                    <div class="device-troubleshoot-actions">
                        <button class="btn-primary btn-primary--compact" id="btn-device-refresh-inline">Refresh Devices</button>
                        <button class="btn-small" id="btn-device-reset-filters">Reset Filters</button>
                    </div>
                    <div class="device-troubleshoot-checklist-title">Checklist (macOS)</div>
                    <ul class="device-troubleshoot-list">
                        <li>Power cycle the device and replug the USB cable (try a different port/cable).</li>
                        <li>On the device, ensure USB mode is set to <strong>USB MIDI</strong> (not “storage”).</li>
                        <li>If you see multiple ports (e.g. “DAW CTRL”), connect the <strong>main</strong> instrument port first.</li>
                        <li>Open <strong>Audio MIDI Setup → MIDI Studio</strong> and confirm the device appears.</li>
                        <li>If the device requires a driver, install the manufacturer driver and reboot.</li>
                    </ul>
                </div>
            `;

            const refreshBtn = document.getElementById('btn-device-refresh-inline');
            if (refreshBtn) refreshBtn.addEventListener('click', () => this.discoverDevices());

            const resetBtn = document.getElementById('btn-device-reset-filters');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.deviceManufacturerFilter = '';
                    this.deviceModelFilter = '';
                    const mfgEl = document.getElementById('device-manufacturer-filter');
                    const modelEl = document.getElementById('device-model-filter');
                    if (mfgEl) mfgEl.value = '';
                    if (modelEl) modelEl.value = '';
                    this.populateDeviceModelFilter(this.devices);
                    this.renderDeviceList();
                });
            }

            return;
        }
        
        outputs.forEach(device => {
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card';
            const isConnected = this.currentDevice === device.id;
            const alias = this.getPortAliasLabel(device.name);
            const displayName = alias ? `${device.name} — ${alias}` : device.name;
            deviceCard.innerHTML = `
                <div class="device-info">
                    <div class="device-name">
                        <span class="midi-activity-dot ${isConnected ? 'is-armed' : 'is-off'} device-activity-dot"
                              id="midi-dot-${device.id}"
                              title="${isConnected ? 'Connected (MIDI idle)' : 'Not connected'}"></span>
                        <span class="device-name-text" title="${this.escapeHtml(displayName)}">${this.escapeHtml(displayName)}</span>
                    </div>
                    <div class="device-meta">
                        <span class="device-manufacturer">${device.manufacturer || 'Unknown'}</span>
                        <span class="device-meta-sep" aria-hidden="true">•</span>
                        <span class="device-protocol ${device.protocol === 'MIDI 2.0' ? 'midi2' : 'midi1'}">${device.protocol || 'MIDI 1.0'}</span>
                    </div>
                </div>
                <div class="device-actions">
                    <button class="btn-small btn-label" data-device-name="${this.escapeHtml(device.name)}" title="Label the instrument behind this port">
                        Label
                    </button>
                    <button class="btn-small btn-connect" data-device-id="${device.id}">
                        ${isConnected ? 'Connected' : 'Connect'}
                    </button>
                </div>
            `;
            
            deviceList.appendChild(deviceCard);
            
            // Add connect handler
            deviceCard.querySelector('.btn-connect').addEventListener('click', () => {
                if (!isConnected) this.connectDevice(device.id);
            });

            const labelBtn = deviceCard.querySelector('.btn-label');
            if (labelBtn) {
                labelBtn.addEventListener('click', () => {
                    const portName = String(labelBtn.getAttribute('data-device-name') || '');
                    this.showPortLabelModal(portName);
                });
            }
        });
    }
    
    /**
     * Connect to device
     */
    async connectDevice(deviceId) {
        this.setStatus('Connecting to device...');
        
        const result = await window.atlas.connectDevice(deviceId, {});
        
        if (result.success) {
            this.currentDevice = deviceId;
            // Reset verification state for this device until we see handshake activity.
            this._midiVerifiedDevices.delete(deviceId);
            this._midiLastSignalTsByDevice.delete(deviceId);
            this.setStatus('Device connected');
            this.updateSelectedDevice(deviceId);
            this.onDeviceConnected(deviceId);
            // Refresh device list to show connected state
            this.renderDeviceList();
        } else {
            this.showError('Failed to connect: ' + result.error);
        }
    }
    
    /**
     * Load patches
     */
    async loadPatches(query = {}) {
        const result = await window.atlas.searchPatches(query);
        
        if (result.success) {
            this.patches = result.patches || [];
            this.renderPatchBrowser();
            if (this.activeTab === 'device') {
                this.refreshDeviceLibrarian();
            }
        }
    }
    
    /**
     * Render patch browser
     */
    renderPatchBrowser() {
        const browser = document.getElementById('patch-browser');
        
        if (this.patches.length === 0) {
            // Contextual empty states for preset browsers
            if (this.pluginPresetView?.mode === 'plugin') {
                const name = this.escapeHtml(this.pluginPresetView.name || 'this plugin');
                browser.innerHTML = `
                    <div class="empty-state">
                        <h3>No extracted presets yet</h3>
                        <p>ATLAS can only show presets after extraction. Select <strong>${name}</strong> in the plugin list and click <strong>Extract</strong>.</p>
                    </div>
                `;
                return;
            }
            if (this.pluginPresetView?.mode === 'vendor') {
                const name = this.escapeHtml(this.pluginPresetView.name || 'this vendor');
                browser.innerHTML = `
                    <div class="empty-state">
                        <h3>No extracted presets for this vendor</h3>
                        <p>Select a plugin under <strong>${name}</strong> and click <strong>Extract</strong>. Then its presets will appear here automatically.</p>
                    </div>
                `;
                return;
            }
            browser.innerHTML = `
                <div class="empty-state">
                    <h3>No patches found</h3>
                    <p>Import patches or read them from your connected devices</p>
                </div>
            `;
            return;
        }
        
        browser.innerHTML = '<div class="patch-grid"></div>';
        const grid = browser.querySelector('.patch-grid');
        
        this.patches.forEach(patch => {
            const patchCard = document.createElement('div');
            patchCard.className = 'patch-card';
            const hasDevice = Boolean(this.currentDevice);
            const isPluginPatch = patch.patchType === 'plugin' || Boolean(patch.pluginId);
            const typeLabel = isPluginPatch ? (patch.pluginType || 'Plugin') : 'Hardware';
            const typeBadge = isPluginPatch ? 'plugin' : 'hardware';
            const tagList = Array.isArray(patch.tags) ? patch.tags : [];
            const tagsToShow = tagList.slice(0, 4);
            const extraTagCount = Math.max(0, tagList.length - tagsToShow.length);

            patchCard.innerHTML = `
                <div class="patch-card-top">
                    <div class="patch-title-row">
                        <h3 class="patch-name" title="${this.escapeHtml(patch.name)}">${this.escapeHtml(patch.name)}</h3>
                        <div class="patch-rating" title="Rating">${'⭐'.repeat(patch.rating || 0)}</div>
                    </div>

                    <div class="patch-subtitle">
                        <span class="patch-chip patch-chip--${typeBadge}">${this.escapeHtml(typeLabel)}</span>
                        <span class="patch-divider">•</span>
                        <span class="patch-device" title="${this.escapeHtml(patch.device)}">${this.escapeHtml(patch.device)}</span>
                    </div>

                    <div class="patch-chip-row">
                        <span class="patch-chip patch-chip--category" title="${this.getPatchCategoryDescription(patch.category)}">
                            ${this.getPatchCategoryIcon(patch.category)} ${this.escapeHtml(patch.category || 'Uncategorized')}
                        </span>
                        ${patch.manufacturer && patch.manufacturer !== 'Unknown' ? `<span class="patch-chip patch-chip--muted" title="Manufacturer">${this.escapeHtml(patch.manufacturer)}</span>` : ''}
                    </div>
                </div>

                <div class="patch-tags">
                    ${tagsToShow.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                    ${extraTagCount > 0 ? `<span class="tag tag--muted">+${extraTagCount}</span>` : ''}
                </div>

                <div class="patch-actions">
                    <button class="btn-small btn-similar" data-patch-id="${patch.id}" title="Find similar patches/presets">
                        Similar
                    </button>
                    <button class="btn-small btn-more" data-patch-id="${patch.id}" title="Tune Atlas toward this vibe">
                        More
                    </button>
                    <button class="btn-small btn-less" data-patch-id="${patch.id}" title="Tune Atlas away from this vibe">
                        Less
                    </button>
                    <button class="btn-small btn-audition ${(!isPluginPatch && hasDevice) ? '' : (isPluginPatch ? '' : 'is-disabled')}"
                            data-patch-id="${patch.id}"
                            ${(!isPluginPatch && hasDevice) ? '' : (isPluginPatch ? '' : 'disabled')}
                            title="${isPluginPatch ? 'Audition in DAW (reveal/copy preset file)' : (!hasDevice ? 'Connect a device to audition patches' : 'Audition this patch (send + short note)')}">
                        ▶︎ Audition
                    </button>
                    <button class="btn-small btn-send ${hasDevice ? '' : 'is-disabled'}" data-patch-id="${patch.id}" ${hasDevice ? '' : 'disabled'} title="${hasDevice ? 'Send to the selected device' : 'Connect a device to send patches'}">
                        Send
                    </button>
                    <button class="btn-small btn-edit" data-patch-id="${patch.id}" title="Edit patch metadata">
                        Edit
                    </button>
                </div>
            `;
            
            grid.appendChild(patchCard);

            // Category chip quick edit:
            // - Right-click (context menu) on any category chip to reclassify
            // - Double-click "Uncategorized" as an extra discoverable shortcut
            const catChip = patchCard.querySelector('.patch-chip--category');
            const shownCategory = String(patch.category || 'Uncategorized');
            if (catChip) {
                catChip.style.cursor = 'context-menu';
                catChip.title = 'Right-click to change category';
                catChip.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showPatchCategoryModal(patch.id);
                });

                // Extra shortcut for discoverability on Uncategorized
                if (shownCategory === 'Uncategorized') {
                    catChip.title = 'Right-click to change category (or double-click)';
                    catChip.style.cursor = 'pointer';
                    catChip.addEventListener('dblclick', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showPatchCategoryModal(patch.id);
                    });
                }
            }
            
            // Add event handlers
            const similarBtn = patchCard.querySelector('.btn-similar');
            if (similarBtn) {
                similarBtn.addEventListener('click', () => {
                    this.findSimilarFromPatch(patch.id);
                });
            }

            const moreBtn = patchCard.querySelector('.btn-more');
            if (moreBtn) {
                moreBtn.addEventListener('click', () => {
                    this.tuneFromPatch(patch.id, 'more');
                });
            }

            const lessBtn = patchCard.querySelector('.btn-less');
            if (lessBtn) {
                lessBtn.addEventListener('click', () => {
                    this.tuneFromPatch(patch.id, 'less');
                });
            }

            const auditionBtn = patchCard.querySelector('.btn-audition');
            if (auditionBtn) {
                auditionBtn.addEventListener('click', () => {
                    this.auditionPatchInline(patch.id);
                });
            }

            const sendBtn = patchCard.querySelector('.btn-send');
            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    this.sendPatchToDevice(patch.id);
                });
            }
            
            patchCard.querySelector('.btn-edit').addEventListener('click', () => {
                this.editPatch(patch.id);
            });
        });
    }

    async findSimilarFromPatch(patchId) {
        const patch = this.patches.find(p => p.id === patchId);
        if (!patch) return;

        // Stay in Library: open the Copilot Drawer and run a seeded query
        await this.openCopilotDrawer(patchId, patch.name);
    }

    tuneFromPatch(patchId, direction = 'more') {
        const patch = this.patches.find(p => p.id === patchId);
        if (!patch) return;
        this.recordCopilotPreference(patch, direction);
        this.setStatus(direction === 'less' ? 'Atlas tuned away from this vibe ✅' : 'Atlas tuned to your taste ✅');
    }

    closeCopilotDrawer() {
        const drawer = document.getElementById('copilot-drawer');
        if (drawer) drawer.style.display = 'none';
    }

    async openCopilotDrawer(seedPatchId, seedName = 'Similar') {
        const drawer = document.getElementById('copilot-drawer');
        const body = document.getElementById('copilot-drawer-body');
        const heading = document.getElementById('copilot-drawer-heading');
        if (!drawer || !body || !heading) return;

        drawer.style.display = 'flex';
        heading.textContent = seedName ? `Similar to “${seedName}”` : 'Similar';

        body.innerHTML = `
            <div class="empty-state">
                <p>Finding similar patches…</p>
            </div>
        `;

        const preference = this.buildCopilotPreferenceContext();
        const cfg = this.copilotConfig || this.getDefaultCopilotConfig();

        // Provide a non-empty query for Copilot (required). Use the seed patch name.
        const question = String(seedName || 'similar').trim() || 'similar';

        const res = await window.atlas.copilotAsk(question, {
            seedPatchId: seedPatchId || null,
            preference,
            provider: cfg.provider,
            model: cfg.model,
            temperature: cfg.temperature
        });

        if (!res.success) {
            body.innerHTML = `<div class="empty-state"><p>${this.escapeHtml(res.error || 'Failed')}</p></div>`;
            return;
        }

        const recos = res.recommendations?.patches || [];
        if (!recos.length) {
            body.innerHTML = `<div class="copilot-drawer-empty">No similar patches found yet.</div>`;
            return;
        }

        body.innerHTML = `
            <div class="copilot-recos">
                ${recos.map(p => `
                    <div class="copilot-reco">
                        <div class="copilot-reco-main">
                            <div class="copilot-reco-name">${this.escapeHtml(p.name)}</div>
                            <div class="copilot-reco-meta">
                                <span class="copilot-chip">${this.escapeHtml(p.category || 'Uncategorized')}</span>
                                <span class="copilot-reco-dot">•</span>
                                <span class="copilot-reco-source">${this.escapeHtml(p.patchType === 'plugin' ? (p.pluginName || p.device) : p.device)}</span>
                                ${p.patchType === 'plugin' ? `<span class="copilot-chip copilot-chip--muted">${this.escapeHtml(p.pluginType || 'Plugin')}</span>` : `<span class="copilot-chip copilot-chip--muted">Hardware</span>`}
                            </div>
                            ${Array.isArray(p.why) && p.why.length ? `<div class="copilot-reco-why">Matched: ${this.escapeHtml(p.why.join(', '))}</div>` : ''}
                        </div>
                        <div class="copilot-reco-actions">
                            <button class="btn-small btn-drawer-show" data-patch-name="${this.escapeHtml(p.name)}" title="Show in Library">Show</button>
                            <button class="btn-small btn-drawer-more" data-patch='${this.escapeHtml(JSON.stringify(p))}' title="More like this">More</button>
                            <button class="btn-small btn-drawer-less" data-patch='${this.escapeHtml(JSON.stringify(p))}' title="Less like this">Less</button>
                            ${p.patchType !== 'plugin' ? `
                                <button class="btn-small btn-drawer-audition ${this.currentDevice ? '' : 'is-disabled'}"
                                        data-patch-id="${this.escapeHtml(p.id)}"
                                        ${this.currentDevice ? '' : 'disabled'}
                                        title="${this.currentDevice ? 'Audition' : 'Connect a device to audition'}">▶︎</button>
                                <button class="btn-small btn-drawer-send ${this.currentDevice ? '' : 'is-disabled'}"
                                        data-patch-id="${this.escapeHtml(p.id)}"
                                        ${this.currentDevice ? '' : 'disabled'}
                                        title="${this.currentDevice ? 'Send to device' : 'Connect a device to send'}">Send</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Wire actions
        body.querySelectorAll('.btn-drawer-show').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-patch-name') || '';
                const input = document.getElementById('search-input');
                if (input) input.value = name;
                this.searchPatches(name);
            });
        });

        body.querySelectorAll('.btn-drawer-audition').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-patch-id');
                if (id) this.auditionPatchInline(id);
            });
        });

        body.querySelectorAll('.btn-drawer-send').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-patch-id');
                if (id) this.sendPatchToDevice(id);
            });
        });

        const tune = async (raw, dir) => {
            let patch = null;
            try { patch = JSON.parse(raw); } catch { /* ignore */ }
            if (patch) this.recordCopilotPreference(patch, dir);
            // Re-run to reflect new preferences
            await this.openCopilotDrawer(seedPatchId, seedName);
            this.setStatus(dir === 'less' ? 'Atlas tuned away ✅' : 'Atlas tuned to your taste ✅');
        };

        body.querySelectorAll('.btn-drawer-more').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const raw = e.currentTarget.getAttribute('data-patch') || '';
                await tune(raw, 'more');
            });
        });
        body.querySelectorAll('.btn-drawer-less').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const raw = e.currentTarget.getAttribute('data-patch') || '';
                await tune(raw, 'less');
            });
        });
    }

    /**
     * Audition patch inline (hardware-first)
     */
    async auditionPatchInline(patchId) {
        const patch = this.patches.find(p => p.id === patchId);
        const isPluginPatch = patch?.patchType === 'plugin' || Boolean(patch?.pluginId);

        if (isPluginPatch) {
            this.showPluginPresetAuditionModal(patch);
            return;
        }

        if (!this.currentDevice) {
            this.showError('No device connected. Please connect a device first.');
            return;
        }

        this.setStatus('Auditioning patch...');

        // Simple defaults (C4 / short note). We can add a global Audition settings control later.
        const result = await window.atlas.auditionPatch(this.currentDevice, patchId, {
            channel: 0,
            note: 60,
            velocity: 100,
            durationMs: 250
        });

        if (result.success) {
            this.setStatus('Audition sent ✅');
        } else {
            this.showError('Audition failed: ' + result.error);
        }
    }
    
    /**
     * Send patch to device
     */
    async sendPatchToDevice(patchId) {
        if (!this.currentDevice) {
            this.showError('No device connected. Please connect a device first.');
            return;
        }
        
        this.setStatus('Sending patch to device...');
        
        const result = await window.atlas.sendPatch(this.currentDevice, patchId);
        
        if (result.success) {
            this.setStatus('Patch sent successfully ✅');
        } else {
            this.showError('Failed to send patch: ' + result.error);
        }
    }
    
    /**
     * Connect to DAW
     */
    async connectToDAW(dawType) {
        this.setStatus(`Connecting to ${dawType.toUpperCase()}...`);
        
        const config = this.getDAWConfig(dawType);
        const result = await window.dawBridge.connect(dawType, config);
        
        if (result.success) {
            this.dawConnected = true;
            this.updateDAWStatus(dawType, true);
            this.setStatus(`Connected to ${dawType.toUpperCase()} ✅`);
        } else {
            this.showError(`Failed to connect to ${dawType}: ` + result.error);
        }
    }
    
    /**
     * Get DAW connection config
     */
    getDAWConfig(dawType) {
        const configs = {
            reaper: {
                oscPort: 8000,
                oscHost: 'localhost'
            },
            ableton: {
                port: 9000
            },
            logic: {
                port: 9001
            }
        };
        
        return configs[dawType] || {};
    }
    
    /**
     * Update DAW status indicator
     */
    updateDAWStatus(dawType, connected) {
        const status = document.getElementById('daw-status');
        const text = status.querySelector('.daw-text');
        
        if (connected) {
            status.classList.add('connected');
            text.textContent = `Connected to ${dawType.toUpperCase()}`;
        } else {
            status.classList.remove('connected');
            text.textContent = 'No DAW Connected';
        }
    }
    
    /**
     * Refresh statistics
     */
    async refreshStatistics() {
        const result = await window.atlas.getStatistics();
        
        if (result.success) {
            document.getElementById('patch-count').textContent = result.stats.totalPatches;
            document.getElementById('device-count').textContent = result.stats.devices;
            const pluginCountEl = document.getElementById('plugin-count');
            if (pluginCountEl) {
                pluginCountEl.textContent = result.stats.plugins || 0;
            }
        }
    }
    
    /**
     * Search patches
     */
    async searchPatches(query) {
        await this.loadPatches({ name: query });
    }
    
    /**
     * Apply filters
     */
    async applyFilters() {
        const category = document.getElementById('category-filter').value;
        const device = document.getElementById('device-filter').value;
        const pluginCategoryFilterEl = document.getElementById('plugin-category-filter');
        const pluginCategory = pluginCategoryFilterEl ? pluginCategoryFilterEl.value : '';
        const pluginVendorFilterEl = document.getElementById('plugin-vendor-filter');
        const pluginVendor = pluginVendorFilterEl ? pluginVendorFilterEl.value : '';
        
        // Store plugin category filter
        this.pluginCategoryFilter = pluginCategory;
        this.pluginVendorFilter = String(pluginVendor || '');
        
        // Apply plugin filter
        this.applyPluginFilter();
        
        // Apply patch filters
        const query = {};
        if (category) query.category = category;
        if (device) query.device = device;
        if (pluginCategory) {
            // Filter patches by plugin category
            query.patchType = 'plugin';
            // Note: We'll need to filter client-side since plugin category isn't in patch table yet
        }

        // Plugin Preset Browser: force pluginId scope when active
        if (this.pluginPresetView && this.pluginPresetView.mode === 'plugin' && this.pluginPresetView.pluginId) {
            query.patchType = 'plugin';
            query.pluginId = this.pluginPresetView.pluginId;
            if (this.pluginPresetSearch) query.name = this.pluginPresetSearch;
        }

        // Vendor Preset Browser: query by the vendor's plugin IDs
        if (this.pluginPresetView && this.pluginPresetView.mode === 'vendor' && this.pluginPresetView.vendor) {
            query.patchType = 'plugin';
            if (Array.isArray(this.pluginPresetView.pluginIds) && this.pluginPresetView.pluginIds.length) {
                query.pluginIds = this.pluginPresetView.pluginIds;
            }
            if (this.pluginPresetSearch) query.name = this.pluginPresetSearch;
        }
        
        await this.loadPatches(query);
    }

    setPluginFilterMode(mode) {
        const m = mode === 'vendors' ? 'vendors' : 'types';
        this.pluginFilterMode = m;
        try { localStorage.setItem(this.pluginFilterModeKey, m); } catch { /* ignore */ }
        this.syncPluginFilterModeUI();
    }

    syncPluginFilterModeUI() {
        const tabTypes = document.getElementById('plugin-filter-tab-types');
        const tabVendors = document.getElementById('plugin-filter-tab-vendors');
        const typeSel = document.getElementById('plugin-category-filter');
        const vendorSel = document.getElementById('plugin-vendor-filter');
        const vendorPresetsBtn = document.getElementById('plugin-vendor-presets-btn');
        const isVendors = this.pluginFilterMode === 'vendors';

        if (tabTypes) tabTypes.classList.toggle('is-active', !isVendors);
        if (tabVendors) tabVendors.classList.toggle('is-active', isVendors);
        if (typeSel) typeSel.style.display = isVendors ? 'none' : '';
        if (vendorSel) vendorSel.style.display = isVendors ? '' : 'none';
        if (vendorPresetsBtn) {
            vendorPresetsBtn.style.display = isVendors ? '' : 'none';
            const enabled = isVendors && String(this.pluginVendorFilter || '').trim().length > 0;
            vendorPresetsBtn.disabled = !enabled;
            vendorPresetsBtn.classList.toggle('is-disabled', !enabled);
        }
    }

    populatePluginVendorFilter() {
        const el = document.getElementById('plugin-vendor-filter');
        if (!el) return;

        const counts = new Map();
        for (const p of (this.allPlugins || [])) {
            const v = String(p?.manufacturer || 'Unknown').trim() || 'Unknown';
            counts.set(v, (counts.get(v) || 0) + 1);
        }
        const vendors = Array.from(counts.keys())
            .sort((a, b) => {
                // Keep Unknown at the bottom
                if (a === 'Unknown' && b !== 'Unknown') return 1;
                if (b === 'Unknown' && a !== 'Unknown') return -1;
                return a.localeCompare(b);
            });

        const prev = String(this.pluginVendorFilter || '');
        el.innerHTML = `<option value="">All Plugin Vendors</option>${vendors.map(v => {
            const c = counts.get(v) || 0;
            return `<option value="${this.escapeHtml(v)}">${this.escapeHtml(`${v} (${c})`)}</option>`;
        }).join('')}`;
        el.value = prev && vendors.includes(prev) ? prev : '';
        this.pluginVendorFilter = el.value;

        // Store for other UI (ex: vendor fix modal suggestions)
        this._pluginVendorCounts = Object.fromEntries(counts.entries());
        this._pluginVendors = vendors;
    }

    openPluginPresetView(pluginId) {
        const pid = String(pluginId || '').trim();
        if (!pid) return;
        const plugin = this.allPlugins.find(p => p.id === pid);
        const n = String(plugin?.name || '').toLowerCase();
        const t = String(plugin?.type || '').toLowerCase();
        const isShell = n.includes(' shell') || n.includes('vst3 shell') || n.includes('audio unit shell') || t.includes('shell');
        if (isShell) {
            this.showError('Shell/container plugin: no extractable preset files to show.');
            return;
        }
        this.pluginPresetView = { mode: 'plugin', pluginId: pid, name: plugin?.name || 'Plugin' };
        const bar = document.getElementById('plugin-presets-bar');
        const labelEl = document.getElementById('plugin-presets-label');
        const nameEl = document.getElementById('plugin-presets-name');
        if (bar) bar.style.display = '';
        if (labelEl) labelEl.textContent = 'Plugin Presets';
        if (nameEl) nameEl.textContent = this.pluginPresetView.name;
        const input = document.getElementById('plugin-presets-search');
        if (input) input.value = this.pluginPresetSearch || '';
        this.refreshPluginPresetView();
    }

    openPluginVendorPresetView(vendor) {
        const v = String(vendor || '').trim();
        if (!v) return;
        const plugins = (this.allPlugins || []).filter(p => String(p?.manufacturer || 'Unknown').trim() === v);
        const pluginIds = plugins.map(p => String(p.id)).filter(Boolean);
        const pluginNames = plugins.map(p => String(p.name)).filter(Boolean);

        this.pluginPresetView = { mode: 'vendor', vendor: v, name: v, pluginIds, pluginNames };
        const bar = document.getElementById('plugin-presets-bar');
        const labelEl = document.getElementById('plugin-presets-label');
        const nameEl = document.getElementById('plugin-presets-name');
        if (bar) bar.style.display = '';
        if (labelEl) labelEl.textContent = 'Vendor Presets';
        if (nameEl) nameEl.textContent = v;
        const input = document.getElementById('plugin-presets-search');
        if (input) input.value = this.pluginPresetSearch || '';
        this.refreshPluginPresetView();
    }

    async refreshPluginPresetView() {
        if (!this.pluginPresetView) return;
        if (this.pluginPresetView.mode === 'plugin') {
            const query = { patchType: 'plugin', pluginId: this.pluginPresetView.pluginId, limit: null };
            if (this.pluginPresetSearch) query.name = this.pluginPresetSearch;
            await this.loadPatches(query);
            this.setStatus(`Showing presets for ${this.pluginPresetView.name}`);
            return;
        }

        if (this.pluginPresetView.mode === 'vendor') {
            const query = { patchType: 'plugin', limit: null };
            if (Array.isArray(this.pluginPresetView.pluginIds) && this.pluginPresetView.pluginIds.length) {
                query.pluginIds = this.pluginPresetView.pluginIds;
            }
            if (this.pluginPresetSearch) query.name = this.pluginPresetSearch;
            await this.loadPatches(query);
            this.setStatus(`Showing vendor presets: ${this.pluginPresetView.name}`);
        }
    }

    async clearPluginPresetView() {
        this.pluginPresetView = null;
        this.pluginPresetSearch = '';
        const bar = document.getElementById('plugin-presets-bar');
        if (bar) bar.style.display = 'none';
        const labelEl = document.getElementById('plugin-presets-label');
        if (labelEl) labelEl.textContent = 'Plugin Presets';
        const input = document.getElementById('plugin-presets-search');
        if (input) input.value = '';
        await this.loadPatches({});
        this.setStatus('Showing full library');
    }
    
    /**
     * Set status message
     */
    setStatus(message) {
        document.getElementById('status-message').textContent = message;
    }
    
    /**
     * Update selected device
     */
    updateSelectedDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        const textEl = document.getElementById('selected-device-text');
        const dot = document.getElementById('midi-activity-dot');
        if (device && textEl) {
            textEl.textContent = device.name;
            if (dot) {
                dot.classList.remove('is-off');
                dot.classList.add('is-armed');
                dot.classList.remove('is-verified');
                dot.classList.remove('is-pulse');
                dot.title = 'Connected • verifying… (waiting for MIDI/identity reply)';
            }
        } else if (textEl) {
            textEl.textContent = 'No device selected';
            if (dot) {
                dot.classList.add('is-off');
                dot.classList.remove('is-armed');
                dot.classList.remove('is-verified');
                dot.classList.remove('is-pulse');
                dot.title = 'No device connected';
            }
        }
    }

    // =========================
    // Device Librarian (per hardware device)
    // =========================

    getActiveDeviceInfo() {
        if (!this.currentDevice) return null;
        return this.devices.find(d => d.id === this.currentDevice) || null;
    }

    // Port name used for queries / DB keys (do NOT change)
    getActiveDevicePortName() {
        const info = this.getActiveDeviceInfo();
        return info?.name || (this.currentDevice ? String(this.currentDevice) : '');
    }

    // Display name (can include user label)
    getActiveDeviceDisplayName() {
        const portName = this.getActiveDevicePortName();
        const alias = this.getPortAliasLabel(portName);
        return alias ? `${portName} — ${alias}` : portName;
    }

    onDeviceConnected(deviceId) {
        const tabDevice = document.getElementById('tab-device');
        if (tabDevice) tabDevice.style.display = deviceId ? '' : 'none';

        // Default to Device librarian after connect (most users want to manage that device right away)
        if (deviceId && this.activeTab === 'library') {
            this.setTab('device');
        } else if (deviceId && this.activeTab === 'device') {
            this.refreshDeviceLibrarian();
        }
    }

    async refreshDeviceLibrarian() {
        const titleEl = document.getElementById('device-librarian-title');
        const patchListEl = document.getElementById('device-patch-list');
        const setListEl = document.getElementById('device-set-list');
        const itemsEl = document.getElementById('device-set-items');
        const createBtn = document.getElementById('device-set-create');
        const addSelectedBtn = document.getElementById('device-set-add-selected');
        const renameBtn = document.getElementById('device-set-rename');
        const deleteBtn = document.getElementById('device-set-delete');
        const exportBtn = document.getElementById('device-set-export');
        const sendBtn = document.getElementById('device-set-send');
        const helpBtn = document.getElementById('device-import-help');
        const manualBtn = document.getElementById('device-import-manual');
        const importSetBtn = document.getElementById('device-set-import');
        const captureBtn = document.getElementById('device-import-sysex');

        const devicePortName = this.getActiveDevicePortName();
        const deviceDisplayName = this.getActiveDeviceDisplayName();
        const deviceInfo = this.getActiveDeviceInfo();

        if (!this.currentDevice || !devicePortName) {
            if (titleEl) titleEl.textContent = 'No device connected';
            if (patchListEl) patchListEl.innerHTML = `<div class="empty-state"><h3>No device</h3><p>Connect a hardware device to manage its patches and Sets.</p></div>`;
            if (setListEl) setListEl.innerHTML = '';
            if (itemsEl) itemsEl.innerHTML = '';
            return;
        }

        if (titleEl) {
            const m = deviceInfo?.manufacturer && deviceInfo.manufacturer !== 'Unknown' ? `${deviceInfo.manufacturer} • ` : '';
            titleEl.textContent = `${m}${deviceDisplayName}`;
        }

        // Wire buttons once
        if (createBtn && !createBtn.dataset.wired) {
            createBtn.dataset.wired = '1';
            createBtn.addEventListener('click', async () => {
                const setName = prompt('New Set name (bundle name):', `${devicePortName} Set`);
                if (!setName) return;
                const description = prompt('Optional description:', '') || '';
                const res = await window.atlas.patchSetsCreate({ name: setName, device: devicePortName, description });
                if (!res.success) {
                    this.showError(res.error || 'Failed to create set');
                    return;
                }
                this.activePatchSetId = res.set?.id || null;
                this.setStatus('Set created ✅');
                await this.refreshDeviceLibrarian();
            });
        }
        if (addSelectedBtn && !addSelectedBtn.dataset.wired) {
            addSelectedBtn.dataset.wired = '1';
            addSelectedBtn.addEventListener('click', async () => {
                if (!this.activePatchSetId) {
                    this.showError('Select a Set first (right panel).');
                    return;
                }
                const ids = Array.from(this.deviceSelectedPatchIds || []);
                if (ids.length === 0) {
                    this.showError('Select at least one patch (left panel).');
                    return;
                }
                const res = await window.atlas.patchSetsAdd(this.activePatchSetId, ids);
                if (!res.success) {
                    this.showError(res.error || 'Failed to add patches to set');
                    return;
                }
                this.setStatus(`Added ${res.added || 0} patch(es) to Set ✅`);
                await this.renderActiveSetItems();
            });
        }

        if (renameBtn && !renameBtn.dataset.wired) {
            renameBtn.dataset.wired = '1';
            renameBtn.addEventListener('click', async () => {
                if (!this.activePatchSetId) {
                    this.showError('Select a Set first.');
                    return;
                }
                const current = await this.getActiveSetMeta();
                const nextName = prompt('Rename Set:', current?.name || 'Set');
                if (!nextName) return;
                const nextDesc = prompt('Description (optional):', current?.description || '') ?? (current?.description || '');
                const res = await window.atlas.patchSetsUpdate(this.activePatchSetId, { name: nextName, description: nextDesc });
                if (!res.success) {
                    this.showError(res.error || 'Rename failed');
                    return;
                }
                this.setStatus('Set updated ✅');
                await this.refreshDeviceLibrarian();
            });
        }

        if (deleteBtn && !deleteBtn.dataset.wired) {
            deleteBtn.dataset.wired = '1';
            deleteBtn.addEventListener('click', async () => {
                if (!this.activePatchSetId) {
                    this.showError('Select a Set first.');
                    return;
                }
                const ok = confirm('Delete this Set?\n\nThis removes the bundle (not the patches).');
                if (!ok) return;
                const res = await window.atlas.patchSetsDelete(this.activePatchSetId);
                if (!res.success) {
                    this.showError(res.error || 'Delete failed');
                    return;
                }
                this.activePatchSetId = null;
                this.setStatus('Set deleted ✅');
                await this.refreshDeviceLibrarian();
            });
        }

        if (exportBtn && !exportBtn.dataset.wired) {
            exportBtn.dataset.wired = '1';
            exportBtn.addEventListener('click', async () => {
                if (!this.activePatchSetId) {
                    this.showError('Select a Set first.');
                    return;
                }
                const res = await window.atlas.patchSetsExport(this.activePatchSetId);
                if (!res.success) {
                    this.showError(res.error || 'Export failed');
                    return;
                }
                if (res.canceled) return;
                this.setStatus(`Exported ✅ ${res.filePath}`);
            });
        }

        if (sendBtn && !sendBtn.dataset.wired) {
            sendBtn.dataset.wired = '1';
            sendBtn.addEventListener('click', async () => {
                if (!this.currentDevice) {
                    this.showError('Connect a device first.');
                    return;
                }
                if (!this.activePatchSetId) {
                    this.showError('Select a Set first.');
                    return;
                }
                const ok = confirm('Send the entire Set to the connected device, in this order?');
                if (!ok) return;
                const items = await window.atlas.patchSetsItems(this.activePatchSetId);
                if (!items.success) {
                    this.showError(items.error || 'Failed to load set items');
                    return;
                }
                const patches = (items.patches || []).filter(p => p && p.id);
                if (patches.length === 0) {
                    this.showError('Set is empty.');
                    return;
                }
                for (let i = 0; i < patches.length; i++) {
                    const p = patches[i];
                    this.setStatus(`Sending Set… (${i + 1}/${patches.length}) ${p.name}`);
                    // best-effort pacing
                    // eslint-disable-next-line no-await-in-loop
                    await window.atlas.sendPatch(this.currentDevice, p.id);
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise(r => setTimeout(r, 250));
                }
                this.setStatus('Set sent ✅');
            });
        }

        if (helpBtn && !helpBtn.dataset.wired) {
            helpBtn.dataset.wired = '1';
            helpBtn.addEventListener('click', async () => {
                const info = this.getActiveDeviceInfo();
                const portName = this.getActiveDevicePortName();
                const alias = this.getPortAliasLabel(portName);
                const manufacturer = info?.manufacturer && info.manufacturer !== 'Unknown' ? info.manufacturer : '';
                const q = [alias, manufacturer, portName, 'import', 'sysex'].filter(Boolean).join(' ');
                await this.openKnowledgeSearch(q);
            });
        }

        if (manualBtn && !manualBtn.dataset.wired) {
            manualBtn.dataset.wired = '1';
            manualBtn.addEventListener('click', async () => {
                await this.importManualForActiveDevice();
            });
        }

        if (importSetBtn && !importSetBtn.dataset.wired) {
            importSetBtn.dataset.wired = '1';
            importSetBtn.addEventListener('click', async () => {
                if (!window.atlas?.patchSetsImport) {
                    this.showError('Set import is not available in this build.');
                    return;
                }
                const devicePortName = this.getActiveDevicePortName();
                if (!devicePortName) {
                    this.showError('Connect a device first.');
                    return;
                }
                const res = await window.atlas.patchSetsImport(devicePortName);
                if (!res.success) {
                    this.showError(res.error || 'Import failed');
                    return;
                }
                if (res.canceled) return;
                this.setStatus(`Imported Set ✅ (${res.importedPatches || 0} patches)`);
                this.activePatchSetId = res.setId || this.activePatchSetId;
                await this.refreshDeviceLibrarian();
            });
        }

        if (captureBtn && !captureBtn.dataset.wired) {
            captureBtn.dataset.wired = '1';
            captureBtn.addEventListener('click', async () => {
                if (!this.currentDevice) {
                    this.showError('Connect a device first.');
                    return;
                }
                const info = this.getActiveDeviceInfo();
                const portName = this.getActiveDevicePortName();
                const mfg = info?.manufacturer || null;
                this.showDeviceImportModal(this.currentDevice, portName, { manufacturer: mfg });
            });
        }

        // Load device patches (hardware only for that deviceName)
        try {
            const pr = await window.atlas.searchPatches({ device: devicePortName, limit: null });
            const patches = pr.success ? (pr.patches || []) : [];
            this.devicePatches = patches.filter(p => (p.patchType !== 'plugin') && (!p.pluginId));
        } catch {
            this.devicePatches = [];
        }
        this.renderDevicePatchList();

        // Load Sets
        await this.renderDeviceSetList(devicePortName);
        await this.renderActiveSetItems();
    }

    renderDevicePatchList() {
        const el = document.getElementById('device-patch-list');
        if (!el) return;

        if (!this.devicePatches || this.devicePatches.length === 0) {
            el.innerHTML = `<div class="empty-state"><h3>No patches yet</h3><p>Import/backup patches from this device, then build Sets (bundles) here.</p></div>`;
            return;
        }

        el.innerHTML = '';
        for (const p of this.devicePatches) {
            const row = document.createElement('div');
            row.className = 'device-row';
            const checked = this.deviceSelectedPatchIds.has(p.id);
            row.innerHTML = `
                <input type="checkbox" class="device-row-check" data-patch-id="${this.escapeHtml(p.id)}" ${checked ? 'checked' : ''}/>
                <div>
                    <div class="device-row-title" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</div>
                    <div class="device-row-meta">${this.escapeHtml(p.category || 'Uncategorized')}${p.tags && p.tags.length ? ` • ${this.escapeHtml(p.tags.slice(0, 3).join(', '))}` : ''}</div>
                </div>
                <div class="device-row-actions">
                    <button class="btn-small btn-audition ${this.currentDevice ? '' : 'is-disabled'}" data-patch-id="${this.escapeHtml(p.id)}" ${this.currentDevice ? '' : 'disabled'} title="Audition (send + short note)">▶︎</button>
                </div>
            `;
            el.appendChild(row);
        }

        el.querySelectorAll('.device-row-check').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = String(e.target.getAttribute('data-patch-id') || '');
                if (!id) return;
                if (e.target.checked) this.deviceSelectedPatchIds.add(id);
                else this.deviceSelectedPatchIds.delete(id);
            });
        });

        // reuse audition handler
        el.querySelectorAll('.btn-audition').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = String(e.target.getAttribute('data-patch-id') || '');
                if (id) this.auditionPatchInline(id);
            });
        });
    }

    async renderDeviceSetList(deviceName) {
        const el = document.getElementById('device-set-list');
        if (!el) return;

        if (!window.atlas.patchSetsList) {
            el.innerHTML = `<div class="empty-state"><h3>Sets unavailable</h3><p>This build doesn’t expose Patch Sets APIs yet.</p></div>`;
            return;
        }

        const res = await window.atlas.patchSetsList(deviceName);
        const sets = res.success ? (res.sets || []) : [];

        if (sets.length === 0) {
            el.innerHTML = `<div class="empty-state"><h3>No Sets yet</h3><p>Create a Set to bundle patches for different setups.</p></div>`;
            this.activePatchSetId = null;
            return;
        }

        // If current selection is invalid, select the newest
        if (!this.activePatchSetId || !sets.some(s => s.id === this.activePatchSetId)) {
            this.activePatchSetId = sets[0].id;
        }

        el.innerHTML = '';
        for (const s of sets) {
            const row = document.createElement('div');
            row.className = 'device-row';
            row.style.cursor = 'pointer';
            const active = s.id === this.activePatchSetId;
            row.style.borderColor = active ? 'rgba(0, 212, 255, 0.35)' : '';
            row.style.background = active ? 'rgba(0, 212, 255, 0.06)' : '';
            row.innerHTML = `
                <div style="width:12px;height:12px;border-radius:999px;background:${active ? 'rgba(0,212,255,0.9)' : 'rgba(255,255,255,0.18)'};"></div>
                <div>
                    <div class="device-row-title">${this.escapeHtml(s.name)}</div>
                    <div class="device-row-meta">${this.escapeHtml(s.description || '')}</div>
                </div>
                <div class="device-row-actions">
                    <button class="btn-small btn-view" data-set-id="${this.escapeHtml(s.id)}" title="View set">View</button>
                </div>
            `;
            row.addEventListener('click', async () => {
                this.activePatchSetId = s.id;
                await this.renderDeviceSetList(deviceName);
                await this.renderActiveSetItems();
            });
            el.appendChild(row);
        }
    }

    async getActiveSetMeta() {
        const devicePortName = this.getActiveDevicePortName();
        if (!devicePortName || !this.activePatchSetId) return null;
        const res = await window.atlas.patchSetsList(devicePortName);
        if (!res.success) return null;
        return (res.sets || []).find(s => s.id === this.activePatchSetId) || null;
    }

    async renderActiveSetItems() {
        const el = document.getElementById('device-set-items');
        if (!el) return;
        if (!this.activePatchSetId) {
            el.innerHTML = '';
            return;
        }

        const res = await window.atlas.patchSetsItems(this.activePatchSetId);
        const patches = res.success ? (res.patches || []) : [];
        if (patches.length === 0) {
            el.innerHTML = `<div class="empty-state"><h3>Empty Set</h3><p>Select patches on the left and click “Add Selected”.</p></div>`;
            return;
        }

        el.innerHTML = '';
        for (const p of patches) {
            const row = document.createElement('div');
            row.className = 'device-row';
            row.setAttribute('draggable', 'true');
            row.dataset.patchId = String(p.id);
            row.innerHTML = `
                <div class="device-drag-handle" title="Drag to reorder">⋮⋮</div>
                <div>
                    <div class="device-row-title" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</div>
                    <div class="device-row-meta">${this.escapeHtml(p.category || 'Uncategorized')}</div>
                </div>
                <div class="device-row-actions">
                    <button class="btn-small btn-remove" data-patch-id="${this.escapeHtml(p.id)}" title="Remove from set">Remove</button>
                </div>
            `;
            el.appendChild(row);
        }

        // Drag/drop reorder
        this.wireSetReorderDnD(el);

        el.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const pid = String(e.target.getAttribute('data-patch-id') || '');
                if (!pid) return;
                const ok = confirm('Remove this patch from the Set?');
                if (!ok) return;
                const rr = await window.atlas.patchSetsRemove(this.activePatchSetId, pid);
                if (!rr.success) {
                    this.showError(rr.error || 'Remove failed');
                    return;
                }
                this.setStatus('Removed from Set ✅');
                await this.renderActiveSetItems();
            });
        });
    }

    wireSetReorderDnD(containerEl) {
        if (!containerEl || containerEl.dataset.dndWired) return;
        containerEl.dataset.dndWired = '1';

        let draggingId = null;

        const rows = () => Array.from(containerEl.querySelectorAll('.device-row[data-patch-id], .device-row')).filter(r => r.dataset && r.dataset.patchId);

        containerEl.addEventListener('dragstart', (e) => {
            const row = e.target?.closest?.('.device-row');
            if (!row || !row.dataset.patchId) return;
            draggingId = row.dataset.patchId;
            row.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', draggingId); } catch { /* ignore */ }
        });

        containerEl.addEventListener('dragend', (e) => {
            const row = e.target?.closest?.('.device-row');
            if (row) row.classList.remove('is-dragging');
            draggingId = null;
            rows().forEach(r => r.classList.remove('is-drag-over'));
        });

        containerEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const row = e.target?.closest?.('.device-row');
            if (!row || !row.dataset.patchId) return;
            rows().forEach(r => r.classList.remove('is-drag-over'));
            row.classList.add('is-drag-over');
        });

        containerEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            const targetRow = e.target?.closest?.('.device-row');
            if (!targetRow || !targetRow.dataset.patchId) return;
            const fromId = draggingId || (() => { try { return e.dataTransfer.getData('text/plain'); } catch { return null; } })();
            const toId = targetRow.dataset.patchId;
            if (!fromId || !toId || fromId === toId) return;

            const all = rows();
            const fromEl = all.find(r => r.dataset.patchId === fromId);
            const toEl = all.find(r => r.dataset.patchId === toId);
            if (!fromEl || !toEl) return;

            // Move DOM node
            const rect = toEl.getBoundingClientRect();
            const before = (e.clientY - rect.top) < rect.height / 2;
            containerEl.insertBefore(fromEl, before ? toEl : toEl.nextSibling);

            // Persist order
            if (!this.activePatchSetId || !window.atlas.patchSetsReorder) return;
            const ordered = rows().map(r => r.dataset.patchId);
            const res = await window.atlas.patchSetsReorder(this.activePatchSetId, ordered);
            if (!res.success) {
                this.showError(res.error || 'Reorder failed');
                return;
            }
            this.setStatus('Order updated ✅');
        });
    }
    
    /**
     * Show error
     */
    showError(message) {
        console.error('❌', message);
        this.setStatus('❌ ' + message);
    }
    
    /**
     * Placeholder methods
     */
    showNewPatchDialog() {
        alert('New patch dialog - Coming soon!');
    }
    
    importPatches() {
        alert('Import patches - Coming soon!');
    }
    
    exportPatches() {
        alert('Export patches - Coming soon!');
    }
    
    async backupCurrentDevice() {
        if (!this.currentDevice) {
            this.showError('No device selected');
            return;
        }
        
        this.setStatus('Backing up device...');
        const result = await window.atlas.backupDevice(this.currentDevice);
        
        if (result.success) {
            this.setStatus(`Backup complete: ${result.count} patches saved`);
        } else {
            this.showError('Backup failed: ' + result.error);
        }
    }
    
    editPatch(patchId) {
        alert('Edit patch ' + patchId + ' - Coming soon!');
    }
    
    disconnectFromDAW() {
        alert('Disconnect DAW - Coming soon!');
    }

    /**
     * Clear all patches from library
     */
    async clearLibrary() {
        const ok = confirm('Clear Library?\n\nThis will permanently delete ALL patches from ATLAS.\nThis cannot be undone.');
        if (!ok) return;

        this.setStatus('Clearing library…');
        try {
            const result = await window.atlas.clearLibrary();
            if (!result.success) {
                this.showError('Clear library failed: ' + (result.error || 'Unknown error'));
                return;
            }

            // Reset local state and refresh UI
            this.patches = [];
            await this.loadCategories();
            await this.loadPatches({});
            await this.refreshStatistics();

            this.setStatus(`Library cleared (${result.deleted || 0} patches) ✅`);
        } catch (e) {
            this.showError('Clear library error: ' + e.message);
        }
    }

    /**
     * Discover plugins
     */
    async discoverPlugins() {
        this.setStatus('Scanning for VST/AU plugins...');
        
        try {
            const result = await window.atlas.discoverPlugins();
            
            if (result.success) {
                this.allPlugins = result.plugins; // Store all plugins
                this.populatePluginVendorFilter();
                this.syncPluginFilterModeUI();
                this.applyPluginFilter(); // Apply current filter
                await this.refreshStatistics();
                this.setStatus(`Found ${result.plugins.length} plugin(s) ✅`);
            } else {
                this.showError('Plugin discovery failed: ' + result.error);
            }
        } catch (error) {
            this.showError('Plugin discovery error: ' + error.message);
        }
    }

    /**
     * Load plugins from database
     */
    async loadPlugins() {
        try {
            if (!window.atlas || !window.atlas.getPlugins) {
                console.warn('⚠️  Atlas API not available yet, skipping plugin load');
                return;
            }
            
            const result = await window.atlas.getPlugins();
            
            if (result.success) {
                this.allPlugins = result.plugins || []; // Store all plugins
                this.populatePluginVendorFilter();
                this.syncPluginFilterModeUI();
                this.applyPluginFilter(); // Apply current filter
                this.maybeEnrichPluginVendorsOnLaunch();
            } else {
                console.warn('⚠️  Failed to load plugins:', result.error);
            }
        } catch (error) {
            console.warn('⚠️  Error loading plugins:', error.message);
            // Don't show error to user - plugins are optional
        }
    }

    async maybeEnrichPluginVendorsOnLaunch() {
        try {
            const cfg = this.copilotConfig || this.getDefaultCopilotConfig();
            const mode = String(cfg.pluginVendorEnrichment || 'off');
            if (mode === 'off') return;
            if (!window.atlas?.pluginsEnrichVendors) return;

            // Needs web search config
            if (!cfg.searchProvider) return;
            if (cfg.searchProvider === 'serper' && !String(cfg.searchApiKey || '').trim()) return;
            if (cfg.searchProvider === 'searxng' && !String(cfg.searchBaseUrl || '').trim()) return;

            // only once per app session
            if (this._vendorEnrichPrompted) return;
            this._vendorEnrichPrompted = true;

            const unknownCount = (this.allPlugins || []).filter(p => !p.manufacturer || String(p.manufacturer).toLowerCase() === 'unknown').length;
            if (unknownCount === 0) return;

            if (mode === 'ask') {
                const ok = confirm(`Improve plugin vendor IDs?\n\nATLAS found ${unknownCount} plugin(s) with Unknown manufacturer.\n\nIf you continue, ATLAS will use your configured Web Search provider (${cfg.searchProvider}) to infer the vendor for up to ${cfg.pluginVendorEnrichmentLimit || 20} plugins and cache results locally.`);
                if (!ok) return;
            }

            this.setStatus('Enriching plugin vendors…');
            const res = await window.atlas.pluginsEnrichVendors({
                searchProvider: cfg.searchProvider,
                searchApiKey: cfg.searchApiKey,
                searchBaseUrl: cfg.searchBaseUrl,
                limit: cfg.pluginVendorEnrichmentLimit || 20
            });
            if (!res.success) {
                this.setStatus('Vendor enrichment failed (see settings)'); 
                return;
            }

            // Reload to pick up updated manufacturers
            const refreshed = await window.atlas.getPlugins();
            if (refreshed.success) {
                this.allPlugins = refreshed.plugins || [];
                this.populatePluginVendorFilter();
                this.syncPluginFilterModeUI();
                this.applyPluginFilter();
            }
            this.setStatus(`Vendor enrichment complete ✅ (${res.updated || 0} updated)`);
        } catch {
            // ignore
        }
    }
    
    /**
     * Apply plugin category filter
     */
    applyPluginFilter() {
        if (this.debug) {
            console.log('🔍 Applying plugin filter:', this.pluginCategoryFilter, 'search:', this.pluginSearchTerm);
            console.log('   Total plugins:', this.allPlugins.length);
        }
        
        if (this.pluginFilterMode === 'vendors' && this.pluginVendorFilter) {
            // Vendor filter (manufacturer)
            this.plugins = this.allPlugins.filter(p => String(p.manufacturer || 'Unknown') === this.pluginVendorFilter);
        } else if (this.pluginCategoryFilter && this.pluginCategoryFilter !== '') {
            // Filter plugins by selected category - STRICT MATCH ONLY
            this.plugins = this.allPlugins.filter(p => {
                const pluginCategory = p.category || 'unknown';
                const matches = pluginCategory === this.pluginCategoryFilter;
                return matches;
            });
            if (this.debug) console.log(`   ✅ Filtered to ${this.plugins.length} plugins in category "${this.pluginCategoryFilter}"`);
        } else {
            // Show all plugins if no filter
            this.plugins = [...this.allPlugins];
            if (this.debug) console.log('   ✅ Showing all plugins (no filter)');
        }

        // Apply plugin name search (post category filter)
        if (this.pluginSearchTerm) {
            this.plugins = this.plugins.filter(p => String(p.name || '').toLowerCase().includes(this.pluginSearchTerm));
        }

        this.renderPluginList();
    }

    setSelectedPlugin(pluginId) {
        this.selectedPluginId = pluginId;
        const plugin = this.allPlugins.find(p => p.id === pluginId);

        const bar = document.getElementById('plugin-action-bar');
        const nameEl = document.getElementById('selected-plugin-name');
        const hintEl = document.getElementById('plugin-action-hint');
        const extractBtn = document.getElementById('extract-selected');
        const viewPresetsBtn = document.getElementById('view-selected-presets');
        if (!bar || !nameEl || !hintEl) return;

        if (!plugin) {
            bar.style.display = 'none';
            return;
        }

        bar.style.display = 'block';
        nameEl.textContent = plugin.name;

        const isShell = (() => {
            const n = String(plugin?.name || '').toLowerCase();
            const t = String(plugin?.type || '').toLowerCase();
            return n.includes(' shell') || n.includes('vst3 shell') || n.includes('audio unit shell') || t.includes('shell');
        })();

        // UX hint: we only extract file-based presets
        if (isShell) {
            hintEl.textContent = 'Shell/container plugin detected. Shells host multiple sub-plugins and typically do not expose file-based presets for extraction.';
            if (extractBtn) {
                extractBtn.disabled = true;
                extractBtn.classList.add('is-disabled');
                extractBtn.title = 'Extraction disabled for shell/container plugins';
            }
            if (viewPresetsBtn) {
                viewPresetsBtn.disabled = true;
                viewPresetsBtn.classList.add('is-disabled');
                viewPresetsBtn.title = 'Shell/container plugins do not expose extractable preset files';
            }
        } else if ((plugin.presetCount || 0) === 0) {
            hintEl.textContent = 'No preset files detected on disk for this plugin (some plugins store presets internally).';
            if (extractBtn) {
                extractBtn.disabled = false;
                extractBtn.classList.remove('is-disabled');
                extractBtn.title = '';
            }
            if (viewPresetsBtn) {
                viewPresetsBtn.disabled = false;
                viewPresetsBtn.classList.remove('is-disabled');
                viewPresetsBtn.title = 'View extracted presets for this plugin';
            }
        } else {
            hintEl.textContent = `Preset files detected: ${this.formatPresetCount(plugin.presetCount)} (extraction is capped per run).`;
            if (extractBtn) {
                extractBtn.disabled = false;
                extractBtn.classList.remove('is-disabled');
                extractBtn.title = '';
            }
            if (viewPresetsBtn) {
                viewPresetsBtn.disabled = false;
                viewPresetsBtn.classList.remove('is-disabled');
                viewPresetsBtn.title = 'View extracted presets for this plugin';
            }
        }
    }

    async extractSelectedPlugin() {
        if (!this.selectedPluginId) {
            this.showError('Select a plugin first.');
            return;
        }

        const limitEl = document.getElementById('extract-limit');
        const limit = limitEl ? Number(limitEl.value) : 25;

        const plugin = this.allPlugins.find(p => p.id === this.selectedPluginId);
        const pluginName = plugin ? plugin.name : 'plugin';

        const isShell = (() => {
            const n = String(plugin?.name || '').toLowerCase();
            const t = String(plugin?.type || '').toLowerCase();
            return n.includes(' shell') || n.includes('vst3 shell') || n.includes('audio unit shell') || t.includes('shell');
        })();
        if (isShell) {
            this.showError('This is a shell/container plugin. It does not have extractable preset files. (Try selecting the actual plugin inside your DAW, or scan for the non-shell plugin bundle if it exists.)');
            return;
        }

        this.setStatus(`Extracting presets from ${pluginName}…`);
        try {
            const result = await window.atlas.extractPluginPresets(this.selectedPluginId, { limit });
            if (!result.success) {
                this.showError(result.error || 'Extraction failed');
                return;
            }

            const saved = result.savedCount ?? (result.presets?.length || 0);
            this.setStatus(`Extracted ${saved} preset(s) from ${pluginName} ✅`);
            await this.reloadPatchesAfterExtraction();
        } catch (e) {
            this.showError(`Extraction error: ${e.message}`);
        }
    }

    formatPresetCount(presetCount) {
        const n = Number(presetCount || 0);
        if (!Number.isFinite(n) || n <= 0) return '';
        if (n >= 1000) return '1000+ presets';
        if (n >= 500) return '500+ presets';
        return `${n} preset${n === 1 ? '' : 's'}`;
    }

    getPluginInitials(plugin) {
        const manufacturer = String(plugin?.manufacturer || '').trim();
        const name = String(plugin?.name || '').trim();
        const base = manufacturer && manufacturer !== 'Unknown' ? manufacturer : name;
        if (!base) return 'PL';
        const parts = base.split(/\s+/).filter(Boolean);
        const initials = (parts.length >= 2 ? (parts[0][0] + parts[1][0]) : base.slice(0, 2)).toUpperCase();
        return initials.replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'PL';
    }

    getPluginIconHtml(plugin) {
        const initials = this.getPluginInitials(plugin);
        const fallback = `<div class="plugin-avatar-fallback" aria-hidden="true">${this.escapeHtml(initials)}</div>`;

        if (plugin?.iconPath) {
            const fileUrl = `file://${String(plugin.iconPath).replace(/\\/g, '/')}`;
            const safeUrl = encodeURI(fileUrl);
            // Always render fallback; if img loads, it covers it. If it fails, fallback remains.
            return `
                ${fallback}
                <img class="plugin-icon-img" src="${safeUrl}" alt="" loading="lazy"
                     onload="this.previousElementSibling && this.previousElementSibling.classList.add('is-hidden');"
                     onerror="this.style.display='none';">
            `;
        }

        return fallback;
    }

    getPluginTooltipText(plugin) {
        const name = String(plugin?.name || '').trim() || 'Unknown Plugin';
        const manufacturer = String(plugin?.manufacturer || '').trim() || 'Unknown';
        const type = String(plugin?.type || '').trim() || 'Unknown';
        const category = String(plugin?.category || 'unknown').trim() || 'unknown';
        const presetCount = Number.isFinite(Number(plugin?.presetCount)) ? Number(plugin.presetCount) : 0;
        const id = String(plugin?.id || '').trim() || '(none)';
        const pluginPath = String(plugin?.path || '').trim() || '(unknown path)';

        // Multi-line tooltips work with the native title attribute on macOS.
        return [
            `Name: ${name}`,
            `Manufacturer: ${manufacturer}`,
            `Type: ${type}`,
            `Category: ${category}`,
            `Presets: ${presetCount}`,
            `ID: ${id}`,
            `Path: ${pluginPath}`
        ].join('\n');
    }

    /**
     * Render plugin list
     */
    renderPluginList() {
        const pluginList = document.getElementById('plugin-list');
        if (!pluginList) return;

        // Update global collapse toggle icon
        const toggleBtn = document.getElementById('toggle-plugin-categories');
        if (toggleBtn) {
            const allCollapsed = ['instrument', 'fx', 'outboard', 'guitar', 'miditools', 'mastering', 'analyzer', 'saturation', 'synth', 'sampler', 'drum', 'unknown']
                .every(k => this.isPluginCategoryCollapsed(k));
            toggleBtn.textContent = allCollapsed ? '▸' : '▾';
        }

        if (this.plugins.length === 0) {
            const filterText = this.pluginCategoryFilter 
                ? `No ${this.getCategoryDisplayName(this.pluginCategoryFilter)} plugins found`
                : 'No plugins found';
            
            pluginList.innerHTML = `
                <div class="empty-state">
                    <p>${filterText}</p>
                    ${!this.pluginCategoryFilter ? `
                        <button class="btn-primary" id="discover-plugins-inline">
                            Scan for Plugins
                        </button>
                    ` : ''}
                </div>
            `;
            const btn = document.getElementById('discover-plugins-inline');
            if (btn) {
                btn.addEventListener('click', () => this.discoverPlugins());
            }
            return;
        }

        pluginList.innerHTML = '';
        
        // If a filter is active, show only that category (no grouping needed)
        if (this.pluginCategoryFilter && this.pluginCategoryFilter !== '') {
            const category = this.pluginCategoryFilter;
            const info = this.getCategoryInfo(category);
            
            // Add category header
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'plugin-category-header';
            categoryHeader.innerHTML = `
                <span class="category-icon">${info.icon}</span>
                <div class="category-info">
                    <div class="category-name">${info.name}</div>
                    <div class="category-desc">${info.desc}</div>
                </div>
                <span class="category-count">${this.plugins.length}</span>
            `;
            pluginList.appendChild(categoryHeader);
            
            // Render only filtered plugins
            this.plugins.forEach(plugin => {
                this.renderPluginCard(plugin, pluginList);
            });
        } else {
            // No filter: group by category
            const pluginsByCategory = {
                'instrument': [],
                'fx': [],
                'outboard': [],
                'guitar': [],
                'miditools': [],
                'mastering': [],
                'analyzer': [],
                'saturation': [],
                'synth': [],
                'sampler': [],
                'drum': [],
                'unknown': []
            };
            
            this.plugins.forEach(plugin => {
                const category = plugin.category || 'unknown';
                if (pluginsByCategory[category]) {
                    pluginsByCategory[category].push(plugin);
                } else {
                    pluginsByCategory['unknown'].push(plugin);
                }
            });
            
            // Render plugins grouped by category
            Object.entries(pluginsByCategory).forEach(([category, plugins]) => {
                if (plugins.length === 0) return;
                
                const info = this.getCategoryInfo(category);
                const collapsed = this.isPluginCategoryCollapsed(category);
                
                // Add category header
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'plugin-category-header';
                categoryHeader.setAttribute('role', 'button');
                categoryHeader.setAttribute('tabindex', '0');
                categoryHeader.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                categoryHeader.dataset.category = category;
                categoryHeader.innerHTML = `
                    <span class="category-icon">${info.icon}</span>
                    <div class="category-info">
                        <div class="category-name">${info.name}</div>
                        <div class="category-desc">${info.desc}</div>
                    </div>
                    <span class="category-count">${plugins.length}</span>
                    <span class="plugin-category-chevron" aria-hidden="true">${collapsed ? '▸' : '▾'}</span>
                `;
                pluginList.appendChild(categoryHeader);

                const body = document.createElement('div');
                body.className = 'plugin-category-body';
                body.dataset.categoryBody = category;
                body.style.display = collapsed ? 'none' : '';
                pluginList.appendChild(body);

                const toggle = () => {
                    const nowCollapsed = !(body.style.display === 'none') ? true : false;
                    body.style.display = nowCollapsed ? 'none' : '';
                    this.setPluginCategoryCollapsed(category, nowCollapsed);
                    categoryHeader.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
                    const chev = categoryHeader.querySelector('.plugin-category-chevron');
                    if (chev) chev.textContent = nowCollapsed ? '▸' : '▾';
                    // update global icon
                    const t = document.getElementById('toggle-plugin-categories');
                    if (t) {
                        const allCollapsed2 = ['instrument', 'fx', 'outboard', 'guitar', 'miditools', 'mastering', 'analyzer', 'saturation', 'synth', 'sampler', 'drum', 'unknown']
                            .every(k => this.isPluginCategoryCollapsed(k));
                        t.textContent = allCollapsed2 ? '▸' : '▾';
                    }
                };

                categoryHeader.addEventListener('click', toggle);
                categoryHeader.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                });
                
                plugins.forEach(plugin => {
                    this.renderPluginCard(plugin, body);
                });
            });
        }
    }
    
    /**
     * Get category info
     */
    getCategoryInfo(category) {
        const categoryInfo = {
            'instrument': { name: 'Instruments', icon: '🎹', desc: 'Synths, Samplers, Drum Machines' },
            'fx': { name: 'FX', icon: '✨', desc: 'Reverbs, Delays, Modulation' },
            'outboard': { name: 'Signal Processing', icon: '🎚️', desc: 'Compressors, EQs, Preamps, Channel Strips' },
            'guitar': { name: 'Guitar', icon: '🎸', desc: 'Amp Sims, Pedals, Cabinets' },
            'miditools': { name: 'MIDI Tools', icon: '🎵', desc: 'Scalers, Chord Tools, MIDI Utilities' },
            'mastering': { name: 'Mastering', icon: '🎛️', desc: 'Limiters, Multiband, Stereo Tools' },
            'analyzer': { name: 'Analyzer', icon: '📊', desc: 'Spectrum, Phase, LUFS Meters' },
            'saturation': { name: 'Saturation', icon: '🔥', desc: 'Tape, Tube, Distortion, Harmonic Enhancers' },
            'synth': { name: 'Synth', icon: '🎹', desc: 'Dedicated Synthesizer Plugins' },
            'sampler': { name: 'Sampler', icon: '📦', desc: 'Samplers and Sample Players' },
            'drum': { name: 'Drum', icon: '🥁', desc: 'Drum Machines and Drum Plugins' },
            'unknown': { name: 'Other', icon: '🔌', desc: 'Uncategorized Plugins' }
        };
        return categoryInfo[category] || categoryInfo['unknown'];
    }
    
    /**
     * Get category display name
     */
    getCategoryDisplayName(category) {
        return this.getCategoryInfo(category).name;
    }
    
    /**
     * Get patch category icon
     */
    getPatchCategoryIcon(category) {
        const icons = {
            'Lead': '🎹',
            'Bass': '🎸',
            'Pad': '☁️',
            'Keys': '🎹',
            'Drums': '🥁',
            'FX/Textures': '✨',
            'Brass': '🎺',
            'Strings': '🎻',
            'Woodwind': '🎵',
            'Vocals': '🎤',
            'Sequences': '🔁',
            'Ambient': '🌌',
            'Imported': '📥',
            'Plugin Preset': '🔌',
            'Uncategorized': '❓'
        };
        return icons[category] || '❓';
    }
    
    /**
     * Get patch category description
     */
    getPatchCategoryDescription(category) {
        const descriptions = {
            'Lead': 'Melodic leads, plucks, arps',
            'Bass': 'Sub, 808, acid, synth bass',
            'Pad': 'Ambient, atmospheric, strings',
            'Keys': 'Piano, organ, rhodes, vintage keys',
            'Drums': 'Kicks, snares, percussion, drum machines',
            'FX/Textures': 'Risers, impacts, sweeps, noise',
            'Brass': 'Horns, trumpets, trombones',
            'Strings': 'Orchestral strings, violins, cellos',
            'Woodwind': 'Flutes, clarinets, saxophones',
            'Vocals': 'Vocal synths, vocoders, choirs',
            'Sequences': 'Arpeggiated, sequenced patterns',
            'Ambient': 'Drones, textures, soundscapes',
            'Imported': 'Patches imported from devices',
            'Plugin Preset': 'Presets from VST/AU plugins',
            'Uncategorized': 'Uncategorized patches'
        };
        return descriptions[category] || 'Uncategorized patches';
    }
    
    /**
     * Render a single plugin card
     */
    renderPluginCard(plugin, container) {
        const category = plugin.category || 'unknown';
        const info = this.getCategoryInfo(category);
        const typeLabel = plugin.type || 'VST3';
        const avatarTitle = this.getPluginTooltipText(plugin);
        
        const presetLabel = this.formatPresetCount(plugin.presetCount);
        const pluginCard = document.createElement('div');
        const selected = this.selectedPluginId === plugin.id;
        pluginCard.className = `plugin-row plugin-category-${category} ${selected ? 'is-selected' : ''}`;
        pluginCard.setAttribute('role', 'button');
        pluginCard.setAttribute('tabindex', '0');
        pluginCard.innerHTML = `
            <div class="plugin-row-left">
                <div class="plugin-avatar" title="${this.escapeHtml(avatarTitle)}" aria-label="${this.escapeHtml(avatarTitle)}">
                    ${this.getPluginIconHtml(plugin)}
                </div>
                <span class="plugin-category-badge" title="${info.name}">${info.icon}</span>
                <div class="plugin-row-text">
                    <div class="plugin-row-name">${this.escapeHtml(plugin.name)}</div>
                    <div class="plugin-row-sub">
                        <span class="plugin-type ${typeLabel.toLowerCase()}">${typeLabel}</span>
                        <span class="plugin-manufacturer">${this.escapeHtml(String(plugin.manufacturer || 'Unknown'))}</span>
                        <button class="plugin-vendor-fix-btn" type="button" data-plugin-id="${this.escapeHtml(plugin.id)}" title="Fix vendor (manufacturer)">✎</button>
                    </div>
                </div>
            </div>
            <div class="plugin-row-right">
                ${presetLabel ? `<span class="plugin-count-badge">${presetLabel}</span>` : `<span class="plugin-count-badge is-empty">No preset files</span>`}
            </div>
        `;
        
        container.appendChild(pluginCard);

        const onSelect = () => {
            this.setSelectedPlugin(plugin.id);
            // re-render to update selection highlight without moving scroll too much
            this.renderPluginList();
        };

        pluginCard.addEventListener('click', onSelect);
        pluginCard.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Double-click = extract (pro workflow)
            const n = String(plugin?.name || '').toLowerCase();
            const t = String(plugin?.type || '').toLowerCase();
            const isShell = n.includes(' shell') || n.includes('vst3 shell') || n.includes('audio unit shell') || t.includes('shell');
            if (isShell) {
                this.showError('Shell/container plugin: no extractable preset files.');
                return;
            }

            // Select first (updates action bar), then extract using current limit
            this.selectedPluginId = plugin.id;
            this.setSelectedPlugin(plugin.id);
            this.extractSelectedPlugin();
        });
        pluginCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
            }
        });

        const fixBtn = pluginCard.querySelector('.plugin-vendor-fix-btn');
        if (fixBtn) {
            fixBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pid = String(fixBtn.getAttribute('data-plugin-id') || '').trim();
                if (pid) this.showPluginVendorFixModal(pid);
            });
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Extract presets from plugin
     */
    async extractPluginPresets(pluginId) {
        console.log('🔍 Extract button clicked for plugin:', pluginId);
        
        const plugin = this.plugins.find(p => p.id === pluginId);
        if (!plugin) {
            console.error('❌ Plugin not found in UI plugins array:', pluginId);
            this.showError(`Plugin not found: ${pluginId}`);
            return;
        }
        
        const pluginName = plugin.name;
        console.log(`📥 Extracting presets from ${pluginName} (${pluginId})...`);
        
        this.setStatus(`Extracting presets from ${pluginName}...`);
        
        try {
            if (!window.atlas || !window.atlas.extractPluginPresets) {
                throw new Error('ATLAS API not available');
            }
            
            const result = await window.atlas.extractPluginPresets(pluginId);
            console.log('📥 Extract result:', result);
            
            if (result.success) {
                const count = result.presets?.length || 0;
                const savedCount = result.savedCount !== undefined ? result.savedCount : count;
                const errorCount = result.errorCount || 0;
                
                console.log(`📊 Extraction summary:`, {
                    extracted: count,
                    saved: savedCount,
                    errors: errorCount
                });
                
                if (count === 0) {
                    console.warn(`⚠️  No presets found for ${pluginName}`);
                    this.setStatus(`No presets found in ${pluginName} ⚠️`);
                    if (result.warning) {
                        this.showError(result.warning);
                    }
                } else if (savedCount === 0 && errorCount > 0) {
                    // All saves failed
                    console.error(`❌ Extraction succeeded but ALL saves failed (${errorCount} errors)`);
                    
                    // Log detailed error information
                    if (result.saveErrors && result.saveErrors.length > 0) {
                        console.error('📋 Detailed save errors:');
                        result.saveErrors.forEach((err, idx) => {
                            console.error(`   Error ${idx + 1} - Preset: ${err.presetName}`);
                            console.error(`      Error: ${err.error}`);
                            if (err.details) {
                                console.error(`      Details: ${err.details}`);
                            }
                        });
                    }
                    
                    this.setStatus(`Extraction failed: Could not save presets ❌`);
                    const errorMsg = result.saveErrors && result.saveErrors.length > 0 
                        ? `Failed to save: ${result.saveErrors[0].error}`
                        : `Failed to save ${count} preset(s). Check console for details.`;
                    this.showError(errorMsg);
                } else if (savedCount < count) {
                    // Some saves failed
                    console.warn(`⚠️  Partial success: Saved ${savedCount}/${count} presets (${errorCount} errors)`);
                    this.setStatus(`Saved ${savedCount}/${count} preset(s) from ${pluginName} ⚠️`);
                    if (errorCount > 0) {
                        this.showError(`${errorCount} preset(s) failed to save. Check console for details.`);
                    }
                    
                    // Reload patches to show the ones that were saved
                    await this.reloadPatchesAfterExtraction();
                } else {
                    // All saves succeeded
                    console.log(`✅ Successfully extracted and saved ${savedCount} preset(s) from ${pluginName}`);
                    this.setStatus(`Extracted ${savedCount} preset(s) from ${pluginName} ✅`);
                    
                    // Reload patches to show newly extracted presets
                    await this.reloadPatchesAfterExtraction();
                }
            } else {
                console.error('❌ Extract failed:', result.error);
                this.showError('Failed to extract presets: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('❌ Extract error:', error);
            this.showError('Error extracting presets: ' + error.message);
        }
    }

    /**
     * Filter patches by type
     */
    async filterByType(type) {
        this.viewMode = type;
        const query = type === 'all' ? {} : { patchType: type };
        await this.loadPatches(query);
    }
    
    /**
     * Reload patches after extraction
     */
    async reloadPatchesAfterExtraction() {
        // Clear any active filters to show all patches
        const categoryFilter = document.getElementById('category-filter');
        const deviceFilter = document.getElementById('device-filter');
        if (categoryFilter) categoryFilter.value = '';
        if (deviceFilter) deviceFilter.value = '';
        
        // Reload ALL patches (no filters) to show newly extracted presets
        console.log('🔄 Reloading patches after extraction...');
        await this.loadPatches({}); // Empty query = load all patches
        await this.refreshStatistics();
        
        // Verify patches were loaded
        console.log(`📊 Patches after reload: ${this.patches.length}`);
        if (this.patches.length === 0) {
            console.warn('⚠️  No patches found after extraction. This might indicate a save issue.');
        } else {
            console.log(`✅ Found ${this.patches.length} patch(es) in database`);
        }
    }
}

// Initialize UI when ready
const atlasUI = new AtlasUI();

window.addEventListener('DOMContentLoaded', async () => {
    await atlasUI.initialize();
});
