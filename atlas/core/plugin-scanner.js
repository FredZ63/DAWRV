/**
 * ATLAS Plugin Scanner
 * Discovers and manages VST3/AU plugin presets
 * Supports both hardware and software instrument presets
 */

const fs = require('fs');
const path = require('path');

class PluginScanner {
    constructor() {
        this.pluginPaths = this.getStandardPluginPaths();
        this.discoveredPlugins = [];
        this.pluginPresets = new Map(); // pluginId -> presets[]
        // Hard cap per plugin so we never end up with “5000 presets” type nonsense
        this.maxPresetFilesPerPlugin = 500;
        // Hard cap for deep bundle scans (safety/perf)
        this.maxPluginBundlesPerFormat = 4000;
        this.maxPluginScanDepth = 6;
    }

    /**
     * Recursively collect plugin bundles within a directory.
     * macOS vendors often nest bundles in subfolders (Manufacturer/Product/.../*.vst3).
     */
    collectPluginBundles(rootDir, bundleExt, out, { max = this.maxPluginBundlesPerFormat, depth = this.maxPluginScanDepth } = {}) {
        if (!rootDir || !fs.existsSync(rootDir)) return;
        if (out.length >= max) return;
        if (depth < 0) return;

        let entries;
        try {
            entries = fs.readdirSync(rootDir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (out.length >= max) return;
            const fullPath = path.join(rootDir, entry.name);
            try {
                if (entry.isDirectory()) {
                    if (entry.name.endsWith(bundleExt)) {
                        out.push(fullPath);
                    } else {
                        this.collectPluginBundles(fullPath, bundleExt, out, { max, depth: depth - 1 });
                    }
                } else if (entry.isSymbolicLink && entry.isSymbolicLink()) {
                    // ignore symlinks to avoid cycles
                }
            } catch {
                // ignore
            }
        }
    }

    getMacBundleIdentifier(bundlePath) {
        try {
            if (!bundlePath || process.platform !== 'darwin') return null;
            const plistPath = path.join(bundlePath, 'Contents', 'Info.plist');
            if (!fs.existsSync(plistPath)) return null;
            const plist = fs.readFileSync(plistPath, 'utf8');
            const m = plist.match(/<key>\s*CFBundleIdentifier\s*<\/key>\s*<string>\s*([^<]+)\s*<\/string>/i);
            return m && m[1] ? String(m[1]).trim() : null;
        } catch {
            return null;
        }
    }

    /**
     * Best-effort: read AU AudioComponents manufacturer (often 4-char code) from Info.plist
     */
    getAUComponentManufacturerCode(bundlePath) {
        try {
            if (!bundlePath || process.platform !== 'darwin') return null;
            const plistPath = path.join(bundlePath, 'Contents', 'Info.plist');
            if (!fs.existsSync(plistPath)) return null;
            const plist = fs.readFileSync(plistPath, 'utf8');
            const audioComponentsIdx = plist.toLowerCase().indexOf('audiocomponents');
            if (audioComponentsIdx < 0) return null;
            const slice = plist.slice(audioComponentsIdx, audioComponentsIdx + 6000);
            const m = slice.match(/<key>\s*manufacturer\s*<\/key>\s*<string>\s*([^<]+)\s*<\/string>/i);
            return m && m[1] ? String(m[1]).trim() : null;
        } catch {
            return null;
        }
    }

    /**
     * Smart manufacturer detection:
     * 1) Strong name-based map (fast)
     * 2) macOS bundle identifier inference (CFBundleIdentifier)
     * 3) AU manufacturer 4-char code inference (limited)
     */
    detectManufacturerSmart({ name, type, path: pluginPath } = {}) {
        const displayName = String(name || '').trim();

        // Strong overrides (name/path) BEFORE generic name heuristics.
        // Prevent mis-tagging things like "UAD Roland ..." as Roland.
        const dn = displayName.toLowerCase();
        const pth = String(pluginPath || '').toLowerCase();
        if (dn.startsWith('uad ') || dn.startsWith('uaudio_') || dn.includes('universal audio') || pth.includes('/universal audio/')) {
            return 'Universal Audio';
        }

        const guess = this.guessManufacturer(displayName);
        if (guess && guess !== 'Unknown') return guess;

        // Bundle identifier inference (macOS)
        const bid = this.getMacBundleIdentifier(pluginPath);
        const idLower = String(bid || '').toLowerCase();
        if (idLower) {
            const idMap = [
                { re: /(^|[.])output([.]|$)/i, name: 'Output' },
                { re: /(^|[.])roland([.]|$)|(^|[.])jp[.]co[.]roland([.]|$)/i, name: 'Roland' },
                { re: /(^|[.])korg([.]|$)/i, name: 'Korg' },
                { re: /(^|[.])gforcesoftware([.]|$)|(^|[.])gforce([.]|$)/i, name: 'GForce' },
                { re: /(^|[.])native[-.]?instruments|(^|[.])ni[.]/i, name: 'Native Instruments' },
                { re: /(^|[.])arturia/i, name: 'Arturia' },
                { re: /(^|[.])spectrasonics/i, name: 'Spectrasonics' },
                { re: /(^|[.])uhe|(^|[.])u-he/i, name: 'u-he' },
                { re: /(^|[.])xfer/i, name: 'Xfer' },
                { re: /(^|[.])waves/i, name: 'Waves' },
                { re: /(^|[.])fabfilter/i, name: 'FabFilter' },
                { re: /(^|[.])soundtoys/i, name: 'Soundtoys' },
                { re: /(^|[.])valhalladsp|(^|[.])valhalla/i, name: 'Valhalla DSP' },
                { re: /(^|[.])izotope|(^|[.])iZotope/i, name: 'iZotope' },
                { re: /(^|[.])softube/i, name: 'Softube' },
                { re: /(^|[.])slate|(^|[.])slatedigital/i, name: 'Slate Digital' },
                { re: /(^|[.])brainworx|(^|[.])plugin[-.]alliance/i, name: 'Plugin Alliance' },
                { re: /(^|[.])universal[-.]audio|(^|[.])uaudio|(^|[.])uad/i, name: 'Universal Audio' }
            ];
            const hit = idMap.find(x => x.re.test(idLower));
            if (hit) return hit.name;

            // Generic fallback: infer vendor from bundle id segments
            // Examples:
            // - jp.co.roland.zenology -> roland
            // - com.korg.m1 -> korg
            // - com.gforcesoftware.mtronpro -> gforcesoftware -> GForce
            const parts = idLower.split('.').filter(Boolean);
            const stop = new Set(['com', 'net', 'org', 'io', 'app', 'edu', 'gov', 'co', 'jp', 'uk', 'de', 'fr', 'au', 'us']);
            const core = parts.filter(p => !stop.has(p));
            const candidate = core.length ? core[0] : '';
            if (candidate && candidate.length >= 3) {
                const special = {
                    'gforcesoftware': 'GForce',
                    'gforce': 'GForce',
                    'roland': 'Roland',
                    'korg': 'Korg',
                    'output': 'Output',
                    'uaudio': 'Universal Audio',
                    'uad': 'Universal Audio'
                };
                if (special[candidate]) return special[candidate];
                // Title-case default
                return candidate.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
        }

        // AU 4-char manufacturer codes (best-effort)
        const t = String(type || '').toUpperCase();
        if (t === 'AU') {
            const code = String(this.getAUComponentManufacturerCode(pluginPath) || '').toLowerCase();
            const codeMap = {
                'aufx': null, // type, not manufacturer
                'aumu': null,
                'outp': 'Output' // common-ish guess; not guaranteed
            };
            if (code && codeMap[code]) return codeMap[code];
        }

        return 'Unknown';
    }

    isInstrumentFamilyCategory(category) {
        const c = String(category || '').toLowerCase();
        return c === 'instrument' || c === 'synth' || c === 'sampler' || c === 'drum';
    }

    getPluginFormatLabel(baseType, category) {
        const t = String(baseType || '').toUpperCase();
        const inst = this.isInstrumentFamilyCategory(category);
        if (t === 'VST2') return inst ? 'VSTi' : 'VST';
        if (t === 'VST3') return inst ? 'VST3i' : 'VST3';
        if (t === 'AU') return inst ? 'AUi' : 'AU';
        return String(baseType || 'Plugin');
    }

    /**
     * Recursively collect preset files from a directory with a hard cap to avoid huge scans.
     */
    collectPresetFiles(rootDir, extsRegex, out, maxFiles = this.maxPresetFilesPerPlugin) {
        if (!rootDir || !fs.existsSync(rootDir)) return;
        if (out.length >= maxFiles) return;

        let entries;
        try {
            entries = fs.readdirSync(rootDir, { withFileTypes: true });
        } catch (e) {
            return;
        }

        for (const entry of entries) {
            if (out.length >= maxFiles) return;
            const fullPath = path.join(rootDir, entry.name);

            try {
                if (entry.isDirectory()) {
                    this.collectPresetFiles(fullPath, extsRegex, out, maxFiles);
                } else if (entry.isFile()) {
                    if (extsRegex.test(entry.name)) {
                        out.push(fullPath);
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    }

    /**
     * Extra vendor/user preset locations (macOS-centric).
     * UA/UADx presets often live outside the plugin bundle.
     */
    getVendorPresetLocations(pluginDisplayName, pluginIdOrSlug) {
        const home = process.env.HOME || process.env.USERPROFILE;
        const locations = [];
        if (!home) return locations;

        const candidates = [
            // Universal Audio / UA Connect common locations (varies by product)
            path.join(home, 'Library', 'Application Support', 'Universal Audio'),
            path.join(home, 'Library', 'Application Support', 'Universal Audio', 'Presets'),
            path.join(home, 'Library', 'Application Support', 'Universal Audio', 'UADx'),
            path.join(home, 'Library', 'Application Support', 'Universal Audio', 'UADx', 'Presets'),
            path.join(home, 'Documents', 'Universal Audio'),
            path.join(home, 'Documents', 'Universal Audio', 'Presets'),
            '/Library/Application Support/Universal Audio',
            '/Library/Application Support/Universal Audio/Presets',
            '/Users/Shared/Universal Audio',
            '/Users/Shared/Universal Audio/Presets'
        ];

        // If a specific subfolder exists, prioritize it.
        const nameVariants = [pluginDisplayName, pluginIdOrSlug]
            .filter(Boolean)
            .map(s => String(s));

        for (const base of candidates) {
            for (const v of nameVariants) {
                locations.push(path.join(base, v));
            }
        }

        return locations;
    }

    /**
     * Get standard plugin installation paths
     */
    getStandardPluginPaths() {
        const paths = {
            vst3: [],
            au: [],
            vst2: []
        };

        const home = process.env.HOME || process.env.USERPROFILE;

        if (process.platform === 'darwin') {
            // macOS paths
            paths.vst3.push(
                path.join(home, 'Library/Audio/Plug-Ins/VST3'),
                '/Library/Audio/Plug-Ins/VST3'
            );
            paths.au.push(
                path.join(home, 'Library/Audio/Plug-Ins/Components'),
                '/Library/Audio/Plug-Ins/Components'
            );
            paths.vst2.push(
                path.join(home, 'Library/Audio/Plug-Ins/VST'),
                '/Library/Audio/Plug-Ins/VST'
            );
        } else if (process.platform === 'win32') {
            // Windows paths
            const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
            const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
            
            paths.vst3.push(
                path.join(programFiles, 'Common Files', 'VST3'),
                path.join(programFilesX86, 'Common Files', 'VST3')
            );
            paths.vst2.push(
                path.join(programFiles, 'VSTPlugins'),
                path.join(programFilesX86, 'VSTPlugins')
            );
        } else if (process.platform === 'linux') {
            // Linux paths
            paths.vst3.push(
                path.join(home, '.vst3'),
                '/usr/lib/vst3',
                '/usr/local/lib/vst3'
            );
            paths.vst2.push(
                path.join(home, '.vst'),
                '/usr/lib/vst',
                '/usr/local/lib/vst'
            );
        }

        return paths;
    }

    /**
     * Discover all plugins in standard locations
     */
    async discoverPlugins() {
        console.log('🔌 Scanning for VST/AU plugins...');
        
        const plugins = [];
        
        // Scan VST3 plugins
        for (const vst3Path of this.pluginPaths.vst3) {
            if (fs.existsSync(vst3Path)) {
                const vst3Plugins = this.scanVST3Plugins(vst3Path);
                plugins.push(...vst3Plugins);
            }
        }

        // Scan AU plugins (macOS only)
        if (process.platform === 'darwin') {
            for (const auPath of this.pluginPaths.au) {
                if (fs.existsSync(auPath)) {
                    const auPlugins = this.scanAUPlugins(auPath);
                    plugins.push(...auPlugins);
                }
            }
        }

        // Scan VST2 plugins
        for (const vst2Path of this.pluginPaths.vst2) {
            if (fs.existsSync(vst2Path)) {
                const vst2Plugins = this.scanVST2Plugins(vst2Path);
                plugins.push(...vst2Plugins);
            }
        }

        this.discoveredPlugins = plugins;
        
        console.log(`✅ Found ${plugins.length} plugins:`);
        plugins.forEach(p => {
            console.log(`   - ${p.name} (${p.type})`);
        });

        return {
            success: true,
            plugins: plugins,
            count: plugins.length
        };
    }

    /**
     * Scan VST3 plugins (macOS bundles or Windows directories)
     */
    scanVST3Plugins(vst3Path) {
        const plugins = [];
        
        try {
            const bundlePaths = [];
            this.collectPluginBundles(vst3Path, '.vst3', bundlePaths);
            for (const fullPath of bundlePaths) {
                const pluginName = path.basename(fullPath);
                const pluginInfo = this.getVST3Info(fullPath, pluginName);
                if (pluginInfo) plugins.push(pluginInfo);
            }
        } catch (error) {
            console.warn(`⚠️  Error scanning VST3 path ${vst3Path}:`, error.message);
        }

        return plugins;
    }

    /**
     * Get VST3 plugin information
     */
    getVST3Info(pluginPath, pluginName) {
        try {
            // Extract display name (remove .vst3 extension)
            const displayName = pluginName.replace(/\.vst3$/, '');
            
            // Check for presets in common locations
            const presetPaths = this.findVST3PresetPaths(pluginPath);

            // Best-effort icon discovery (macOS bundles)
            const iconSourcePath = process.platform === 'darwin' ? this.findMacBundleIconSource(pluginPath) : null;

            const category = this.detectPluginTypeSmart({ name: displayName, type: 'VST3', path: pluginPath });
            const manufacturer = this.detectManufacturerSmart({ name: displayName, type: 'VST3', path: pluginPath });
            
            return {
                id: `vst3-${displayName.toLowerCase().replace(/\s+/g, '-')}`,
                name: displayName,
                type: this.getPluginFormatLabel('VST3', category),
                path: pluginPath,
                manufacturer,
                category,
                presetPaths: presetPaths,
                presetCount: presetPaths.length,
                iconSourcePath: iconSourcePath,
                iconPath: null
            };
        } catch (error) {
            console.warn(`⚠️  Error reading VST3 plugin ${pluginPath}:`, error.message);
            return null;
        }
    }

    /**
     * Best-effort: find an icon file inside a macOS plugin bundle.
     * Returns a path to an icon-like file if found (.icns/.png/.tiff).
     */
    findMacBundleIconSource(bundlePath) {
        try {
            const resources = path.join(bundlePath, 'Contents', 'Resources');
            if (!fs.existsSync(resources)) return null;

            // Try Info.plist for CFBundleIconFile
            const plistPath = path.join(bundlePath, 'Contents', 'Info.plist');
            if (fs.existsSync(plistPath)) {
                try {
                    const plist = fs.readFileSync(plistPath, 'utf8');
                    const m = plist.match(/<key>\s*CFBundleIconFile\s*<\/key>\s*<string>\s*([^<]+)\s*<\/string>/i);
                    if (m && m[1]) {
                        let iconFile = m[1].trim();
                        if (!iconFile.toLowerCase().endsWith('.icns')) iconFile += '.icns';
                        const iconPath = path.join(resources, iconFile);
                        if (fs.existsSync(iconPath)) return iconPath;
                    }
                } catch (e) {
                    // ignore plist read errors
                }
            }

            // Fallback: pick an icon-ish file from Resources
            const files = fs.readdirSync(resources, { withFileTypes: true })
                .filter(d => d.isFile())
                .map(d => d.name);

            const candidates = files.filter(n => n.toLowerCase().endsWith('.icns'));
            const pngs = files.filter(n => n.toLowerCase().endsWith('.png'));
            const tiffs = files.filter(n => n.toLowerCase().endsWith('.tiff') || n.toLowerCase().endsWith('.tif'));

            const pickPreferred = (arr) =>
                arr.find(n => n.toLowerCase().includes('icon')) ||
                arr.find(n => n.toLowerCase().includes('app')) ||
                arr[0];

            let preferred = null;
            if (candidates.length) preferred = pickPreferred(candidates);
            else if (pngs.length) preferred = pickPreferred(pngs);
            else if (tiffs.length) preferred = pickPreferred(tiffs);
            else return null;

            return path.join(resources, preferred);
        } catch (e) {
            return null;
        }
    }

    /**
     * Find VST3 preset file paths
     * Checks both plugin bundle and user preset folders
     */
    findVST3PresetPaths(pluginPath) {
        const presetPaths = [];
        const home = process.env.HOME || process.env.USERPROFILE;
        
        // Extract plugin name for user preset folder lookup
        const pluginName = path.basename(pluginPath, '.vst3');
        const pluginSlug = pluginName.toLowerCase();
        
        // Common VST3 preset locations (in plugin bundle)
        const bundlePresetLocations = [
            path.join(pluginPath, 'Contents', 'Resources', 'Presets'),
            path.join(pluginPath, 'Presets'),
            path.join(pluginPath, 'Contents', 'Presets')
        ];
        
        // User preset folders (where plugins often store user-created presets)
        const userPresetLocations = [];
        if (home) {
            if (process.platform === 'darwin') {
                // macOS user preset locations
                userPresetLocations.push(
                    path.join(home, 'Library/Audio/Presets', pluginName),
                    path.join(home, 'Library/Application Support', pluginName, 'Presets'),
                    path.join(home, 'Documents', pluginName, 'Presets')
                );

                // Some vendors store VST3 presets under a manufacturer folder in Audio/Presets.
                // Try: ~/Library/Audio/Presets/*/<pluginName>
                const audioPresetsRoot = path.join(home, 'Library/Audio/Presets');
                if (fs.existsSync(audioPresetsRoot)) {
                    try {
                        const vendorDirs = fs.readdirSync(audioPresetsRoot, { withFileTypes: true })
                            .filter(d => d.isDirectory())
                            .map(d => path.join(audioPresetsRoot, d.name));
                        for (const vd of vendorDirs) {
                            userPresetLocations.push(path.join(vd, pluginName));
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            } else if (process.platform === 'win32') {
                // Windows user preset locations
                userPresetLocations.push(
                    path.join(home, 'Documents', pluginName, 'Presets'),
                    path.join(home, 'AppData', 'Roaming', pluginName, 'Presets')
                );
            }
        }

        // Vendor-specific locations (UA/UADx etc.)
        if (process.platform === 'darwin' && (pluginSlug.startsWith('uaudio_') || pluginSlug.includes('universal audio') || pluginSlug.includes('uad'))) {
            userPresetLocations.push(...this.getVendorPresetLocations(pluginName, pluginSlug));
        }
        
        const exts = /\.(vstpreset|fxp|fxb|preset|aupreset|fzi)$/i;

        // Search bundle locations
        for (const presetLoc of bundlePresetLocations) {
            this.collectPresetFiles(presetLoc, exts, presetPaths);
        }
        
        // Search user preset locations
        for (const presetLoc of userPresetLocations) {
            this.collectPresetFiles(presetLoc, exts, presetPaths);
        }

        // Roland Cloud / ZENOLOGY packs (.fzi) live under Application Support, not Audio/Presets.
        if (home && process.platform === 'darwin') {
            const n = pluginName.toLowerCase();
            const isZenology = n === 'zenology' || n === 'zenology fx' || n.includes('zenology');
            if (isZenology) {
                const rcRoot = path.join(home, 'Library', 'Application Support', 'Roland Cloud');
                const dirs = [
                    path.join(rcRoot, 'ZENOLOGY'),
                    path.join(rcRoot, 'ZENOLOGY FX')
                ];
                for (const d of dirs) {
                    this.collectPresetFiles(d, exts, presetPaths);
                }
            }
        }

        return presetPaths;
    }

    /**
     * Scan AU plugins (macOS only)
     */
    scanAUPlugins(auPath) {
        const plugins = [];
        
        try {
            const bundlePaths = [];
            this.collectPluginBundles(auPath, '.component', bundlePaths);
            for (const fullPath of bundlePaths) {
                const pluginName = path.basename(fullPath);
                const pluginInfo = this.getAUInfo(fullPath, pluginName);
                if (pluginInfo) plugins.push(pluginInfo);
            }
        } catch (error) {
            console.warn(`⚠️  Error scanning AU path ${auPath}:`, error.message);
        }

        return plugins;
    }

    /**
     * Get AU plugin information
     */
    getAUInfo(pluginPath, pluginName) {
        try {
            const displayName = pluginName.replace(/\.component$/, '');
            
            // Check for presets
            const presetPaths = this.findAUPresetPaths(pluginPath);

            const iconSourcePath = process.platform === 'darwin' ? this.findMacBundleIconSource(pluginPath) : null;

            const category = this.detectPluginTypeSmart({ name: displayName, type: 'AU', path: pluginPath });
            const manufacturer = this.detectManufacturerSmart({ name: displayName, type: 'AU', path: pluginPath });
            
            return {
                id: `au-${displayName.toLowerCase().replace(/\s+/g, '-')}`,
                name: displayName,
                type: this.getPluginFormatLabel('AU', category),
                path: pluginPath,
                manufacturer,
                category,
                presetPaths: presetPaths,
                presetCount: presetPaths.length,
                iconSourcePath: iconSourcePath,
                iconPath: null
            };
        } catch (error) {
            console.warn(`⚠️  Error reading AU plugin ${pluginPath}:`, error.message);
            return null;
        }
    }

    /**
     * Find AU preset file paths
     */
    findAUPresetPaths(pluginPath) {
        const presetPaths = [];
        const home = process.env.HOME || process.env.USERPROFILE;
        
        // Common AU preset locations
        const presetLocations = [
            path.join(pluginPath, 'Contents', 'Resources', 'Presets'),
            path.join(pluginPath, 'Presets'),
            home ? path.join(home, 'Library/Audio/Presets', path.basename(pluginPath, '.component')) : null
        ];

        const pluginName = path.basename(pluginPath, '.component');
        const pluginSlug = pluginName.toLowerCase();

        // AU presets are usually in: ~/Library/Audio/Presets/<Manufacturer>/<PluginName>/*.aupreset
        if (home && process.platform === 'darwin') {
            const audioPresetsRoot = path.join(home, 'Library/Audio/Presets');
            if (fs.existsSync(audioPresetsRoot)) {
                try {
                    const vendorDirs = fs.readdirSync(audioPresetsRoot, { withFileTypes: true })
                        .filter(d => d.isDirectory())
                        .map(d => path.join(audioPresetsRoot, d.name));
                    for (const vd of vendorDirs) {
                        presetLocations.push(path.join(vd, pluginName));
                    }
                } catch (e) {
                    // ignore
                }
            }

            // Vendor-specific locations (UA/UADx etc.)
            if (pluginSlug.startsWith('uaudio_') || pluginSlug.includes('universal audio') || pluginSlug.includes('uad')) {
                presetLocations.push(...this.getVendorPresetLocations(pluginName, pluginSlug));
            }
        }

        const exts = /\.(aupreset|preset|vstpreset|fxp|fxb|fzi)$/i;
        for (const presetLoc of presetLocations.filter(Boolean)) {
            this.collectPresetFiles(presetLoc, exts, presetPaths);
        }

        // Roland Cloud / ZENOLOGY packs (.fzi) live under Application Support, not Audio/Presets.
        if (home && process.platform === 'darwin') {
            const n = pluginName.toLowerCase();
            const isZenology = n === 'zenology' || n === 'zenology fx' || n.includes('zenology');
            if (isZenology) {
                const rcRoot = path.join(home, 'Library', 'Application Support', 'Roland Cloud');
                const dirs = [
                    path.join(rcRoot, 'ZENOLOGY'),
                    path.join(rcRoot, 'ZENOLOGY FX')
                ];
                for (const d of dirs) {
                    this.collectPresetFiles(d, exts, presetPaths);
                }
            }
        }

        return presetPaths;
    }

    /**
     * Scan VST2 plugins (legacy)
     */
    scanVST2Plugins(vst2Path) {
        const plugins = [];
        
        try {
            if (process.platform === 'win32') {
                const entries = fs.readdirSync(vst2Path, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(vst2Path, entry.name);
                    if (entry.isFile() && entry.name.endsWith('.dll')) {
                        const pluginInfo = this.getVST2Info(fullPath, entry.name);
                        if (pluginInfo) plugins.push(pluginInfo);
                    }
                }
            } else {
                const bundlePaths = [];
                this.collectPluginBundles(vst2Path, '.vst', bundlePaths);
                for (const fullPath of bundlePaths) {
                    const pluginName = path.basename(fullPath);
                    const pluginInfo = this.getVST2Info(fullPath, pluginName);
                    if (pluginInfo) plugins.push(pluginInfo);
                }
            }
        } catch (error) {
            console.warn(`⚠️  Error scanning VST2 path ${vst2Path}:`, error.message);
        }

        return plugins;
    }

    /**
     * Get VST2 plugin information
     */
    getVST2Info(pluginPath, pluginName) {
        try {
            const displayName = pluginName.replace(/\.(dll|vst)$/, '');
            const category = this.detectPluginTypeSmart({ name: displayName, type: 'VST2', path: pluginPath });
            const manufacturer = this.detectManufacturerSmart({ name: displayName, type: 'VST2', path: pluginPath });
            
            return {
                id: `vst2-${displayName.toLowerCase().replace(/\s+/g, '-')}`,
                name: displayName,
                type: this.getPluginFormatLabel('VST2', category),
                path: pluginPath,
                manufacturer,
                category,
                presetPaths: [],
                presetCount: 0
            };
        } catch (error) {
            console.warn(`⚠️  Error reading VST2 plugin ${pluginPath}:`, error.message);
            return null;
        }
    }

    /**
     * Best-effort: read AU component type from Info.plist (macOS).
     * Common values:
     * - aumu: MusicDevice (instrument)
     * - aufx: Effect
     * - aumf: MusicEffect
     * - aumx: MIDI processor/effect
     */
    getAUComponentType(bundlePath) {
        try {
            if (!bundlePath || process.platform !== 'darwin') return null;
            const plistPath = path.join(bundlePath, 'Contents', 'Info.plist');
            if (!fs.existsSync(plistPath)) return null;
            const plist = fs.readFileSync(plistPath, 'utf8');

            // Very lightweight parse: look for AudioComponents dict and a <key>type</key><string>XXXX</string>
            const audioComponentsIdx = plist.toLowerCase().indexOf('audiocomponents');
            if (audioComponentsIdx < 0) return null;
            const slice = plist.slice(audioComponentsIdx, audioComponentsIdx + 6000);
            const m = slice.match(/<key>\s*type\s*<\/key>\s*<string>\s*([^<]+)\s*<\/string>/i);
            if (!m || !m[1]) return null;
            return String(m[1]).trim();
        } catch {
            return null;
        }
    }

    /**
     * Smart plugin category detect:
     * 1) Use name keyword rules (detectPluginType)
     * 2) If unknown and AU, use AudioUnit component type hints from bundle Info.plist
     */
    detectPluginTypeSmart({ name, type, path: pluginPath } = {}) {
        const displayName = String(name || '').trim();
        const byName = this.detectPluginType(displayName || 'unknown');
        if (byName && byName !== 'unknown') return byName;

        const t = String(type || '').toUpperCase();
        if (t === 'AU') {
            const auType = this.getAUComponentType(pluginPath);
            const au = String(auType || '').toLowerCase();
            if (au === 'aumu' || au === 'aumi') return 'instrument';
            if (au === 'aumf') return 'fx';
            if (au === 'aufx' || au === 'aufd' || au === 'aufm' || au === 'aufc') return 'fx';
            if (au === 'aumx') return 'miditools';
        }

        return 'unknown';
    }

    /**
     * Guess manufacturer from plugin name
     */
    guessManufacturer(name) {
        const manufacturers = {
            'Arcade': 'Output',
            'OUTPUT': 'Output',
            'Zenology': 'Roland',
            'ZENOLOGY': 'Roland',
            'Roland': 'Roland',
            'Korg': 'Korg',
            'GForce': 'GForce',
            'GForce Software': 'GForce',
            'Serum': 'Xfer',
            'Massive': 'Native Instruments',
            'Massive X': 'Native Instruments',
            'Kontakt': 'Native Instruments',
            'Reaktor': 'Native Instruments',
            'FM8': 'Native Instruments',
            'Absynth': 'Native Instruments',
            'Omnisphere': 'Spectrasonics',
            'Keyscape': 'Spectrasonics',
            'Trilian': 'Spectrasonics',
            'Diva': 'u-he',
            'Zebra': 'u-he',
            'Hive': 'u-he',
            'Bazille': 'u-he',
            'Pigments': 'Arturia',
            'V Collection': 'Arturia',
            'Analog Lab': 'Arturia',
            'Sylenth': 'LennarDigital',
            'Spire': 'Reveal Sound',
            'Phase Plant': 'Kilheff',
            'Vital': 'Matt Tytel',
            'Surge': 'Surge Synth Team',
            'Helm': 'Matt Tytel',
            'TAL': 'TAL Software',
            'Tone2': 'Tone2',
            'Synth1': 'Daichi',
            'Dexed': 'Dexed Team',
            'OB-Xd': 'DSP56300',
            'PG-8X': 'MLVST',
            'TyrellN6': 'u-he',
            'Loop': 'Loop',
            'Track': 'Loop',
            'UAD': 'Universal Audio',
            'UVI': 'UVI',
            'Arturia': 'Arturia',
            'Native Instruments': 'Native Instruments'
        };
        
        for (const [key, value] of Object.entries(manufacturers)) {
            if (String(name || '').toLowerCase().includes(String(key).toLowerCase())) {
                return value;
            }
        }
        
        return 'Unknown';
    }

    /**
     * Detect plugin category/type
     * Returns: 'instrument', 'fx', 'outboard', 'guitar', 'miditools', 'mastering', 
     *          'analyzer', 'saturation', 'synth', 'sampler', 'drum', or 'unknown'
     * 
     * IMPORTANT: Check order matters! More specific categories should be checked first.
     * We check outboard BEFORE instruments because "UAD" plugins are mostly outboard gear.
     */
    detectPluginType(name) {
        const nameLower = name.toLowerCase();
        
        // UAD plugins are almost always outboard gear (unless specifically an instrument)
        // Check this FIRST before other keywords
        if (nameLower.startsWith('uad ') || nameLower.startsWith('uaudio_')) {
            // Check if it's a known UAD instrument (rare)
            const uadInstruments = ['minimoog', 'polymax', 'opal'];
            for (const inst of uadInstruments) {
                if (nameLower.includes(inst)) {
                    return 'instrument';
                }
            }
            // Otherwise, UAD = outboard gear
            return 'outboard';
        }
        
        // Analyzer tools (check early - very specific)
        const analyzerKeywords = [
            'analyzer', 'analyser', 'spectrum', 'spectral', 'fft', 'oscilloscope',
            'phase meter', 'correlation', 'stereo field', 'lufs', 'loudness',
            'rms', 'peak meter', 'vu meter', 'frequency analyzer', 'eq analyzer',
            'spatial analyzer', 'panorama', 'goniometer', 'vectorscope',
            'insight', 'meter', 'monitor', 'measurement', 'visualizer'
        ];
        
        for (const keyword of analyzerKeywords) {
            if (nameLower.includes(keyword)) {
                return 'analyzer';
            }
        }
        
        // Mastering tools (check early - specific category)
        const masteringKeywords = [
            'mastering', 'master', 'loudness', 'lufs', 'limiter', 'maximizer',
            'multiband', 'stereo widener', 'stereo enhancer', 'stereo tool',
            'mastering suite', 'mastering chain', 'master bus', 'mastering eq',
            'mastering compressor', 'mastering limiter', 'ozone', 't-racks',
            'masterdesk', 'l2', 'l3', 'l4', 'l7', 'l8', 'pro-l', 'pro-mb',
            'pro-q', 'pro-g', 'pro-c', 'pro-ds', 'pro-r', 'pro-l2', 'pro-mb2',
            'bx_masterdesk', 'bx_digital', 'bx_subsynth', 'bx_refinement',
            'precision limiter', 'precision maximizer', 'precision multiband',
            'fabfilter pro-l', 'fabfilter pro-mb', 'fabfilter pro-q',
            'brainworx masterdesk', 'brainworx digital', 'brainworx subsynth'
        ];
        
        for (const keyword of masteringKeywords) {
            if (nameLower.includes(keyword)) {
                return 'mastering';
            }
        }
        
        // Saturation/Distortion (check before outboard)
        const saturationKeywords = [
            'saturation', 'saturator', 'tape', 'tube', 'valve', 'distortion',
            'overdrive', 'fuzz', 'bit crusher', 'decimator', 'lo-fi', 'lofi',
            'vintage', 'warmth', 'harmonic', 'exciter', 'enhancer', 'vintage',
            'tape machine', 'tape saturator', 'tape emulation', 'tube emulation',
            'valve emulation', 'saturation plugin', 'saturator plugin',
            'culture vulture', 'vertigo', 'vsc-2', 'vsm-3', 'elysia', 'alpha',
            'bx_saturator', 'bx_tuner', 'studer', 'ampex', 'atr-102', 'oxide tape',
            'galaxy tape', 'tape color', 'tape chorus', 'tape delay', 'tape flanger',
            'ep-34', 'korg sdd-3000', 'roland re-201', 'roland dimension',
            'roland ce-1', 'ada flanger', 'ada std-1', 'dytronics', 'cyclosonic',
            'tri-stereo', 'mxr flanger', 'dreamverb', 'realverb', 'lexicon',
            'emt', 'akg bx', 'ams rmx', 'capitol chambers', 'hitsville chambers',
            'ocean way', 'sound city', 'putnam', 'sphere', 'hemisphere',
            'ocean way mic', 'vinyl', 'sparkverb', 'supercharger'
        ];
        
        for (const keyword of saturationKeywords) {
            if (nameLower.includes(keyword)) {
                return 'saturation';
            }
        }
        
        // MIDI Tools (check early - these are very specific)
        const midiToolsKeywords = [
            'scaler', 'chord', 'klimper', 'midi tool', 'midi utility', 'midi helper',
            'chord prism', 'chord king', 'chord progression', 'scale', 'arpeggiator',
            'arp', 'midi fx', 'midifx', 'midi effect', 'midi processor',
            'harmony', 'voicing', 'progression', 'scale generator', 'chord generator',
            'midi modifier', 'midi transformer', 'midi mapper', 'midi router',
            'key finder', 'chord finder', 'scale finder', 'harmony engine',
            'concept midifx', 'concept midi_fx', 'conceptmidifx', 'notonik',
            'claptrap', 'co-producer', 'ring the alarm', 'ripchord', 'tempo'
        ];
        
        for (const keyword of midiToolsKeywords) {
            if (nameLower.includes(keyword)) {
                return 'miditools';
            }
        }
        
        // Sampler (check before instruments)
        const samplerKeywords = [
            'sampler', 'sample', 'kontakt', 'halion', 'exs24', 'esx24',
            'battery', 'sitala', 'mpc', 'maschine', 'beatmaker', 'beat machine',
            'drum sampler', 'sample player', 'sample library', 'sample pack',
            'sample based', 'sample instrument', 'sample synth', 'sample engine',
            'sample workstation', 'sample sequencer', 'sample drum machine'
        ];
        
        for (const keyword of samplerKeywords) {
            if (nameLower.includes(keyword)) {
                return 'sampler';
            }
        }
        
        // Drum machines/plugins (check before instruments)
        const drumKeywords = [
            'drum machine', 'drum plugin', 'drum synth', 'drum synthesizer',
            'drum module', 'drum sequencer', 'drum pattern', 'drum kit',
            'drum pad', 'drum rack', 'drum set', 'drum kit', 'drum library',
            'drum sample', 'drum sample pack', 'drum sample library',
            'drum sample player', 'drum sample engine', 'drum sample workstation',
            'drum sample sequencer', 'drum sample synth', 'drum sample synthesizer',
            'bfdplayer', 'electric', 'velvet', 'vintage', 'wavestation',
            'galaxias', 'hybrid', 'noble', 'rx1200', 'vsdsx', 'vprom',
            'zenology', 'xv-5080', 'jv-1080', 'd-50', 'jd-800', 'conceptvsti',
            'sitala', 'mpc', 'maschine', 'beatmaker', 'beat machine'
        ];
        
        for (const keyword of drumKeywords) {
            if (nameLower.includes(keyword)) {
                return 'drum';
            }
        }
        
        // Dedicated Synth plugins (check before general instruments)
        const synthKeywords = [
            'synth', 'synthesizer', 'vsti', 'serum', 'massive', 'diva', 'zebra',
            'hive', 'bazille', 'omnisphere', 'keyscape', 'trilian', 'pigments',
            'analog lab', 'sylenth', 'spire', 'phase plant', 'vital', 'surge',
            'helm', 'reaktor', 'falcon', 'uviworkstation', 'm1', 'triton',
            'juno', 'jupiter', 'prophet', 'moog', 'minimoog', 'polymax', 'op-x',
            'ob-xtrm', 'triplecheese', 'tyrell', 'dexed', 'pg-8x', 'synth1',
            'arcade', 'mpc', 'sitala', 'bfdplayer', 'electric', 'velvet',
            'vintage', 'wavestation', 'galaxias', 'hybrid', 'noble', 'rx1200',
            'vsdsx', 'vprom', 'zenology', 'xv-5080', 'jv-1080', 'd-50', 'jd-800',
            'conceptvsti', 'uad minimoog', 'uad polymax', 'uad opal'
        ];
        
        for (const keyword of synthKeywords) {
            if (nameLower.includes(keyword)) {
                return 'synth';
            }
        }
        
        // Outboard/Studio gear (compressors, EQs, preamps, channel strips)
        // Check BEFORE instruments to catch things like "Empirical Labs Distressor"
        const outboardKeywords = [
            'compressor', 'limiter', 'gate', 'expander', 'de-esser', 'multiband',
            'eq', 'equalizer', 'eqp', 'meq', 'hlf', 'pultec', 'neve', 'api',
            'ssl', 'manley', 'fairchild', 'teletronix', 'la-2', 'la-3', '1176',
            'distressor', 'fatso', 'variable mu', 'massive passive', 'voxbox',
            'channel strip', 'vision channel', 'e channel', 'g bus', 'precision',
            'oxford', 'shadow hills', 'tube-tech', 'summit', 'dbx', 'empirical',
            'spl', 'transient', 'twin tube', 'vitalizer', 'dangerous', 'bax',
            'maag', 'millennia', 'harrison', 'helios', 'trident', 'chandler',
            'curve bender', 'zener', 'gav19t', 'cooper time', 'little labs',
            'ibp', 'vog', 'tonelux', 'tilt', 'thermionic', 'culture vulture',
            'vertigo', 'vsc-2', 'vsm-3', 'elysia', 'alpha', 'mpressor',
            'bx_digital', 'bx_masterdesk', 'bx_saturator', 'bx_subsynth',
            'bx_refinement', 'bx_tuner', 'mdweq', 'precision buss',
            'precision channel', 'precision de-esser', 'precision enhancer',
            'precision equalizer', 'precision k-stereo', 'precision limiter',
            'precision maximizer', 'precision multiband', 'precision reflection',
            'pultec-pro', 'pure plate', 'studer', 'ampex', 'atr-102', 'oxide tape',
            'galaxy tape echo', 'co-producer', 'scaler audio', 'scaler control',
            'scaler2', 'scaler3 audio', 'scaler3 control', 'scaler3',
            'concept midifx', 'concept midi_fx', 'conceptmidifx'
        ];
        
        // Guitar effects (amp sims, pedals, cabinets)
        const guitarKeywords = [
            'amp', 'amplifier', 'guitar', 'gtr', 'cabinet', 'cab', 'speaker',
            'pedal', 'overdrive', 'distortion', 'fuzz', 'wah', 'tubescreamer',
            'ts808', 'marshall', 'fender', 'vox', 'orange', 'mesa', 'boogie',
            'peavey', 'soldano', 'bogner', 'friedman', 'suhr', 'diezel',
            'engl', 'fuchs', 'train', 'overdrive supreme', 'dream amp',
            'lion amp', 'ruby amp', 'sound city studios', 'revalver',
            'guitar rig', 'bass amp', 'metal amp', 'vintage amp', 'half-stack',
            'bluesbreaker', 'plexi', 'silver jubilee', 'jmp', 'tweed deluxe',
            'b15n', 'svt', 'svt3pro', 'svtvr', 'gallien krueger', 'eden',
            'wt800', '800rb', 'ampeg', 'ibanez', 'tube screamer', 'ts overdrive',
            'roland', 'ce-1', 'dimension d', 're-201', 'bermuda triangle',
            'c-suite', 'c-axe', 'c-max', 'c-vox', 'cs-1', 'cambridge',
            'hemisphere mic', 'putnam mic', 'sphere mic', 'ocean way mic',
            'dream amp', 'lion amp', 'ruby amp', 'sound city studios'
        ];
        
        // FX plugins (reverbs, delays, modulation, etc.)
        const fxKeywords = [
            'reverb', 'delay', 'echo', 'chorus', 'flanger', 'phaser', 'tremolo',
            'vibrato', 'modulation', 'shimmer', 'space', 'room', 'hall', 'plate',
            'spring', 'convolution', 'impulse', 'ir ', 'impulse response',
            'portal', 'raum', 'raums', 'sparkverb', 'shade', 'thermal', 'thorus',
            'replika', 'movement', 'phasor', 'brigade', 'studio d chorus',
            'tape chorus', 'tape delay', 'tape flanger', 'tape color',
            'galaxy tape', 'ep-34', 'korg sdd-3000', 'roland re-201',
            'roland dimension', 'roland ce-1', 'ada flanger', 'ada std-1',
            'dytronics', 'cyclosonic', 'tri-stereo', 'mxr flanger',
            'dreamverb', 'realverb', 'lexicon', 'emt', 'akg bx', 'ams rmx',
            'capitol chambers', 'hitsville chambers', 'ocean way',
            'sound city', 'putnam', 'sphere', 'hemisphere', 'ocean way mic',
            'vinyl', 'sparkverb', 'supercharger', 'ring the alarm', 'ripchord'
        ];
        
        // Check outboard FIRST (before instruments to catch "Empirical Labs", "Little Labs", etc.)
        for (const keyword of outboardKeywords) {
            if (nameLower.includes(keyword)) {
                return 'outboard';
            }
        }
        
        // Check for guitar effects
        for (const keyword of guitarKeywords) {
            if (nameLower.includes(keyword)) {
                return 'guitar';
            }
        }
        
        // Check for FX
        for (const keyword of fxKeywords) {
            if (nameLower.includes(keyword)) {
                return 'fx';
            }
        }
        
        // General instruments (catch-all for anything that makes sound but doesn't fit other categories)
        // Check LAST because many keywords are generic (e.g., "lab" appears in many plugin names)
        const instrumentKeywords = [
            'vsti', 'instrument', 'keyscape', 'trilian', 'analog lab',
            'reaktor', 'falcon', 'uviworkstation', 'm1', 'triton', 'juno',
            'jupiter', 'prophet', 'moog', 'minimoog', 'polymax', 'op-x',
            'ob-xtrm', 'triplecheese', 'tyrell', 'dexed', 'pg-8x', 'synth1',
            'arcade', 'bfdplayer', 'electric', 'velvet', 'vintage', 'wavestation',
            'galaxias', 'hybrid', 'noble', 'rx1200', 'vsdsx', 'vprom',
            'zenology', 'xv-5080', 'jv-1080', 'd-50', 'jd-800', 'conceptvsti'
        ];
        
        // Check for general instruments LAST (many generic keywords)
        for (const keyword of instrumentKeywords) {
            if (nameLower.includes(keyword)) {
                return 'instrument';
            }
        }
        
        // Default to unknown if we can't categorize
        return 'unknown';
    }

    /**
     * Extract presets from a plugin
     */
    async extractPresets(pluginId) {
        const plugin = this.discoveredPlugins.find(p => p.id === pluginId);
        
        if (!plugin) {
            console.error(`❌ Plugin ${pluginId} not found in discoveredPlugins`);
            return { success: false, error: 'Plugin not found' };
        }

        console.log(`🔍 Extracting presets for plugin: ${plugin.name}`);
        console.log(`   Plugin ID: ${pluginId}`);
        console.log(`   Plugin path: ${plugin.path}`);
        console.log(`   Preset paths available: ${plugin.presetPaths?.length || 0}`);
        
        if (plugin.presetPaths && plugin.presetPaths.length > 0) {
            console.log(`   ✅ Found ${plugin.presetPaths.length} preset file(s):`);
            plugin.presetPaths.slice(0, 10).forEach((p, i) => {
                console.log(`      ${i + 1}. ${path.basename(p)}`);
            });
            if (plugin.presetPaths.length > 10) {
                console.log(`      ... and ${plugin.presetPaths.length - 10} more`);
            }
        } else {
            console.warn(`   ⚠️  No preset files found for ${plugin.name}`);
            console.warn(`   💡 This plugin may not have preset files, or they're in a non-standard location`);
        }

        // Options: keep extraction manageable and explicit
        const options = arguments.length > 1 && typeof arguments[1] === 'object' ? arguments[1] : {};
        const limit = Number.isFinite(Number(options.limit)) ? Math.max(1, Number(options.limit)) : 25;
        const allowPlaceholder = Boolean(options.allowPlaceholder);

        const presets = [];
        
        // Extract presets from preset files
        if (plugin.presetPaths && plugin.presetPaths.length > 0) {
            const totalAvailable = plugin.presetPaths.length;
            const selectedPaths = plugin.presetPaths.slice(0, Math.min(limit, totalAvailable));

            console.log(`   📦 Extracting ${selectedPaths.length}/${totalAvailable} preset file(s) (limit=${limit})`);
            for (const presetPath of selectedPaths) {
                try {
                    const presetInfo = await this.readPresetFile(presetPath, plugin);
                    if (presetInfo) {
                        presets.push(presetInfo);
                        console.log(`   ✅ Read preset: ${presetInfo.name}`);
                    }
                } catch (error) {
                    console.warn(`⚠️  Error reading preset ${presetPath}:`, error.message);
                }
            }
        } else {
            console.warn(`⚠️  No preset paths found for ${plugin.name}`);
        }

        // If no presets found, only create a placeholder if explicitly allowed.
        if (presets.length === 0 && allowPlaceholder) {
            console.log(`   ⚠️  No preset files found for ${plugin.name}, creating placeholder preset (allowPlaceholder=true)`);
            presets.push({
                id: `${pluginId}-default`,
                name: `Default (${plugin.name})`,
                pluginId: pluginId,
                pluginName: plugin.name,
                pluginType: plugin.type,
                path: null,
                parameters: {},
                category: 'Plugin Preset'
            });
        }

        // If still empty, return a clear error (most “internal preset browsers” fall here)
        if (presets.length === 0) {
            return {
                success: false,
                error: 'No preset files found on disk for this plugin. Some plugins store presets internally and cannot be extracted by file scan.',
                presets: [],
                count: 0,
                totalAvailable: plugin.presetPaths?.length || 0
            };
        }

        console.log(`✅ Extracted ${presets.length} preset(s) from ${plugin.name}`);
        this.pluginPresets.set(pluginId, presets);

        return {
            success: true,
            presets: presets,
            count: presets.length,
            totalAvailable: plugin.presetPaths?.length || presets.length
        };
    }

    /**
     * Read preset file and extract preset name
     * Supports VST3 preset files (.vstpreset - XML format)
     */
    async readPresetFile(presetPath, plugin) {
        try {
            const stats = fs.statSync(presetPath);
            const basename = path.basename(presetPath, path.extname(presetPath));
            const ext = path.extname(presetPath).toLowerCase();
            
            let presetName = basename;
            let parameters = {};
            
            // Try to extract actual preset name from file content
            if (ext === '.vstpreset') {
                // VST3 presets are XML files
                try {
                    const content = fs.readFileSync(presetPath, 'utf8');
                    console.log(`   📄 Reading VST3 preset file: ${path.basename(presetPath)}`);
                    
                    // Extract preset name from XML - try multiple patterns
                    // Pattern 1: <Preset name="Actual Preset Name" ...>
                    let nameMatch = content.match(/<Preset[^>]*name=["']([^"']+)["']/i);
                    if (nameMatch && nameMatch[1]) {
                        presetName = nameMatch[1].trim();
                        console.log(`   ✅ Found preset name in <Preset> tag: "${presetName}"`);
                    } else {
                        // Pattern 2: <State name="..." ...>
                        nameMatch = content.match(/<State[^>]*name=["']([^"']+)["']/i);
                        if (nameMatch && nameMatch[1]) {
                            presetName = nameMatch[1].trim();
                            console.log(`   ✅ Found preset name in <State> tag: "${presetName}"`);
                        } else {
                            // Pattern 3: Look for any name attribute
                            nameMatch = content.match(/name=["']([^"']+)["']/i);
                            if (nameMatch && nameMatch[1]) {
                                presetName = nameMatch[1].trim();
                                console.log(`   ✅ Found preset name attribute: "${presetName}"`);
                            } else {
                                // Pattern 4: Look for <Name> tag
                                nameMatch = content.match(/<Name[^>]*>([^<]+)<\/Name>/i);
                                if (nameMatch && nameMatch[1]) {
                                    presetName = nameMatch[1].trim();
                                    console.log(`   ✅ Found preset name in <Name> tag: "${presetName}"`);
                                } else {
                                    console.warn(`   ⚠️  Could not find preset name in XML, using filename: "${basename}"`);
                                }
                            }
                        }
                    }
                    
                    // Try to extract some basic parameter info (for future use)
                    // This is a simplified extraction - full parsing would require VST3 SDK
                } catch (parseError) {
                    console.warn(`   ⚠️  Could not parse VST3 preset file ${presetPath}:`, parseError.message);
                    console.warn(`   💡 Using filename as preset name: "${basename}"`);
                    // Fall back to filename
                }
            } else if (ext === '.fxp' || ext === '.fxb') {
                // VST2 preset files (binary format)
                // For now, just use filename - would need VST2 SDK to parse properly
                console.log(`   ℹ️  FXP/FXB file detected - using filename as preset name: "${basename}"`);
            } else if (ext === '.aupreset') {
                // AU preset files are often plist (xml or binary)
                try {
                    const buf = fs.readFileSync(presetPath);
                    const header = buf.slice(0, 8).toString('utf8');
                    let content = '';
                    if (header.startsWith('bplist00')) {
                        // Binary plist - we can't reliably parse without a plist parser.
                        // But sometimes the name is still visible as UTF-8 fragments.
                        content = buf.toString('utf8');
                    } else {
                        content = buf.toString('utf8');
                    }

                    // Common patterns in plist XML
                    const patterns = [
                        /<key>\s*presetName\s*<\/key>\s*<string>([^<]+)<\/string>/i,
                        /<key>\s*name\s*<\/key>\s*<string>([^<]+)<\/string>/i,
                        /<key>\s*Name\s*<\/key>\s*<string>([^<]+)<\/string>/i,
                        /<key>\s*Title\s*<\/key>\s*<string>([^<]+)<\/string>/i
                    ];
                    for (const re of patterns) {
                        const m = content.match(re);
                        if (m && m[1]) {
                            presetName = m[1].trim();
                            console.log(`   ✅ Found AU preset name in plist: "${presetName}"`);
                            break;
                        }
                    }
                } catch (e) {
                    console.warn(`   ⚠️  Could not parse AU preset file ${presetPath}:`, e.message);
                }
            } else if (ext === '.fzi') {
                // Roland Cloud preset pack / bank file (binary).
                // We can't parse individual patch names yet, but we can surface the pack name.
                presetName = basename;
            } else {
                // Unknown format, use filename
                console.log(`   ℹ️  Unknown preset format (${ext}) - using filename as preset name: "${basename}"`);
            }
            
            return {
                id: `${plugin.id}-${presetName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
                name: presetName,
                pluginId: plugin.id,
                pluginName: plugin.name,
                pluginType: plugin.type,
                path: presetPath,
                parameters: parameters,
                category: 'Plugin Preset',
                fileSize: stats.size,
                modified: stats.mtime
            };
        } catch (error) {
            console.error(`   ❌ Error reading preset file ${presetPath}:`, error.message);
            return null;
        }
    }

    /**
     * Get all discovered plugins
     */
    getPlugins() {
        return this.discoveredPlugins;
    }

    /**
     * Get presets for a plugin
     */
    getPresets(pluginId) {
        return this.pluginPresets.get(pluginId) || [];
    }
}

module.exports = PluginScanner;

