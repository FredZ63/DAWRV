/**
 * ATLAS Category Configuration
 * Defines all categories for patches, plugins, and metadata
 */

const CategoryConfig = {
    /**
     * Patch Categories - Organize patches by sound/function
     */
    PATCH_CATEGORIES: {
        LEAD: 'Lead',
        BASS: 'Bass',
        PAD: 'Pad',
        KEYS: 'Keys',
        DRUMS: 'Drums',
        FX_TEXTURES: 'FX/Textures',
        BRASS: 'Brass',
        STRINGS: 'Strings',
        WOODWIND: 'Woodwind',
        VOCALS: 'Vocals',
        SEQUENCES: 'Sequences',
        AMBIENT: 'Ambient',
        IMPORTED: 'Imported',
        PLUGIN_PRESET: 'Plugin Preset',
        UNCategorized: 'Uncategorized'
    },

    /**
     * Patch Category Info - Display metadata for each category
     */
    PATCH_CATEGORY_INFO: {
        'Lead': { 
            name: 'Lead', 
            icon: '🎹', 
            desc: 'Melodic leads, plucks, arps',
            keywords: ['lead', 'pluck', 'arp', 'arpeggio', 'melody', 'solo', 'mono', 'synth lead']
        },
        'Bass': { 
            name: 'Bass', 
            icon: '🎸', 
            desc: 'Sub, 808, acid, synth bass',
            keywords: ['bass', 'sub', '808', 'acid', 'low', 'sub bass', 'bassline', 'low end']
        },
        'Pad': { 
            name: 'Pad', 
            icon: '☁️', 
            desc: 'Ambient, atmospheric, strings',
            keywords: ['pad', 'atmospheric', 'ambient', 'strings', 'lush', 'wide', 'texture', 'wash']
        },
        'Keys': { 
            name: 'Keys', 
            icon: '🎹', 
            desc: 'Piano, organ, rhodes, vintage keys',
            keywords: ['piano', 'organ', 'rhodes', 'keys', 'keyboard', 'ep', 'electric piano', 'wurlitzer', 'clavinet']
        },
        'Drums': { 
            name: 'Drums', 
            icon: '🥁', 
            desc: 'Kicks, snares, percussion, drum machines',
            keywords: ['drum', 'kick', 'snare', 'percussion', 'hihat', 'hi-hat', 'cymbal', 'tom', 'drum machine']
        },
        'FX/Textures': { 
            name: 'FX/Textures', 
            icon: '✨', 
            desc: 'Risers, impacts, sweeps, noise',
            keywords: ['fx', 'effect', 'riser', 'impact', 'sweep', 'noise', 'texture', 'whoosh', 'transition']
        },
        'Brass': { 
            name: 'Brass', 
            icon: '🎺', 
            desc: 'Horns, trumpets, trombones',
            keywords: ['brass', 'horn', 'trumpet', 'trombone', 'sax', 'saxophone', 'tuba', 'flugelhorn']
        },
        'Strings': { 
            name: 'Strings', 
            icon: '🎻', 
            desc: 'Orchestral strings, violins, cellos',
            keywords: ['string', 'violin', 'viola', 'cello', 'double bass', 'orchestra', 'orchestral', 'ensemble']
        },
        'Woodwind': { 
            name: 'Woodwind', 
            icon: '🎵', 
            desc: 'Flutes, clarinets, saxophones',
            keywords: ['woodwind', 'flute', 'clarinet', 'oboe', 'bassoon', 'piccolo', 'recorder']
        },
        'Vocals': { 
            name: 'Vocals', 
            icon: '🎤', 
            desc: 'Vocal synths, vocoders, choirs',
            keywords: ['vocal', 'voice', 'vocoder', 'choir', 'vox', 'sing', 'singer', 'vocal synth']
        },
        'Sequences': { 
            name: 'Sequences', 
            icon: '🔁', 
            desc: 'Arpeggiated, sequenced patterns',
            keywords: ['sequence', 'sequenced', 'pattern', 'arp', 'arpeggio', 'step', 'sequencer']
        },
        'Ambient': { 
            name: 'Ambient', 
            icon: '🌌', 
            desc: 'Drones, textures, soundscapes',
            keywords: ['ambient', 'drone', 'soundscape', 'atmospheric', 'ethereal', 'space', 'texture']
        },
        'Imported': { 
            name: 'Imported', 
            icon: '📥', 
            desc: 'Patches imported from devices',
            keywords: []
        },
        'Plugin Preset': { 
            name: 'Plugin Preset', 
            icon: '🔌', 
            desc: 'Presets from VST/AU plugins',
            keywords: []
        },
        'Uncategorized': { 
            name: 'Uncategorized', 
            icon: '❓', 
            desc: 'Uncategorized patches',
            keywords: []
        }
    },

    /**
     * Plugin Categories - Organize plugins by type
     */
    PLUGIN_CATEGORIES: {
        INSTRUMENT: 'instrument',
        FX: 'fx',
        OUTBOARD: 'outboard',
        GUITAR: 'guitar',
        MIDITOOLS: 'miditools',
        MASTERING: 'mastering',
        ANALYZER: 'analyzer',
        SATURATION: 'saturation',
        SYNTH: 'synth',
        SAMPLER: 'sampler',
        DRUM: 'drum',
        UNKNOWN: 'unknown'
    },

    /**
     * Plugin Category Info - Display metadata for each category
     */
    PLUGIN_CATEGORY_INFO: {
        'instrument': { 
            name: 'Instruments', 
            icon: '🎹', 
            desc: 'Synths, Samplers, Drum Machines' 
        },
        'fx': { 
            name: 'FX', 
            icon: '✨', 
            desc: 'Reverbs, Delays, Modulation' 
        },
        'outboard': { 
            name: 'Signal Processing', 
            icon: '🎚️', 
            desc: 'Compressors, EQs, Preamps, Channel Strips' 
        },
        'guitar': { 
            name: 'Guitar', 
            icon: '🎸', 
            desc: 'Amp Sims, Pedals, Cabinets' 
        },
        'miditools': { 
            name: 'MIDI Tools', 
            icon: '🎵', 
            desc: 'Scalers, Chord Tools, MIDI Utilities' 
        },
        'mastering': { 
            name: 'Mastering', 
            icon: '🎛️', 
            desc: 'Limiters, Multiband, Stereo Tools' 
        },
        'analyzer': { 
            name: 'Analyzer', 
            icon: '📊', 
            desc: 'Spectrum, Phase, LUFS Meters' 
        },
        'saturation': { 
            name: 'Saturation', 
            icon: '🔥', 
            desc: 'Tape, Tube, Distortion, Harmonic Enhancers' 
        },
        'synth': { 
            name: 'Synth', 
            icon: '🎹', 
            desc: 'Dedicated Synthesizer Plugins' 
        },
        'sampler': { 
            name: 'Sampler', 
            icon: '📦', 
            desc: 'Samplers and Sample Players' 
        },
        'drum': { 
            name: 'Drum', 
            icon: '🥁', 
            desc: 'Drum Machines and Drum Plugins' 
        },
        'unknown': { 
            name: 'Other', 
            icon: '🔌', 
            desc: 'Uncategorized Plugins' 
        }
    },

    /**
     * Metadata Categories - Additional organization
     */
    METADATA_CATEGORIES: {
        GENRE: 'genre',
        MOOD: 'mood',
        TEMPO_RANGE: 'tempoRange',
        COMPLEXITY: 'complexity'
    },

    /**
     * Genre Options
     */
    GENRES: [
        'Electronic',
        'Hip-Hop',
        'Rock',
        'Jazz',
        'Classical',
        'Pop',
        'Ambient',
        'Techno',
        'House',
        'Drum & Bass',
        'Dubstep',
        'Trap',
        'Synthwave',
        'Retro',
        'Experimental',
        'Other'
    ],

    /**
     * Mood Options
     */
    MOODS: [
        'Dark',
        'Bright',
        'Aggressive',
        'Mellow',
        'Energetic',
        'Calm',
        'Mysterious',
        'Playful',
        'Melancholic',
        'Uplifting',
        'Intense',
        'Gentle',
        'Other'
    ],

    /**
     * Tempo Range Options
     */
    TEMPO_RANGES: [
        'Slow (60-90 BPM)',
        'Medium (90-120 BPM)',
        'Fast (120-150 BPM)',
        'Very Fast (150+ BPM)',
        'Variable',
        'N/A'
    ],

    /**
     * Complexity Options
     */
    COMPLEXITY_LEVELS: [
        'Simple',
        'Moderate',
        'Complex',
        'Very Complex'
    ],

    /**
     * Auto-detect patch category from name and tags
     */
    detectPatchCategory(name, tags = []) {
        const nameLower = (name || '').toLowerCase();
        const tagsLower = (tags || []).map(t => String(t).toLowerCase());
        const allText = [nameLower, ...tagsLower].join(' ');

        // Score each category based on keyword matches
        const scores = {};
        
        for (const [category, info] of Object.entries(this.PATCH_CATEGORY_INFO)) {
            if (!info.keywords || info.keywords.length === 0) continue;
            
            let score = 0;
            for (const keyword of info.keywords) {
                if (allText.includes(keyword)) {
                    score += 1;
                    // Boost score if keyword appears in name (more important)
                    if (nameLower.includes(keyword)) {
                        score += 2;
                    }
                }
            }
            
            if (score > 0) {
                scores[category] = score;
            }
        }

        // Return category with highest score, or Uncategorized
        if (Object.keys(scores).length === 0) {
            return this.PATCH_CATEGORIES.UNCategorized;
        }

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        return sorted[0][0];
    },

    /**
     * Get patch category info
     */
    getPatchCategoryInfo(category) {
        return this.PATCH_CATEGORY_INFO[category] || this.PATCH_CATEGORY_INFO['Uncategorized'];
    },

    /**
     * Get plugin category info
     */
    getPluginCategoryInfo(category) {
        return this.PLUGIN_CATEGORY_INFO[category] || this.PLUGIN_CATEGORY_INFO['unknown'];
    },

    /**
     * Get all patch categories as array
     */
    getAllPatchCategories() {
        return Object.values(this.PATCH_CATEGORIES);
    },

    /**
     * Get all plugin categories as array
     */
    getAllPluginCategories() {
        return Object.values(this.PLUGIN_CATEGORIES);
    }
};

module.exports = CategoryConfig;

