// ===================================
// SURAH AL-ALAQ - ENHANCED APPLICATION
// Divine Knowledge Experience
// ===================================

class SurahAlAlaqApp {
    constructor() {
        this.data = {};
        this.state = {
            currentVerse: 1,
            currentReciter: 'sudais',
            currentLanguage: 'english',
            isPlaying: false,
            isListening: false,
            bookmarks: [],
            userNotes: {},
            audioSettings: {
                volume: 0.8,
                speed: 1.0,
                autoPlay: false
            },
            preferences: {
                theme: 'default',
                fontSize: 'medium',
                showTafsir: true,
                showBenefits: true
            }
        };
        
        this.audio = null;
        this.recognition = null;
        this.speechSynthesis = window.speechSynthesis;
        this.audioContext = null;
        this.audioAnalyser = null;
        this.animationFrame = null;
        
        this.init();
    }

    // ===================================
    // INITIALIZATION
    // ===================================

    async init() {
        try {
            this.showLoading(true, 'Initializing Divine Experience...');
            
            // Load user preferences
            this.loadUserPreferences();
            
            // Initialize components
            await this.loadData();
            this.initializeAudioSystem();
            this.initializeServiceWorker();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            // Render content
            await this.renderContent();
            
            // Initialize voice recognition if available
            if (window.voiceRecognition) {
                console.log('✅ Voice recognition initialized');
            }
            
            this.showLoading(false);
            this.showNotification('🌟 Divine experience ready', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.handleError('Failed to initialize application', error);
        }
    }

    // ===================================
    // DATA LOADING WITH ERROR HANDLING
    // ===================================

    async loadData() {
        const loadPromises = [
            this.loadJSON('./assets/data/surah-alaq.json', 'surah'),
            this.loadJSON('./assets/data/tafsir-layers.json', 'tafsirLayers'),
            this.loadJSON('./assets/data/reciters.json', 'reciters'),
            this.loadJSON('./assets/data/translations.json', 'translations')
        ];

        const results = await Promise.allSettled(loadPromises);
        
        results.forEach((result, index) => {
            const keys = ['surah', 'tafsirLayers', 'reciters', 'translations'];
            const key = keys[index];
            
            if (result.status === 'fulfilled') {
                this.data[key] = result.value;
            } else {
                console.warn(`Failed to load ${key}:`, result.reason);
                this.data[key] = this.getFallbackData(key);
            }
        });

        // Validate essential data
        if (!this.data.surah || !this.data.surah.verses) {
            throw new Error('Essential surah data is missing');
        }
    }

    async loadJSON(url, type) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ Loaded ${type} data`);
            return data;
            
        } catch (error) {
            console.warn(`❌ Failed to load ${url}:`, error.message);
            throw error;
        }
    }

    getFallbackData(type) {
        const fallbacks = {
            surah: {
                surah: {
                    number: 96,
                    name: "Al-Alaq",
                    englishName: "The Clot",
                    verses: Array.from({length: 19}, (_, i) => ({
                        number: i + 1,
                        arabic: `آية ${i + 1}`,
                        translationEnglish: `Verse ${i + 1} translation`,
                        translationUrdu: `آیت ${i + 1} کا ترجمہ`,
                        translationPashto: `د ${i + 1} آیت ژباړه`,
                        modernRelevance: "This verse has profound modern relevance.",
                        benefits: ["Spiritual growth", "Divine connection", "Knowledge seeking"]
                    }))
                }
            },
            tafsirLayers: {},
            reciters: {
                sudais: { name: "Sheikh Abdul Rahman Al-Sudais", style: "Melodious" },
                alafasy: { name: "Sheikh Mishary Alafasy", style: "Beautiful" }
            },
            translations: {
                languages: {
                    english: { name: "English", direction: "ltr" },
                    urdu: { name: "Urdu", direction: "rtl" },
                    pashto: { name: "Pashto", direction: "rtl" },
                    arabic: { name: "Arabic", direction: "rtl" }
                }
            }
        };
        
        return fallbacks[type] || {};
    }

    // ===================================
    // SERVICE WORKER REGISTRATION
    // ===================================

    async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showNotification('📱 App updated! Refresh to see changes.', 'info');
                        }
                    });
                });
                
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    // ===================================
    // AUDIO SYSTEM WITH VISUALIZATION
    // ===================================

    async initializeAudioSystem() {
        try {
            // Create audio element
            this.audio = document.getElementById('recitationAudio') || this.createAudioElement();
            
            // Initialize Web Audio API for visualization
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.audioAnalyser = this.audioContext.createAnalyser();
                this.audioAnalyser.fftSize = 256;
                this.audioDataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
                
                const source = this.audioContext.createMediaElementSource(this.audio);
                source.connect(this.audioAnalyser);
                this.audioAnalyser.connect(this.audioContext.destination);
            }
            
            // Setup audio event listeners
            this.setupAudioEventListeners();
            
        } catch (error) {
            console.warn('Audio system initialization failed:', error);
        }
    }

    createAudioElement() {
        const audio = document.createElement('audio');
        audio.id = 'recitationAudio';
        audio.preload = 'none';
        audio.volume = this.state.audioSettings.volume;
        document.body.appendChild(audio);
        return audio;
    }

    setupAudioEventListeners() {
        if (!this.audio) return;

        this.audio.addEventListener('play', () => {
            this.state.isPlaying = true;
            this.updatePlayButton();
            this.startAudioVisualization();
            this.resumeAudioContext();
        });

        this.audio.addEventListener('pause', () => {
            this.state.isPlaying = false;
            this.updatePlayButton();
            this.stopAudioVisualization();
        });

        this.audio.addEventListener('ended', () => {
            this.state.isPlaying = false;
            this.updatePlayButton();
            this.stopAudioVisualization();
            
            if (this.state.audioSettings.autoPlay) {
                this.playNextVerse();
            }
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.handleAudioError(e);
        });

        this.audio.addEventListener('loadstart', () => {
            this.showLoading(true, 'Loading recitation...');
        });

        this.audio.addEventListener('canplay', () => {
            this.showLoading(false);
        });
    }

    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                console.warn('Failed to resume audio context:', error);
            }
        }
    }

    // ===================================
    // AUDIO VISUALIZATION
    // ===================================

    startAudioVisualization() {
        const visualizer = document.getElementById('audioVisualizer');
        if (visualizer && this.audioAnalyser) {
            visualizer.style.display = 'flex';
            this.animateAudioBars();
        }
    }

    stopAudioVisualization() {
        const visualizer = document.getElementById('audioVisualizer');
        if (visualizer) {
            visualizer.style.display = 'none';
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    animateAudioBars() {
        if (!this.audioAnalyser) return;
        
        this.audioAnalyser.getByteFrequencyData(this.audioDataArray);
        
        const bars = document.querySelectorAll('.audio-bar');
        bars.forEach((bar, index) => {
            const value = this.audioDataArray[index * 8] || 0;
            const height = Math.max(4, (value / 255) * 40);
            bar.style.height = `${height}px`;
        });
        
        this.animationFrame = requestAnimationFrame(() => this.animateAudioBars());
    }

    // ===================================
    // CONTENT RENDERING
    // ===================================

    async renderContent() {
        try {
            const mainContent = document.getElementById('mainContent');
            if (!mainContent) {
                throw new Error('Main content container not found');
            }

            const surah = this.data.surah?.surah || this.data.surah;
            if (!surah?.verses) {
                throw new Error('Surah verses data not available');
            }

            // Clear existing content
            mainContent.innerHTML = '';

            // Render header
            this.renderHeader();

            // Render verses
            for (let i = 0; i < surah.verses.length; i++) {
                const verseElement = await this.createVerseElement(surah.verses[i], i);
                mainContent.appendChild(verseElement);
            }

            // Render controls
            this.renderControls();
            
            // Render audio visualizer
            this.renderAudioVisualizer();

            console.log('✅ Content rendered successfully');

        } catch (error) {
            console.error('Content rendering error:', error);
            this.handleError('Failed to render content', error);
        }
    }

    renderHeader() {
        const header = document.querySelector('.header') || this.createHeader();
        const surah = this.data.surah?.surah || this.data.surah;
        
        if (surah) {
            const title = header.querySelector('.surah-title');
            if (title) {
                title.textContent = `${surah.number}. ${surah.name} (${surah.englishName})`;
            }
        }
    }

    createHeader() {
        const header = document.createElement('header');
        header.className = 'header';
        header.innerHTML = `
            <div class="header-content">
                <a href="#" class="logo">
                    <span class="surah-title">96. Al-Alaq (The Clot)</span>
                </a>
                <nav class="nav-menu">
                    <a href="#" class="nav-link" onclick="app.showSettings()">Settings</a>
                    <a href="#" class="nav-link" onclick="app.showBookmarks()">Bookmarks</a>
                    <a href="#" class="nav-link" onclick="app.showHelp()">Help</a>
                </nav>
            </div>
        `;
        
        document.body.insertBefore(header, document.body.firstChild);
        return header;
    }

    async createVerseElement(verse, index) {
        const verseDiv = document.createElement('article');
        verseDiv.className = 'verse-container';
        verseDiv.id = `verse-${verse.number}`;
        verseDiv.setAttribute('data-verse', verse.number);
        verseDiv.setAttribute('role', 'article');
        verseDiv.setAttribute('aria-labelledby', `verse-title-${verse.number}`);

        const tafsirLayers = this.data.tafsirLayers[verse.number] || {};
        const isBookmarked = this.state.bookmarks.includes(verse.number);
        const userNote = this.state.userNotes[verse.number] || '';

        try {
            verseDiv.innerHTML = await this.generateVerseHTML(verse, tafsirLayers, isBookmarked, userNote);
        } catch (error) {
            console.error(`Error creating verse ${verse.number}:`, error);
            verseDiv.innerHTML = this.generateFallbackVerseHTML(verse);
        }

        return verseDiv;
    }

    async generateVerseHTML(verse, tafsirLayers, isBookmarked, userNote) {
        return `
            <div class="verse-header">
                <div class="verse-number" id="verse-title-${verse.number}">${verse.number}</div>
                <div class="verse-actions">
                    <button class="action-btn bookmark-btn ${isBookmarked ? 'active' : ''}" 
                            onclick="app.toggleBookmark(${verse.number})" 
                            title="Bookmark this verse"
                            aria-label="Bookmark verse ${verse.number}">
                        🔖
                    </button>
                    <button class="action-btn play-btn" 
                            onclick="app.playVerse(${verse.number})" 
                            title="Play recitation"
                            aria-label="Play verse ${verse.number}">
                        ▶️
                    </button>
                    <button class="action-btn copy-btn" 
                            onclick="app.copyVerse(${verse.number})" 
                            title="Copy verse"
                            aria-label="Copy verse ${verse.number}">
                        📋
                    </button>
                    <button class="action-btn share-btn" 
                            onclick="app.shareVerse(${verse.number})" 
                            title="Share verse"
                            aria-label="Share verse ${verse.number}">
                        🔗
                    </button>
                </div>
            </div>
            
            <div class="arabic-text" lang="ar" dir="rtl">${verse.arabic}</div>
            
            <div class="translation-tabs" role="tablist">
                <button class="tab-btn active" 
                        role="tab" 
                        aria-selected="true"
                        onclick="app.showTranslation(${verse.number}, 'english')">
                    English
                </button>
                <button class="tab-btn" 
                        role="tab" 
                        aria-selected="false"
                        onclick="app.showTranslation(${verse.number}, 'urdu')">
                    اردو
                </button>
                <button class="tab-btn" 
                        role="tab" 
                        aria-selected="false"
                        onclick="app.showTranslation(${verse.number}, 'pashto')">
                    پښتو
                </button>
            </div>
            
            <div class="translation-content" id="translation-${verse.number}-english">
                ${verse.translationEnglish || 'Translation not available'}
            </div>
            <div class="translation-content hidden" id="translation-${verse.number}-urdu" dir="rtl">
                ${verse.translationUrdu || 'ترجمہ دستیاب نہیں'}
            </div>
            <div class="translation-content hidden" id="translation-${verse.number}-pashto" dir="rtl">
                ${verse.translationPashto || 'ژباړه شته نده'}
            </div>
            
            ${this.generateModernRelevanceHTML(verse)}
            ${this.generateBenefitsHTML(verse)}
            ${this.generateTafsirLayersHTML(tafsirLayers)}
            ${this.generateSufiInterpretationHTML(verse)}
            ${this.generateWordAnalysisHTML(verse)}
            ${userNote ? this.generateUserNoteHTML(userNote) : ''}
        `;
    }

    generateFallbackVerseHTML(verse) {
        return `
            <div class="verse-header">
                <div class="verse-number">${verse.number}</div>
                <div class="verse-actions">
                    <button class="action-btn" onclick="app.playVerse(${verse.number})">▶️</button>
                </div>
            </div>
            <div class="arabic-text" lang="ar" dir="rtl">${verse.arabic}</div>
            <div class="translation-content">${verse.translationEnglish || 'Translation not available'}</div>
        `;
    }

    generateModernRelevanceHTML(verse) {
        if (!verse.modernRelevance) return '';
        
        return `
            <div class="modern-relevance">
                <h4>🌐 Modern Relevance</h4>
                <p>${verse.modernRelevance}</p>
            </div>
        `;
    }

    generateBenefitsHTML(verse) {
        if (!verse.benefits || !Array.isArray(verse.benefits)) return '';
        
        return `
            <div class="verse-benefits">
                <h4>✨ Spiritual Benefits</h4>
                <div class="benefits-grid">
                    ${verse.benefits.map(benefit => `
                        <div class="benefit-item">${benefit}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateTafsirLayersHTML(tafsirLayers) {
        if (!tafsirLayers || Object.keys(tafsirLayers).length === 0) return '';
        
        const layers = ['cosmic', 'psychological', 'social', 'spiritual'];
        const layerTitles = {
            cosmic: '🌌 Cosmic Dimension',
            psychological: '🧠 Psychological Insight',
            social: '👥 Social Wisdom',
            spiritual: '✨ Spiritual Depth'
        };
        
        return `
            <div class="tafsir-layers">
                <h4>📚 Multi-Layered Tafsir</h4>
                ${layers.map(layer => {
                    if (!tafsirLayers[layer]) return '';
                    return `
                        <div class="tafsir-layer ${layer}">
                            <h5 class="layer-title">${layerTitles[layer]}</h5>
                            <div class="layer-content">${tafsirLayers[layer]}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    generateSufiInterpretationHTML(verse) {
        if (!verse.sufiInterpretation) return '';
        
        return `
            <div class="sufi-interpretation">
                <div class="mystical-symbol">☪️</div>
                <h4>🌙 Sufi Interpretation</h4>
                <p>${verse.sufiInterpretation}</p>
            </div>
        `;
    }

    generateWordAnalysisHTML(verse) {
        if (!verse.wordAnalysis || !Array.isArray(verse.wordAnalysis)) return '';
        
        return `
            <div class="word-analysis">
                <h4>📖 Word Analysis</h4>
                <div class="words-grid">
                    ${verse.wordAnalysis.map(word => `
                        <div class="word-item">
                            <div class="arabic-word" dir="rtl">${word.arabic}</div>
                            <div class="word-meaning">${word.meaning}</div>
                            <div class="word-significance">${word.significance}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateUserNoteHTML(note) {
        return `
            <div class="user-note">
                <h4>📝 Your Note</h4>
                <p>${note}</p>
            </div>
        `;
    }

    renderControls() {
        let controlsContainer = document.querySelector('.controls');
        if (!controlsContainer) {
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'controls';
            document.body.appendChild(controlsContainer);
        }

        controlsContainer.innerHTML = `
            <button class="control-btn voice-btn" 
                    onclick="app.toggleVoiceRecognition()" 
                    title="Voice Search"
                    aria-label="Toggle voice search">
                🎤
            </button>
            <button class="control-btn play-all-btn" 
                    onclick="app.playAll()" 
                    title="Play All"
                    aria-label="Play all verses">
                ⏯️
            </button>
            <button class="control-btn settings-btn" 
                    onclick="app.showSettings()" 
                    title="Settings"
                    aria-label="Open settings">
                ⚙️
            </button>
        `;
    }

    renderAudioVisualizer() {
        let visualizer = document.getElementById('audioVisualizer');
        if (!visualizer) {
            visualizer = document.createElement('div');
            visualizer.id = 'audioVisualizer';
            visualizer.className = 'audio-visualizer';
            
            // Create audio bars
            for (let i = 0; i < 32; i++) {
                const bar = document.createElement('div');
                bar.className = 'audio-bar';
                visualizer.appendChild(bar);
            }
            
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.insertBefore(visualizer, mainContent.firstChild);
            }
        }
    }

    // ===================================
    // AUDIO PLAYBACK
    // ===================================

    async playVerse(verseNumber) {
        try {
            if (!this.audio) {
                throw new Error('Audio system not initialized');
            }

            const audioUrl = this.getVerseAudioUrl(verseNumber);
            if (!audioUrl) {
                throw new Error(`Audio not available for verse ${verseNumber}`);
            }

            this.showLoading(true, `Loading verse ${verseNumber}...`);
            
            this.audio.src = audioUrl;
            this.audio.currentTime = 0;
            
            await this.audio.play();
            this.state.currentVerse = verseNumber;
            this.highlightCurrentVerse(verseNumber);
            
        } catch (error) {
            console.error('Playback error:', error);
            this.handleAudioError(error);
        } finally {
            this.showLoading(false);
        }
    }

    getVerseAudioUrl(verseNumber) {
        const reciter = this.state.currentReciter;
        const paddedNumber = String(verseNumber).padStart(3, '0');
        
        // Try different audio sources in order of preference
        const audioSources = [
            `./assets/audio/reciters/${reciter}/096_${paddedNumber}.mp3`,
            `./assets/audio/reciters/sudais/096_${paddedNumber}.mp3`,
            `./assets/audio/reciters/alafasy/096_${paddedNumber}.mp3`,
            `./assets/audio/fallback/096_${paddedNumber}.mp3`
        ];
        
        return audioSources[0]; // Return first preference for now
    }

    async playAll() {
        try {
            this.state.audioSettings.autoPlay = true;
            await this.playVerse(1);
        } catch (error) {
            console.error('Play all error:', error);
            this.handleError('Failed to start playback', error);
        }
    }

    playNextVerse() {
        const nextVerse = this.state.currentVerse + 1;
        const maxVerses = this.data.surah?.surah?.verses?.length || 19;
        
        if (nextVerse <= maxVerses) {
            this.playVerse(nextVerse);
        } else {
            this.state.audioSettings.autoPlay = false;
            this.showNotification('🎉 Completed Surah Al-Alaq', 'success');
        }
    }

    togglePlayback() {
        if (!this.audio) return;

        if (this.state.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play().catch(error => {
                console.error('Play error:', error);
                this.handleAudioError(error);
            });
        }
    }

    updatePlayButton() {
        const playButtons = document.querySelectorAll('.play-btn, .play-all-btn');
        playButtons.forEach(btn => {
            if (btn.classList.contains('play-all-btn')) {
                btn.textContent = this.state.isPlaying ? '⏸️' : '⏯️';
                btn.title = this.state.isPlaying ? 'Pause' : 'Play All';
            }
        });
    }

    highlightCurrentVerse(verseNumber) {
        // Remove previous highlights
        document.querySelectorAll('.verse-container.current').forEach(el => {
            el.classList.remove('current');
        });
        
        // Highlight current verse
        const currentVerse = document.getElementById(`verse-${verseNumber}`);
        if (currentVerse) {
            currentVerse.classList.add('current');
            currentVerse.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ===================================
    // VOICE RECOGNITION INTEGRATION
    // ===================================

    toggleVoiceRecognition() {
        if (window.voiceRecognition) {
            window.voiceRecognition.toggle();
        } else {
            this.showNotification('🎤 Voice recognition not available', 'warning');
        }
    }

    // ===================================
    // TRANSLATION MANAGEMENT
    // ===================================

    showTranslation(verseNumber, language) {
        try {
            // Update tab states
            const tabs = document.querySelectorAll(`#verse-${verseNumber} .tab-btn`);
            tabs.forEach(tab => {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            });
            
            const activeTab = document.querySelector(`#verse-${verseNumber} .tab-btn[onclick*="${language}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
                activeTab.setAttribute('aria-selected', 'true');
            }
            
            // Update content visibility
            const contents = document.querySelectorAll(`#verse-${verseNumber} .translation-content`);
            contents.forEach(content => content.classList.add('hidden'));
            
            const targetContent = document.getElementById(`translation-${verseNumber}-${language}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            this.state.currentLanguage = language;
            
        } catch (error) {
            console.error('Translation display error:', error);
        }
    }

    // ===================================
    // BOOKMARK MANAGEMENT
    // ===================================

    toggleBookmark(verseNumber) {
        try {
            const index = this.state.bookmarks.indexOf(verseNumber);
            
            if (index === -1) {
                this.state.bookmarks.push(verseNumber);
                this.showNotification(`📖 Verse ${verseNumber} bookmarked`, 'success');
            } else {
                this.state.bookmarks.splice(index, 1);
                this.showNotification(`📖 Verse ${verseNumber} bookmark removed`, 'info');
            }
            
            // Update bookmark button
            const bookmarkBtn = document.querySelector(`#verse-${verseNumber} .bookmark-btn`);
            if (bookmarkBtn) {
                bookmarkBtn.classList.toggle('active', this.state.bookmarks.includes(verseNumber));
            }
            
            this.saveUserPreferences();
            
        } catch (error) {
            console.error('Bookmark error:', error);
        }
    }

    showBookmarks() {
        if (this.state.bookmarks.length === 0) {
            this.showNotification('📖 No bookmarks yet', 'info');
            return;
        }
        
        const bookmarksList = this.state.bookmarks.map(verseNum => {
            const verse = this.data.surah?.surah?.verses?.find(v => v.number === verseNum);
            return `
                <div class="bookmark-item" onclick="app.scrollToVerse(${verseNum})">
                    <span class="bookmark-number">${verseNum}</span>
                    <span class="bookmark-text">${verse?.translationEnglish?.substring(0, 100) || 'Verse ' + verseNum}...</span>
                </div>
            `;
        }).join('');
        
        this.showModal('📖 Your Bookmarks', `
            <div class="bookmarks-list">
                ${bookmarksList}
            </div>
        `);
    }

    scrollToVerse(verseNumber) {
        const verseElement = document.getElementById(`verse-${verseNumber}`);
        if (verseElement) {
            verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.closeModal();
        }
    }

    // ===================================
    // SHARING AND COPYING
    // ===================================

    async copyVerse(verseNumber) {
        try {
            const verse = this.data.surah?.surah?.verses?.find(v => v.number === verseNumber);
            if (!verse) {
                throw new Error('Verse not found');
            }
            
            const text = `
Surah Al-Alaq, Verse ${verseNumber}

${verse.arabic}

${verse.translationEnglish}

Source: Surah Al-Alaq Digital Experience
            `.trim();
            
            await navigator.clipboard.writeText(text);
            this.showNotification(`📋 Verse ${verseNumber} copied to clipboard`, 'success');
            
        } catch (error) {
            console.error('Copy error:', error);
            this.showNotification('❌ Failed to copy verse', 'error');
        }
    }

    async shareVerse(verseNumber) {
        try {
            const verse = this.data.surah?.surah?.verses?.find(v => v.number === verseNumber);
            if (!verse) {
                throw new Error('Verse not found');
            }
            
            const shareData = {
                title: `Surah Al-Alaq, Verse ${verseNumber}`,
                text: `${verse.arabic}\n\n${verse.translationEnglish}`,
                url: `${window.location.origin}${window.location.pathname}#verse-${verseNumber}`
            };
            
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback to copying URL
                await navigator.clipboard.writeText(shareData.url);
                this.showNotification('🔗 Verse link copied to clipboard', 'success');
            }
            
        } catch (error) {
            console.error('Share error:', error);
            this.showNotification('❌ Failed to share verse', 'error');
        }
    }

    // ===================================
    // USER PREFERENCES
    // ===================================

    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('surah-alaq-preferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                this.state = { ...this.state, ...preferences };
            }
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
        }
    }

    saveUserPreferences() {
        try {
            const toSave = {
                bookmarks: this.state.bookmarks,
                userNotes: this.state.userNotes,
                audioSettings: this.state.audioSettings,
                preferences: this.state.preferences,
                currentReciter: this.state.currentReciter,
                currentLanguage: this.state.currentLanguage
            };
            
            localStorage.setItem('surah-alaq-preferences', JSON.stringify(toSave));
        } catch (error) {
            console.warn('Failed to save user preferences:', error);
        }
    }

    // ===================================
    // SETTINGS MODAL
    // ===================================

    showSettings() {
        const settingsHTML = `
            <div class="settings-grid">
                <div class="setting-group">
                    <h4>🎵 Audio Settings</h4>
                    <label>
                        Reciter:
                        <select id="reciterSelect" onchange="app.changeReciter(this.value)">
                            <option value="sudais" ${this.state.currentReciter === 'sudais' ? 'selected' : ''}>Sheikh Al-Sudais</option>
                            <option value="alafasy" ${this.state.currentReciter === 'alafasy' ? 'selected' : ''}>Sheikh Alafasy</option>
                            <option value="husary" ${this.state.currentReciter === 'husary' ? 'selected' : ''}>Sheikh Al-Husary</option>
                            <option value="maher" ${this.state.currentReciter === 'maher' ? 'selected' : ''}>Sheikh Maher</option>
                        </select>
                    </label>
                    <label>
                        Volume:
                        <input type="range" min="0" max="1" step="0.1" value="${this.state.audioSettings.volume}" 
                               onchange="app.changeVolume(this.value)">
                    </label>
                    <label>
                        <input type="checkbox" ${this.state.audioSettings.autoPlay ? 'checked' : ''} 
                               onchange="app.toggleAutoPlay(this.checked)">
                        Auto-play next verse
                    </label>
                </div>
                
                <div class="setting-group">
                    <h4>🌐 Display Settings</h4>
                    <label>
                        Default Language:
                        <select id="languageSelect" onchange="app.changeDefaultLanguage(this.value)">
                            <option value="english" ${this.state.currentLanguage === 'english' ? 'selected' : ''}>English</option>
                            <option value="urdu" ${this.state.currentLanguage === 'urdu' ? 'selected' : ''}>اردو</option>
                            <option value="pashto" ${this.state.currentLanguage === 'pashto' ? 'selected' : ''}>پښتو</option>
                        </select>
                    </label>
                    <label>
                        <input type="checkbox" ${this.state.preferences.showTafsir ? 'checked' : ''} 
                               onchange="app.toggleTafsir(this.checked)">
                        Show Tafsir Layers
                    </label>
                    <label>
                        <input type="checkbox" ${this.state.preferences.showBenefits ? 'checked' : ''} 
                               onchange="app.toggleBenefits(this.checked)">
                        Show Benefits
                    </label>
                </div>
            </div>
        `;
        
        this.showModal('⚙️ Settings', settingsHTML);
    }

    changeReciter(reciter) {
        this.state.currentReciter = reciter;
        this.saveUserPreferences();
        this.showNotification(`🎵 Reciter changed to ${reciter}`, 'success');
    }

    changeVolume(volume) {
        this.state.audioSettings.volume = parseFloat(volume);
        if (this.audio) {
            this.audio.volume = this.state.audioSettings.volume;
        }
        this.saveUserPreferences();
    }

    toggleAutoPlay(enabled) {
        this.state.audioSettings.autoPlay = enabled;
        this.saveUserPreferences();
    }

    changeDefaultLanguage(language) {
        this.state.currentLanguage = language;
        this.saveUserPreferences();
        this.showNotification(`🌐 Default language changed to ${language}`, 'success');
    }

    toggleTafsir(show) {
        this.state.preferences.showTafsir = show;
        this.saveUserPreferences();
        this.updateContentVisibility();
    }

    toggleBenefits(show) {
        this.state.preferences.showBenefits = show;
        this.saveUserPreferences();
        this.updateContentVisibility();
    }

    updateContentVisibility() {
        const tafsirElements = document.querySelectorAll('.tafsir-layers');
        const benefitElements = document.querySelectorAll('.verse-benefits');
        
        tafsirElements.forEach(el => {
            el.style.display = this.state.preferences.showTafsir ? 'block' : 'none';
        });
        
        benefitElements.forEach(el => {
            el.style.display = this.state.preferences.showBenefits ? 'block' : 'none';
        });
    }

    // ===================================
    // MODAL SYSTEM
    // ===================================

    showModal(title, content) {
        let modal = document.getElementById('modal');
        if (!modal) {
            modal = this.createModal();
        }
        
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        
        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = content;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title"></h3>
                    <button class="close-btn" onclick="app.closeModal()" aria-label="Close modal">×</button>
                </div>
                <div class="modal-body"></div>
            </div>
        `;
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        document.body.appendChild(modal);
        return modal;
    }

    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ===================================
    // HELP SYSTEM
    // ===================================

    showHelp() {
        const helpContent = `
            <div class="help-content">
                <div class="help-section">
                    <h4>🎵 Audio Controls</h4>
                    <ul>
                        <li><strong>▶️ Play Button:</strong> Play individual verse recitation</li>
                        <li><strong>⏯️ Play All:</strong> Play all verses continuously</li>
                        <li><strong>🎤 Voice Search:</strong> Ask questions about the surah</li>
                    </ul>
                </div>
                
                <div class="help-section">
                    <h4>📖 Navigation</h4>
                    <ul>
                        <li><strong>🔖 Bookmark:</strong> Save verses for later reference</li>
                        <li><strong>📋 Copy:</strong> Copy verse text to clipboard</li>
                        <li><strong>🔗 Share:</strong> Share verse with others</li>
                    </ul>
                </div>
                
                <div class="help-section">
                    <h4>🌐 Languages</h4>
                    <ul>
                        <li><strong>English:</strong> Modern translation</li>
                        <li><strong>اردو:</strong> Urdu translation</li>
                        <li><strong>پښتو:</strong> Pashto translation</li>
                    </ul>
                </div>
                
                <div class="help-section">
                    <h4>⌨️ Keyboard Shortcuts</h4>
                    <ul>
                        <li><strong>Ctrl/Cmd + Space:</strong> Activate voice search</li>
                        <li><strong>Space:</strong> Play/pause current audio</li>
                        <li><strong>Escape:</strong> Close modals or stop voice recognition</li>
                        <li><strong>Arrow Keys:</strong> Navigate between verses</li>
                    </ul>
                </div>
            </div>
        `;
        
        this.showModal('❓ Help & Guide', helpContent);
    }

    // ===================================
    // EVENT LISTENERS
    // ===================================

    setupEventListeners() {
        // Scroll header effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (header) {
                header.classList.toggle('scrolled', window.scrollY > 50);
            }
        });

        // Modal close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                if (window.voiceRecognition?.isListening) {
                    window.voiceRecognition.stopListening();
                }
            }
        });

        // Error handling for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError('An unexpected error occurred', event.reason);
        });

        // Online/offline status
        window.addEventListener('online', () => {
            this.showNotification('🌐 Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('📱 Working offline', 'info');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayback();
                    break;
                    
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousVerse();
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextVerse();
                    break;
                    
                case 'b':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.showBookmarks();
                    }
                    break;
                    
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.showSettings();
                    }
                    break;
            }

            // Voice activation with Ctrl/Cmd + Space
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                this.toggleVoiceRecognition();
            }
        });
    }

    previousVerse() {
        if (this.state.currentVerse > 1) {
            this.playVerse(this.state.currentVerse - 1);
        }
    }

    nextVerse() {
        const maxVerses = this.data.surah?.surah?.verses?.length || 19;
        if (this.state.currentVerse < maxVerses) {
            this.playVerse(this.state.currentVerse + 1);
        }
    }

    // ===================================
    // ERROR HANDLING
    // ===================================

    handleError(message, error = null) {
        console.error(message, error);
        
        let errorMessage = message;
        if (error?.message) {
            errorMessage += `: ${error.message}`;
        }
        
        this.showNotification(`❌ ${errorMessage}`, 'error');
    }

    handleAudioError(error) {
        let message = 'Audio playback failed';
        
        if (error.target?.error) {
            switch (error.target.error.code) {
                case 1:
                    message = 'Audio loading was aborted';
                    break;
                case 2:
                    message = 'Network error occurred while loading audio';
                    break;
                case 3:
                    message = 'Audio format not supported';
                    break;
                case 4:
                    message = 'Audio source not available';
                    break;
            }
        }
        
        this.showNotification(`🔊 ${message}`, 'error');
    }

    // ===================================
    // NOTIFICATION SYSTEM
    // ===================================

    showNotification(message, type = 'info', duration = 4000) {
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = this.createNotification();
        }

        const styles = {
            success: { bg: 'rgba(16, 185, 129, 0.9)', border: '#10b981' },
            error: { bg: 'rgba(239, 68, 68, 0.9)', border: '#ef4444' },
            warning: { bg: 'rgba(245, 158, 11, 0.9)', border: '#f59e0b' },
            info: { bg: 'rgba(59, 130, 246, 0.9)', border: '#3b82f6' }
        };

        const style = styles[type] || styles.info;
        notification.style.background = style.bg;
        notification.style.borderColor = style.border;
        notification.textContent = message;
        notification.style.display = 'block';

        // Auto hide
        setTimeout(() => {
            if (notification) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    notification.style.display = 'none';
                    notification.style.animation = '';
                }, 300);
            }
        }, duration);
    }

    createNotification() {
        const notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            z-index: 10001;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            border: 2px solid;
            color: white;
            display: none;
        `;
        
        document.body.appendChild(notification);
        return notification;
    }

    showLoading(show, message = 'Loading...') {
        let loading = document.getElementById('loading');
        if (!loading) {
            loading = this.createLoading();
        }

        const loadingText = loading.querySelector('.loading-text');
        if (loadingText && message) {
            loadingText.textContent = message;
        }

        loading.style.display = show ? 'block' : 'none';
        loading.classList.toggle('active', show);
    }

    createLoading() {
        const loading = document.createElement('div');
        loading.id = 'loading';
        loading.className = 'loading';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading...</div>
        `;
        
        document.body.appendChild(loading);
        return loading;
    }
}

// ===================================
// GLOBAL FUNCTIONS FOR COMPATIBILITY
// ===================================

function toggleVoiceRecognition() {
    if (window.app) {
        window.app.toggleVoiceRecognition();
    }
}

function closeModal() {
    if (window.app) {
        window.app.closeModal();
    }
}

// ===================================
// APPLICATION INITIALIZATION
// ===================================

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SurahAlAlaqApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.app?.audio && !window.app.audio.paused) {
        // Optionally pause audio when page is hidden
        // window.app.audio.pause();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SurahAlAlaqApp;
}

