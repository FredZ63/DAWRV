/**
 * EPacks UI Manager
 * Expansion Packs - AI-Powered Creative Personas for DAWRV/RHEA
 */

class EPacksManager {
    constructor() {
        this.modal = null;
        this.activeEPack = null;
        this.epacks = this.defineEPacks();
        this.init();
    }
    
    /**
     * Define all available EPacks
     */
    defineEPacks() {
        return {
            cookie: {
                id: 'cookie',
                name: 'Cookie',
                fullName: 'Cookie "Pocket" Jackson',
                title: 'The Beat Chef',
                icon: '🍪',
                image: 'assets/images/epacks/cookie.png',
                tagline: '"Let\'s chef it up, fam."',
                description: 'Playful, energetic, and rhythmic. Cookie brings unmatched drum programming instincts and makes any beat knock harder. Quick with patterns and deep understanding of pocket and groove.',
                status: 'installed',
                genres: ['Hip-Hop', 'Trap', 'Boom Bap', 'Jersey Club', 'Bounce'],
                era: '2010s-Present',
                influences: ['Metro Boomin', 'DJ Premier', 'Timbaland', 'Lex Luger'],
                tags: ['drums', 'rhythm', 'trap', 'bounce', 'hihats', '808s', 'pocket', 'groove'],
                strengths: ['Drum programming', 'Making beats knock', 'Pattern generation', 'Groove mastery'],
                weaknesses: ['Can over-complicate hi-hats', 'Prioritizes drums over melody', 'Impatient with ballads'],
                voiceLines: [
                    'Ayo, that 808 is muddy—let me tighten that up for you.',
                    'You want bounce or you want knock? Cause I got both.',
                    'That hi-hat pattern? Nah, we going double-time on the third bar. Trust.',
                    'The pocket\'s off by like 12 milliseconds. I feel it. Let me fix it.',
                    'Cookie in the building! What we cooking today?'
                ],
                toolkit: [
                    '🥁 Cookie Patterns - Signature hi-hat rolls, trap bounces, boom bap loops',
                    '🎹 Pocket Presets - Drum bus chains, 808 processing, snap/clap layers',
                    '🔄 Groove Humanizer - Adds swing and feel to quantized drums',
                    '💬 Beat Critiques - Real-time feedback on your rhythm'
                ],
                color: '#FF6B6B',
                narratorIntro: `Yo yo yo! Ayo hold up, hold up, HOLD UP son! You already KNOW what time it is! It's ya girl! The one and ONLY! Coming straight outta the kitchen with that HEAT! COOKIEEEE! Ayo real talk, when them drums ain't hittin right? When that pocket ain't tight? She come through and BLESS the track, you feel me?! This ain't no game son! Her hi-hats got that BOUNCE! Them 808s hit DIFFERENT! And when Cookie say "Let's chef it up fam"... YO, the kitchen is OPEN for BUSINESS! We outside! We REALLY outside! Let's GET IT!`
            },
            cheffy: {
                id: 'cheffy',
                name: 'Cheffy',
                fullName: 'Chef "Gritty" Williams',
                title: 'The Soul Surgeon',
                icon: '👨‍🍳',
                image: 'assets/images/epacks/cheffy.png',
                tagline: '"Raw ingredients, seasoned right."',
                description: 'Soulful, wise, and old-school cool with modern awareness. Cheffy brings deep harmonic knowledge and makes everything sound warm and human. Master of the sample flip.',
                status: 'installed',
                genres: ['R&B', 'Neo-Soul', 'Gospel', '90s Hip-Hop', 'Jazz-Rap'],
                era: '1985-2005 Golden Era',
                influences: ['J Dilla', 'Quincy Jones', 'DJ Quik', 'The Neptunes', 'D\'Angelo'],
                tags: ['soul', 'rnb', 'sampling', 'chops', 'warmth', 'analog', 'texture', 'chords'],
                strengths: ['Deep harmonic knowledge', 'Warmth and humanity', 'Sample flipping', 'Knowing when to breathe'],
                weaknesses: ['Too subtle for aggressive genres', 'Takes his time', 'Might over-sauce'],
                voiceLines: [
                    'That sample\'s got bones in it. Let me clean it up and season it right.',
                    'You rushing the verse. Let the pocket simmer, young blood.',
                    'This mix is bland. Needs some grit, some texture. Hand me that saturator.',
                    'I been cooking beats since your favorite producer was in diapers.',
                    'The soul is in the imperfection. Don\'t quantize that.'
                ],
                toolkit: [
                    '🎹 Soul Chords - Neo-soul progressions, jazz voicings, gospel runs',
                    '🎸 Grit Mode - Lo-fi textures, vinyl crackle, tape warmth',
                    '🎷 Sample Flipper - Finds the chop, suggests the flip',
                    '🍳 Recipe Builder - Full arrangement suggestions based on vibe'
                ],
                color: '#F39C12',
                narratorIntro: `Ayo ayo AYO! You hear that?! Nah son, you HEAR THAT?! That's that SOUL right there, word to mother! Coming straight from the GOLDEN ERA, ya heard?! From them smoke-filled studios where LEGENDS was BORN! My man right here! The OG of the MPC! CHEFFYYYYY! Yo this dude been flippin samples since your favorite producer was still in PAMPERS, no cap! When you need that WARMTH? That GRIT? That analog SOUL that make your chest feel FULL? Cheffy got you, he ALWAYS got you! He don't just flip samples son, he bring em BACK TO LIFE! Raw ingredients, SEASONED RIGHT! That's that REAL hip-hop right there! Salute!`
            },
            saucey: {
                id: 'saucey',
                name: 'Saucey',
                fullName: 'Saucey "Drip" Monroe',
                title: 'The Sauce Master',
                icon: '🔥',
                image: 'assets/images/epacks/saucey.png',
                tagline: '"If it ain\'t clean, it ain\'t seen."',
                description: 'Confident, stylish, and trend-aware. Saucey makes anything sound modern and polished with an incredible ear for hooks and toplines. Knows what\'s trending sonically.',
                status: 'installed',
                genres: ['Pop', 'Modern R&B', 'Hyperpop', 'Bedroom Pop', 'Commercial Trap'],
                era: '2018-Present',
                influences: ['The Weeknd\'s team', 'FINNEAS', 'Take A Daytrip', 'Murda Beatz'],
                tags: ['polish', 'modern', 'mixing', 'vocals', 'hooks', 'trendy', 'clean', 'drip'],
                strengths: ['Modern polish', 'Hook instincts', 'Trend awareness', 'Mix translation'],
                weaknesses: ['Can over-polish raw grit', 'Chases trends', 'Too much sauce sometimes'],
                voiceLines: [
                    'Okay but that hook is giving main character energy. Let\'s stack some harmonies.',
                    'The low end is muddy, bestie. We\'re cleaning that up immediately.',
                    'That snare? It\'s not wrong, it\'s just... last year. Let me find you something fresh.',
                    'Period! That drop just hit different. No notes.',
                    'We\'re not leaving this session until those vocals are sitting pretty.'
                ],
                toolkit: [
                    '✨ Drip Mode - Instant polish chains for any stem',
                    '🎤 Vocal Magic - Harmony stacks, ad-libs, tuning suggestions',
                    '🌊 Mix Drip - Modern mixing presets, width enhancement',
                    '🎨 Vibe Curation - Aesthetic-matched sound selection'
                ],
                color: '#E91E63',
                narratorIntro: `Ayo what's GOOD?! You smell that?! That's that DRIP right there son! In the game where everybody tryna be somebody? Where yesterday's hit is today's OLD NEWS? One name stay AHEAD of all that! Who that is?! SAUCEYYYY! The Sauce Master in the BUILDING! Yo when your mix need that CLEAN sound? When them vocals gotta SIT RIGHT? When your joint gotta sound like it belong on EVERY playlist?! Saucey bring that HEAT, no question! He don't chase trends fam, nah, he SET em! Crystal clear LOWS! Them highs hit DIFFERENT! If it ain't CLEAN, it ain't SEEN, you heard?! Your track bout to go CRAZY! We don't play over here! That's on EVERYTHING!`
            },
            ruckus: {
                id: 'ruckus',
                name: 'Ruckus',
                fullName: 'Ruckus "Loud" Thompson',
                title: 'The Chaos Commander',
                icon: '🎸',
                tagline: '"Turn it up till it hurts good."',
                description: 'Aggressive, rebellious, and unapologetically loud. Ruckus brings energy to any track and is the master of tension and release. Makes drops hit like trucks.',
                status: 'available',
                genres: ['Rock', 'Metal', 'Punk', 'Industrial', 'Rage Trap', 'Hyperpop'],
                era: 'All eras of loud',
                influences: ['Rick Rubin', 'Trent Reznor', 'JPEGMAFIA', '100 gecs'],
                tags: ['loud', 'distortion', 'rock', 'aggressive', 'chaos', 'drops', 'energy', 'rage'],
                strengths: ['Brings energy', 'Tension and release', 'Drops that punch', 'Rule breaking'],
                weaknesses: ['Too much for subtle genres', 'Sometimes destroys too much', 'Volume addiction'],
                voiceLines: [
                    'BRO. That drop needs to SLAP. Let me throw some distortion on it.',
                    'You call that loud? I can still hear myself think. Unacceptable.',
                    'Rules are for people who don\'t know how to break them right.',
                    'That\'s not a bass—that\'s a polite suggestion. Let me fix that.',
                    'RUCKUS IN THE BUILDING! WHO WANTS SMOKE?!'
                ],
                toolkit: [
                    '🔊 Chaos Mode - Instant distortion, bitcrushing, destruction',
                    '🎸 Riff Generator - Guitar patterns, power chords, riffs',
                    '💥 Impact Designer - Hits, risers, drops that punch',
                    '🖤 Dark Presets - Industrial textures, aggressive synths'
                ],
                color: '#9C27B0',
                narratorIntro: `YO TURN THAT UP! Nah son, TURN THAT UP! Ayo WARNING! What you bout to hear?! Can't be UNHEARD, real talk! From the DEPTHS of that distortion! From the EDGE of sonic destruction! Here he come with that ENERGY! RUCKUSSSSS! The Chaos Commander in this JAWN! Yo when that polite music ain't cuttin it? When you need to SHAKE the whole BLOCK?! Ruckus ANSWER THE CALL every single time! He don't make music fam, nah, he make STATEMENTS! His drops hit like BRICKS son! Turn it UP till it HURT! You gon feel that in your CHEST! That's that REAL energy right there! We goin UP! AHHHHH!`
            },
            luna: {
                id: 'luna',
                name: 'Luna',
                fullName: 'Luna "Drift" Celestine',
                title: 'The Ambient Architect',
                icon: '🌙',
                tagline: '"Space between the notes is where magic lives."',
                description: 'Ethereal, calm, and deeply introspective. Luna creates immersive sonic worlds and is the master of space and depth. Perfect for intros, outros, and transitions.',
                status: 'available',
                genres: ['Ambient', 'Chillwave', 'Lo-Fi', 'Dream Pop', 'Cinematic'],
                era: 'Timeless',
                influences: ['Brian Eno', 'Boards of Canada', 'Tycho', 'Nujabes'],
                tags: ['ambient', 'space', 'texture', 'chill', 'atmospheric', 'reverb', 'cinematic', 'dream'],
                strengths: ['Immersive worlds', 'Space and depth', 'Brings calm', 'Transitions'],
                weaknesses: ['Can drift from structure', 'Not for high-energy', 'Sometimes too subtle'],
                voiceLines: [
                    'Close your eyes. What do you see when this plays? Paint that.',
                    'That reverb tail... it\'s not just decay. It\'s the song saying goodbye.',
                    'You don\'t need more notes. You need more space between them.',
                    'The frequency spectrum is a garden. Let me help you tend it.',
                    'Luna here. Let\'s drift somewhere beautiful.'
                ],
                toolkit: [
                    '🌌 Drift Mode - Ambient textures, evolving pads',
                    '🎹 Space Keys - Atmospheric chord progressions',
                    '🌊 Reverb Sculptor - Custom space design',
                    '✨ Texture Library - Field recordings, noise, atmosphere'
                ],
                color: '#4ECDC4',
                narratorIntro: `Yo chill chill CHILL for a second! You feel that?! That VIBE in the air right now?! Ohhhhh we bout to go SOMEWHERE son! Into the COSMOS! Into the ATMOSPHERE! Here she come floatin in like a DREAM! LUNAAAA! The Ambient Architect! Yo she don't just make noise fam, nah nah, she create WHOLE WORLDS! That's that ethereal vibe right there, you feel me?! Her reverbs go on FOREVER! Her pads EVOLVE like they ALIVE! The space between them notes? That's where the MAGIC at! Welcome to the DRIFT baby! Close your eyes and just FLOAT! This that OTHERWORLDLY type of energy! That's on GOD!`
            },
            maestro: {
                id: 'maestro',
                name: 'Maestro',
                fullName: 'Maestro "Strings" Fontaine',
                title: 'The Orchestral Oracle',
                icon: '🎺',
                tagline: '"Every arrangement tells a story."',
                description: 'Sophisticated, dramatic, and theatrical. Maestro brings cinematic grandeur to any track and is the master of arrangement and dynamics. Knows every instrument\'s range and role.',
                status: 'coming-soon',
                genres: ['Orchestral', 'Film Score', 'Classical Crossover', 'Epic'],
                era: 'All of classical history + modern scoring',
                influences: ['Hans Zimmer', 'John Williams', 'Quincy Jones', 'Ennio Morricone'],
                tags: ['orchestral', 'strings', 'cinematic', 'arrangement', 'epic', 'classical', 'score', 'dynamics'],
                strengths: ['Cinematic grandeur', 'Arrangement mastery', 'Instrument knowledge', 'Epic moments'],
                weaknesses: ['Overly dramatic', 'Too formal sometimes', 'Might over-arrange'],
                voiceLines: [
                    'A string section doesn\'t just play—it breathes, it yearns, it resolves.',
                    'This needs a brass fanfare in bar 32. Trust the Maestro.',
                    'Your beat is a fine sketch. Let me paint the full orchestra around it.',
                    'Dynamics, my friend! Piano to forte! Make them FEEL the journey!',
                    'Maestro at your service. Shall we compose something magnificent?'
                ],
                toolkit: [
                    '🎻 String Arranger - Violin, cello, full section arrangements',
                    '🎺 Brass Builder - Horn stabs, fanfares, swells',
                    '🥁 Percussion Orchestrator - Timpani, orchestral hits',
                    '📜 Score Templates - Film-ready arrangement presets'
                ],
                color: '#3498DB',
                narratorIntro: `Ayo everybody sit DOWN for a second! What you bout to WITNESS? Is GREATNESS! Straight up GREATNESS! From them concert halls overseas! To HOLLYWOOD itself! Here he come with the BATON! MAESTROOOOO! The Orchestral Oracle in the BUILDING! Yo when your track need to SOAR? When them strings gotta make you FEEL somethin? When that BRASS gotta HIT?! Maestro CONDUCT that like a BOSS! His arrangements don't just accompany your music son, nah, they ELEVATE it to another LEVEL! Every crescendo TELL A STORY! Your joint bout to become LEGENDARY, no cap! That's that CLASSIC right there! Give it UP! BRAVO! That's ELITE!`
            }
        };
    }
    
    init() {
        // Load active EPack from storage
        this.loadActiveEPack();
        
        // Audio cache for instant playback
        this.audioCache = {};
        this.isCaching = false;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
        
        console.log('🎭 EPacks Manager initialized');
    }
    
    setupEventListeners() {
        // EPacks button click
        const epacksBtn = document.getElementById('epacks-btn');
        if (epacksBtn) {
            epacksBtn.addEventListener('click', () => this.showModal());
        }
    }
    
    loadActiveEPack() {
        try {
            const saved = localStorage.getItem('rhea_active_epack');
            if (saved) {
                this.activeEPack = saved;
            }
        } catch (e) {
            console.warn('Failed to load active EPack:', e);
        }
    }
    
    saveActiveEPack(epackId) {
        try {
            localStorage.setItem('rhea_active_epack', epackId);
            this.activeEPack = epackId;
        } catch (e) {
            console.warn('Failed to save active EPack:', e);
        }
    }
    
    showModal() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.style.display = 'flex';
        
        // Pre-cache narrator audio in background for instant playback
        this.preCacheNarratorAudio();
    }
    
    /**
     * Pre-cache narrator audio for all EPacks (runs in background)
     * Uses ElevenLabs for authentic voices!
     */
    async preCacheNarratorAudio() {
        if (this.isCaching) return;
        this.isCaching = true;
        
        // ElevenLabs API key for EPacks narrator
        const elevenLabsKey = 'sk_d20b8a394ae541763fb61d05a965b11f1589bd9e488adf33';
        // Voice ID: DeeJay - Hype man voice!
        const narratorVoiceId = '3w1kUvxu1LioQcLgp1KY';
        
        // Fallback to OpenAI
        const aiConfig = localStorage.getItem('rhea_ai_config');
        let openaiKey = null;
        try {
            if (aiConfig) {
                const parsed = JSON.parse(aiConfig);
                openaiKey = parsed.apiKey;
            }
        } catch (e) {}
        
        if (!elevenLabsKey && !openaiKey) {
            this.isCaching = false;
            return;
        }
        
        console.log(elevenLabsKey ? '🎙️ Pre-caching with ElevenLabs (better voices!)...' : '🎙️ Pre-caching with OpenAI...');
        
        // Cache all installed EPacks
        for (const epack of Object.values(this.epacks)) {
            if (epack.status === 'installed' && epack.narratorIntro && !this.audioCache[epack.id]) {
                try {
                    let audioBlob = null;
                    
                    if (elevenLabsKey) {
                        // USE ELEVENLABS - Much better voice variety!
                        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${narratorVoiceId}`, {
                            method: 'POST',
                            headers: {
                                'xi-api-key': elevenLabsKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                text: epack.narratorIntro,
                                model_id: 'eleven_monolingual_v1',
                                voice_settings: {
                                    stability: 0.3,        // Lower = more expressive/animated
                                    similarity_boost: 0.8,
                                    style: 0.8,            // High style for personality
                                    use_speaker_boost: true
                                }
                            })
                        });
                        
                        if (response.ok) {
                            audioBlob = await response.blob();
                        }
                    }
                    
                    // Fallback to OpenAI
                    if (!audioBlob && openaiKey) {
                        const response = await fetch('https://api.openai.com/v1/audio/speech', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${openaiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: 'tts-1',
                                input: epack.narratorIntro,
                                voice: 'onyx', // Deepest voice available
                                speed: 1.1
                            })
                        });
                        
                        if (response.ok) {
                            audioBlob = await response.blob();
                        }
                    }
                    
                    if (audioBlob) {
                        this.audioCache[epack.id] = URL.createObjectURL(audioBlob);
                        console.log(`✅ Cached: ${epack.name}`);
                    }
                } catch (e) {
                    console.warn(`Failed to cache ${epack.name}:`, e);
                }
            }
        }
        
        this.isCaching = false;
        console.log('🎙️ Narrator audio pre-cached!');
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
    
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'epacks-modal';
        
        modal.innerHTML = `
            <div class="epacks-modal-content">
                <div class="epacks-header">
                    <div>
                        <h2><span>🎭</span> Expansion Packs</h2>
                        <p class="epacks-subtitle">AI-Powered Creative Personas for Your Studio</p>
                    </div>
                    <button class="epacks-close-btn">✕</button>
                </div>
                
                <div class="epacks-body">
                    ${this.renderActiveEPack()}
                    
                    <div class="epacks-section-title">Available EPacks</div>
                    
                    <div class="epacks-grid">
                        ${this.renderEPackCards()}
                    </div>
                </div>
                
                <div class="epacks-footer">
                    <div class="epacks-footer-info">
                        <strong>${Object.keys(this.epacks).length}</strong> EPacks available • 
                        <strong>${Object.values(this.epacks).filter(e => e.status === 'installed').length}</strong> installed
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.epacks-close-btn').addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        
        // Card click handlers
        modal.querySelectorAll('.epack-card').forEach(card => {
            const activateBtn = card.querySelector('.epack-btn-primary');
            const detailsBtn = card.querySelector('.epack-btn-secondary');
            
            if (activateBtn) {
                activateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.activateEPack(card.dataset.epack);
                });
            }
            
            if (detailsBtn) {
                detailsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showEPackDetails(card.dataset.epack);
                });
            }
        });
        
        this.modal = modal;
    }
    
    renderActiveEPack() {
        if (!this.activeEPack || !this.epacks[this.activeEPack]) {
            return `
                <div class="active-epack-section" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(102, 126, 234, 0.05) 100%); border-color: rgba(102, 126, 234, 0.3);">
                    <div class="active-epack-label">Currently Active</div>
                    <div class="active-epack-display">
                        <div class="active-epack-icon">🤖</div>
                        <div class="active-epack-info">
                            <h3 style="color: #667eea;">RHEA (Default)</h3>
                            <p>Select an EPack below to enhance RHEA with a creative persona</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const epack = this.epacks[this.activeEPack];
        return `
            <div class="active-epack-section">
                <div class="active-epack-label">Currently Active</div>
                <div class="active-epack-display">
                    ${epack.image ? `
                        <img src="${epack.image}" alt="${epack.name}" class="active-epack-avatar">
                    ` : `
                        <div class="active-epack-icon">${epack.icon}</div>
                    `}
                    <div class="active-epack-info">
                        <h3>${epack.name} - ${epack.title}</h3>
                        <p>${epack.tagline}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderEPackCards() {
        return Object.values(this.epacks).map(epack => `
            <div class="epack-card ${this.activeEPack === epack.id ? 'active' : ''}" data-epack="${epack.id}">
                ${epack.image ? `
                    <div class="epack-image-container">
                        <img src="${epack.image}" alt="${epack.name}" class="epack-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="epack-icon-fallback" style="display: none;">${epack.icon}</div>
                    </div>
                ` : ''}
                <div class="epack-card-header">
                    ${!epack.image ? `<div class="epack-icon">${epack.icon}</div>` : ''}
                    <div class="epack-identity">
                        <h3 class="epack-name">${epack.name}</h3>
                        <p class="epack-title">${epack.title}</p>
                    </div>
                    <span class="epack-status ${epack.status}">${this.formatStatus(epack.status)}</span>
                </div>
                
                <p class="epack-tagline">${epack.tagline}</p>
                
                <p class="epack-description">${epack.description}</p>
                
                <div class="epack-tags">
                    ${epack.tags.slice(0, 5).map(tag => `<span class="epack-tag">#${tag}</span>`).join('')}
                </div>
                
                <div class="epack-strengths">
                    ${epack.strengths.slice(0, 3).map(s => `<span class="epack-strength">${s}</span>`).join('')}
                </div>
                
                <div class="epack-voice-preview">
                    <p><span class="speaker">${epack.name}:</span> "${epack.voiceLines[0]}"</p>
                </div>
                
                <div class="epack-actions">
                    ${this.renderEPackActions(epack)}
                </div>
            </div>
        `).join('');
    }
    
    renderEPackActions(epack) {
        if (epack.status === 'coming-soon') {
            return `
                <button class="epack-btn epack-btn-secondary" disabled>Coming Soon</button>
            `;
        }
        
        if (epack.status === 'available') {
            return `
                <button class="epack-btn epack-btn-primary">Install</button>
                <button class="epack-btn epack-btn-secondary">Preview</button>
            `;
        }
        
        // Installed
        if (this.activeEPack === epack.id) {
            return `
                <button class="epack-btn epack-btn-secondary" style="flex: 1;">✓ Active</button>
            `;
        }
        
        return `
            <button class="epack-btn epack-btn-primary">Activate</button>
            <button class="epack-btn epack-btn-secondary">Details</button>
        `;
    }
    
    formatStatus(status) {
        switch (status) {
            case 'installed': return 'Installed';
            case 'available': return 'Available';
            case 'coming-soon': return 'Coming Soon';
            default: return status;
        }
    }
    
    activateEPack(epackId) {
        const epack = this.epacks[epackId];
        if (!epack || epack.status !== 'installed') {
            console.warn('Cannot activate EPack:', epackId);
            return;
        }
        
        this.saveActiveEPack(epackId);
        
        // Update UI
        this.modal.querySelectorAll('.epack-card').forEach(card => {
            card.classList.remove('active');
            if (card.dataset.epack === epackId) {
                card.classList.add('active');
            }
        });
        
        // Update active display
        const activeSection = this.modal.querySelector('.active-epack-section');
        if (activeSection) {
            activeSection.outerHTML = this.renderActiveEPack();
        }
        
        // Re-render action buttons
        this.modal.querySelectorAll('.epack-card').forEach(card => {
            const actionsDiv = card.querySelector('.epack-actions');
            const ep = this.epacks[card.dataset.epack];
            if (actionsDiv && ep) {
                actionsDiv.innerHTML = this.renderEPackActions(ep);
                
                // Re-attach event listeners
                const activateBtn = actionsDiv.querySelector('.epack-btn-primary');
                if (activateBtn && !activateBtn.disabled) {
                    activateBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.activateEPack(card.dataset.epack);
                    });
                }
            }
        });
        
        // Notify RHEA about the personality change
        if (window.rhea) {
            window.rhea.speak(`${epack.name} activated. ${epack.voiceLines[Math.floor(Math.random() * epack.voiceLines.length)]}`);
        }
        
        console.log(`🎭 EPack activated: ${epack.name}`);
    }
    
    showEPackDetails(epackId) {
        const epack = this.epacks[epackId];
        if (!epack) return;
        
        console.log(`🎬 Playing cinematic intro for ${epack.name}...`);
        
        // Play the cinematic narrator intro with a deep voice
        if (epack.narratorIntro) {
            this.playNarratorIntro(epack);
        }
    }
    
    /**
     * Play cinematic narrator introduction with HYPE energy - INSTANT!
     */
    async playNarratorIntro(epack) {
        // Stop any current audio/speech IMMEDIATELY
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        // Stop any playing audio elements
        document.querySelectorAll('audio').forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        
        // CHECK CACHE FIRST - INSTANT PLAYBACK!
        if (this.audioCache[epack.id]) {
            console.log(`🎙️ INSTANT PLAY from cache: ${epack.name}`);
            const audio = new Audio(this.audioCache[epack.id]);
            audio.volume = 1.0;
            audio.play();
            return;
        }
        
        // Not cached yet - generate now
        console.log(`🎙️ Generating audio for ${epack.name}...`);
        
        // ElevenLabs for authentic voice!
        const elevenLabsKey = 'sk_d20b8a394ae541763fb61d05a965b11f1589bd9e488adf33';
        const narratorVoiceId = '3w1kUvxu1LioQcLgp1KY'; // DeeJay - Hype man!
        
        // Get OpenAI as fallback
        const aiConfig = localStorage.getItem('rhea_ai_config');
        let openaiKey = null;
        try {
            if (aiConfig) {
                const parsed = JSON.parse(aiConfig);
                openaiKey = parsed.apiKey;
            }
        } catch (e) {}
        
        // Try ElevenLabs first for authentic voice!
        if (elevenLabsKey) {
            try {
                console.log('🎙️ Using ElevenLabs voice...');
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${narratorVoiceId}`, {
                    method: 'POST',
                    headers: {
                        'xi-api-key': elevenLabsKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: epack.narratorIntro,
                        model_id: 'eleven_monolingual_v1',
                        voice_settings: {
                            stability: 0.3,
                            similarity_boost: 0.8,
                            style: 0.8,
                            use_speaker_boost: true
                        }
                    })
                });
                
                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    this.audioCache[epack.id] = audioUrl;
                    
                    const audio = new Audio(audioUrl);
                    audio.volume = 1.0;
                    audio.play();
                    console.log(`🎬 NOW PLAYING: "${epack.name}" - LET'S GOOO!`);
                    return;
                }
            } catch (error) {
                console.error('ElevenLabs error:', error);
            }
        }
        
        // Fallback to OpenAI
        if (openaiKey) {
            try {
                const response = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'tts-1',
                        input: epack.narratorIntro,
                        voice: 'onyx', // Deepest voice
                        speed: 1.1
                    })
                });
                
                if (response.ok) {
                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    this.audioCache[epack.id] = audioUrl;
                    
                    const audio = new Audio(audioUrl);
                    audio.volume = 1.0;
                    audio.play();
                    console.log(`🎬 NOW PLAYING: "${epack.name}" - LET'S GOOO!`);
                    return;
                }
            } catch (error) {
                console.error('OpenAI TTS error:', error);
            }
        }
        
        // Fallback to browser TTS - INSTANT!
        console.log('🎙️ Using browser HYPE voice...');
        
        if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(epack.narratorIntro);
            
            const voices = window.speechSynthesis.getVoices();
            const narratorVoice = voices.find(v => 
                v.name.includes('Alex') || v.name.includes('Fred')
            ) || voices.find(v => v.lang.startsWith('en'));
            
            if (narratorVoice) utterance.voice = narratorVoice;
            
            utterance.rate = 1.2;
            utterance.pitch = 1.1;
            utterance.volume = 1.0;
            
            window.speechSynthesis.speak(utterance);
        }
    }
    
    /**
     * Get the currently active EPack data
     */
    getActiveEPack() {
        if (this.activeEPack && this.epacks[this.activeEPack]) {
            return this.epacks[this.activeEPack];
        }
        return null;
    }
    
    /**
     * Get personality-adjusted response based on active EPack
     */
    getPersonalityResponse(baseResponse) {
        const epack = this.getActiveEPack();
        if (!epack) return baseResponse;
        
        // TODO: Implement personality-based response modification
        // This would adjust RHEA's responses based on the active EPack's personality
        return baseResponse;
    }
}

// Initialize EPacks Manager
let epacksManager;
document.addEventListener('DOMContentLoaded', () => {
    epacksManager = new EPacksManager();
    window.epacksManager = epacksManager;
});

