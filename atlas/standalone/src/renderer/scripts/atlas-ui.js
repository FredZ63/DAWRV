/**
 * ATLAS UI Controller
 * Manages the main user interface
 */

class AtlasUI {
    constructor() {
        this.currentDevice = null;
        this.patches = [];
        this.devices = [];
        this.protocolInfo = null;
        this.dawConnected = false;
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
        
        // Load initial data
        await this.refreshStatistics();
        await this.loadPatches();
        
        console.log('✅ ATLAS UI ready');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Device discovery
        document.getElementById('discover-devices').addEventListener('click', () => {
            this.discoverDevices();
        });
        
        document.getElementById('refresh-devices').addEventListener('click', () => {
            this.discoverDevices();
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
            this.renderDeviceList();
            this.setStatus(`Found ${result.devices.length} device(s)`);
        } else {
            this.showError('Device discovery failed: ' + result.error);
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
        const outputs = this.devices.filter(d => d.type === 'output');
        
        outputs.forEach(device => {
            const deviceCard = document.createElement('div');
            deviceCard.className = 'device-card';
            deviceCard.innerHTML = `
                <div class="device-info">
                    <div class="device-name">${device.name}</div>
                    <div class="device-meta">
                        <span class="device-manufacturer">${device.manufacturer || 'Unknown'}</span>
                        <span class="device-protocol ${device.protocol === 'MIDI 2.0' ? 'midi2' : 'midi1'}">
                            ${device.protocol || 'MIDI 1.0'}
                        </span>
                    </div>
                </div>
                <div class="device-actions">
                    <button class="btn-small btn-connect" data-device-id="${device.id}">
                        Connect
                    </button>
                </div>
            `;
            
            deviceList.appendChild(deviceCard);
            
            // Add connect handler
            deviceCard.querySelector('.btn-connect').addEventListener('click', () => {
                this.connectDevice(device.id);
            });
        });
    }
    
    /**
     * Connect to device
     */
    async connectDevice(deviceId) {
        this.setStatus('Connecting to device...');
        
        const result = await window.atlas.connectDevice(deviceId);
        
        if (result.success) {
            this.currentDevice = deviceId;
            this.setStatus('Device connected');
            this.updateSelectedDevice(deviceId);
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
            this.patches = result.patches;
            this.renderPatchBrowser();
        }
    }
    
    /**
     * Render patch browser
     */
    renderPatchBrowser() {
        const browser = document.getElementById('patch-browser');
        
        if (this.patches.length === 0) {
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
            patchCard.innerHTML = `
                <div class="patch-header">
                    <h3 class="patch-name">${patch.name}</h3>
                    <div class="patch-rating">${'⭐'.repeat(patch.rating || 0)}</div>
                </div>
                <div class="patch-meta">
                    <span class="patch-device">${patch.device}</span>
                    <span class="patch-category">${patch.category || 'Uncategorized'}</span>
                </div>
                <div class="patch-tags">
                    ${(patch.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="patch-actions">
                    <button class="btn-small btn-send" data-patch-id="${patch.id}">
                        Send to Device
                    </button>
                    <button class="btn-small btn-edit" data-patch-id="${patch.id}">
                        Edit
                    </button>
                </div>
            `;
            
            grid.appendChild(patchCard);
            
            // Add event handlers
            patchCard.querySelector('.btn-send').addEventListener('click', () => {
                this.sendPatchToDevice(patch.id);
            });
            
            patchCard.querySelector('.btn-edit').addEventListener('click', () => {
                this.editPatch(patch.id);
            });
        });
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
        
        const query = {};
        if (category) query.category = category;
        if (device) query.device = device;
        
        await this.loadPatches(query);
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
        if (device) {
            document.getElementById('selected-device').textContent = device.name;
        }
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
}

// Initialize UI when ready
const atlasUI = new AtlasUI();

window.addEventListener('DOMContentLoaded', async () => {
    await atlasUI.initialize();
});
