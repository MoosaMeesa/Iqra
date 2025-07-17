
        // Enhanced Application State Management
        class SurahAlAqalApp {
            constructor() {
                this.state = {
                    currentVerse: 0,
                    isLoading: false,
                    isListening: false,
                    isPlaying: false,
                    currentLanguage: 'english',
                    searchResults: [],
                    bookmarks: JSON.parse(localStorage.getItem('surah-alaq-bookmarks') || '[]'),
                    userNotes: JSON.parse(localStorage.getItem('surah-alaq-notes') || '{}'),
                    preferences: JSON.parse(localStorage.getItem('surah-alaq-preferences') || '{}'),
                    audioSettings: {
                        volume: 0.8,
                        speed: 1.0,
                        reciter: 'sudais'
                    }
                };

                this.recognition = null;
                this.speechSynthesis = window.speechSynthesis;
                this.audioContext = null;
                this.audioAnalyser = null;
                this.audioDataArray = null;
                this.animationFrame = null;

                this.data = {
                    surah: null,
                    tafsirLayers: null,
                    reciters: null,
                    translations: null
                };

                this.eventListeners = new Map();
                this.intersectionObserver = null;
                this.mutationObserver = null;

                this.init();
            }

            async init() {
                try {
                    this.showLoading(true, 'Initializing Divine Knowledge...');
                    
                    // Initialize core systems
                    await this.loadData();
                    this.setupEventListeners();
                    this.initializeVoiceRecognition();
                    this.initializeAudioSystem();
                    this.setupIntersectionObserver();
                    this.setupMutationObserver();
                    this.setupDarkMode();
                    this.setupAccessibility();
                    this.setupPWA();
                    
                    // Render content
                    await this.renderContent();
                    
                    // Initialize features
                    this.initializeSearchSystem();
                    this.initializeBookmarkSystem();
                    this.initializeNoteSystem();
                    this.restoreUserPreferences();
                    
                    this.showLoading(false);
                    this.showNotification('✨ Divine Knowledge Platform Ready', 'success');
                    
                } catch (error) {
                    console.error('Initialization error:', error);
                    this.showLoading(false);
                    this.showNotification('❌ Failed to load. Please refresh.', 'error');
                }
            }

            // Enhanced Data Loading System
            async loadData() {
                try {
                    const dataPromises = [
                        this.loadJSON('./assets/data/surah-alaq.json'),
                        this.loadJSON('./assets/data/tafsir-layers.json'),
                        this.loadJSON('./assets/data/reciters.json'),
                        this.loadJSON('./assets/data/translations.json')
                    ];

                    const [surah, tafsirLayers, reciters, translations] = await Promise.all(dataPromises);
                    
                    this.data = {
                        surah: surah || this.getFallbackSurahData(),
                        tafsirLayers: tafsirLayers || {},
                        reciters: reciters || this.getFallbackReciters(),
                        translations: translations || {}
                    };

                } catch (error) {
                    console.warn('Using fallback data due to loading error:', error);
                    this.data = {
                        surah: this.getFallbackSurahData(),
                        tafsirLayers: {},
                        reciters: this.getFallbackReciters(),
                        translations: {}
                    };
                }
            }

            async loadJSON(url) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return await response.json();
                } catch (error) {
                    console.warn(`Failed to load ${url}:`, error);
                    return null;
                }
            }

            // Enhanced Voice Recognition System
            initializeVoiceRecognition() {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    console.warn('Speech recognition not supported');
                    return;
                }

                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                
                this.recognition.continuous = false;
                this.recognition.interimResults = true;
                this.recognition.maxAlternatives = 3;
                
                // Dynamic language detection
                this.recognition.lang = this.detectLanguage();
                
                this.recognition.onstart = () => {
                    this.state.isListening = true;
                    this.updateVoiceButton();
                    this.showVoiceResponse('🎤 Listening... Ask your question');
                };
                
                this.recognition.onresult = (event) => {
                    let transcript = '';
                    let isFinal = false;
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        transcript += result[0].transcript;
                        if (result.isFinal) isFinal = true;
                    }
                    
                    if (isFinal) {
                        this.processVoiceQuestion(transcript);
                    } else {
                        this.showVoiceResponse(`🎤 Hearing: "${transcript}"`);
                    }
                };
                
                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    this.handleVoiceError(event.error);
                    this.stopListening();
                };
                
                this.recognition.onend = () => {
                    this.stopListening();
                };
            }

            detectLanguage() {
                const userLang = navigator.language || navigator.userLanguage;
                if (userLang.startsWith('ur')) return 'ur-PK';
                if (userLang.startsWith('ar')) return 'ar-SA';
                if (userLang.startsWith('ps')) return 'ps-AF';
                return 'en-US';
            }

            // Enhanced Audio System
            async initializeAudioSystem() {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.audioAnalyser = this.audioContext.createAnalyser();
                    this.audioAnalyser.fftSize = 256;
                    this.audioDataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
                    
                    const audio = document.getElementById('recitationAudio');
                    if (audio) {
                        const source = this.audioContext.createMediaElementSource(audio);
                        source.connect(this.audioAnalyser);
                        this.audioAnalyser.connect(this.audioContext.destination);
                        
                        audio.addEventListener('play', () => this.startAudioVisualization());
                        audio.addEventListener('pause', () => this.stopAudioVisualization());
                        audio.addEventListener('ended', () => this.stopAudioVisualization());
                    }
                } catch (error) {
                    console.warn('Audio context initialization failed:', error);
                }
            }

            startAudioVisualization() {
                const visualizer = document.getElementById('audioVisualizer');
                if (visualizer) {
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
                    const height = Math.max(10, (value / 255) * 30);
                    bar.style.height = `${height}px`;
                });
                
                this.animationFrame = requestAnimationFrame(() => this.animateAudioBars());
            }

            // Enhanced Search System
            initializeSearchSystem() {
                const searchInput = document.getElementById('searchInput');
                if (!searchInput) return;

                // Debounced search
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.performLiveSearch(e.target.value);
                    }, 300);
                });

                // Enhanced keyboard navigation
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.performSearch();
                    } else if (e.key === 'Escape') {
                        this.clearSearch();
                    }
                });
            }

            async performLiveSearch(query) {
                if (!query || query.length < 2) {
                    this.hideSearchResults();
                    return;
                }

                const results = this.searchInContent(query);
                this.displaySearchResults(results);
            }

            searchInContent(query) {
                const results = [];
                const lowerQuery = query.toLowerCase();
                const surah = this.data.surah;

                if (!surah || !surah.verses) return results;

                surah.verses.forEach((verse, index) => {
                    const searchableText = [
                        verse.arabic,
                        verse.translationEnglish,
                        verse.translationUrdu,
                        verse.translationPashto,
                        verse.transliteration,
                        ...(verse.tafsirLayers ? Object.values(verse.tafsirLayers) : []),
                        ...(verse.wordAnalysis ? verse.wordAnalysis.map(w => w.meaning + ' ' + w.significance) : [])
                    ].join(' ').toLowerCase();

                    if (searchableText.includes(lowerQuery)) {
                        results.push({
                            verseNumber: verse.number,
                            relevance: this.calculateRelevance(searchableText, lowerQuery),
                            context: this.extractContext(searchableText, lowerQuery),
                            verse: verse
                        });
                    }
                });

                return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
            }

            calculateRelevance(text, query) {
                const words = query.split(' ');
                let score = 0;
                
                words.forEach(word => {
                    const regex = new RegExp(word, 'gi');
                    const matches = text.match(regex);
                    if (matches) {
                        score += matches.length;
                    }
                });

                return score;
            }

            extractContext(text, query, contextLength = 100) {
                const index = text.toLowerCase().indexOf(query.toLowerCase());
                if (index === -1) return text.substring(0, contextLength);
                
                const start = Math.max(0, index - contextLength / 2);
                const end = Math.min(text.length, index + query.length + contextLength / 2);
                
                return text.substring(start, end);
            }

            displaySearchResults(results) {
                const resultsContainer = document.getElementById('searchResults');
                if (!resultsContainer) return;

                if (results.length === 0) {
                    resultsContainer.style.display = 'none';
                    return;
                }

                resultsContainer.innerHTML = results.map(result => `
                    <div class="search-result-item" onclick="app.navigateToSearchResult(${result.verseNumber})">
                        <div class="search-result-verse">Verse ${result.verseNumber}</div>
                        <div class="search-result-context">${this.highlightQuery(result.context, document.getElementById('searchInput').value)}</div>
                    </div>
                `).join('');

                resultsContainer.classList.add('active');
            }

            highlightQuery(text, query) {
                if (!query) return text;
                const regex = new RegExp(`(${query})`, 'gi');
                return text.replace(regex, '<span class="search-highlight">$1</span>');
            }

            navigateToSearchResult(verseNumber) {
                this.scrollToVerse(verseNumber);
                this.hideSearchResults();
                this.showNotification(`📖 Navigated to Verse ${verseNumber}`, 'info');
            }

            hideSearchResults() {
                const resultsContainer = document.getElementById('searchResults');
                if (resultsContainer) {
                    resultsContainer.classList.remove('active');
                }
            }

            // Enhanced Voice Processing
            async processVoiceQuestion(question) {
                this.showLoading(true, 'Processing your question...');
                
                try {
                    // Detect question language and intent
                    const intent = this.analyzeIntent(question);
                    const answer = await this.generateIntelligentAnswer(question, intent);
                    
                    this.showVoiceResponse(answer);
                    await this.speakAnswer(answer, intent.language);
                    
                    // Log interaction for learning
                    this.logInteraction(question, answer, intent);
                    
                } catch (error) {
                    console.error('Voice processing error:', error);
                    this.showVoiceResponse('❌ Sorry, I could not process your question. Please try again.');
                } finally {
                    this.showLoading(false);
                }
            }

            analyzeIntent(question) {
                const q = question.toLowerCase();
                
                // Language detection
                let language = 'english';
                if (/[\u0600-\u06FF]/.test(question)) {
                    language = /[\u0627-\u064A]/.test(question) ? 'arabic' : 'urdu';
                } else if (/[ټ ډ ړ ږ ښ ګ ځ څ]/.test(question)) {
                    language = 'pashto';
                }

                // Intent classification
                let intent = 'general';
                const intentPatterns = {
                    revelation: /نازل|نزول|revelation|revealed|when|کب/i,
                    meaning: /معنی|مطلب|meaning|means|what.*mean/i,
                    tafsir: /تفسیر|تفصیل|tafsir|explanation|explain/i,
                    audio: /سنو|بجا|audio|play|listen|recit/i,
                    translation: /ترجمہ|translation|translate/i,
                    benefits: /فوائد|benefits|blessing/i,
                    context: /پس منظر|context|background|history/i,
                    word: /لفظ|کلمہ|word|terminology/i
                };

                for (const [key, pattern] of Object.entries(intentPatterns)) {
                    if (pattern.test(q)) {
                        intent = key;
                        break;
                    }
                }

                return { intent, language, confidence: this.calculateConfidence(q, intent) };
            }

            calculateConfidence(question, intent) {
                // Simple confidence calculation based on keyword density
                const words = question.split(' ').length;
                const keywordCount = (question.match(/علق|alaq|knowledge|علم|قرآن|quran/gi) || []).length;
                return Math.min(0.9, (keywordCount / words) * 2);
            }

            async generateIntelligentAnswer(question, intent) {
                const surah = this.data.surah;
                
                switch (intent.intent) {
                    case 'revelation':
                        return this.getAnswerByLanguage({
                            english: "Surah Al-Alaq has a unique revelation history. Verses 1-5 were the very first revelation to Prophet Muhammad (PBUH) in the cave of Hira around 610 CE. The remaining verses (6-19) were revealed later in Medina during conflicts with opposition.",
                            urdu: "سورہ علق کی انوکھی تاریخ نزول ہے۔ آیات 1-5 نبی کریم ﷺ پر غار حرا میں سب سے پہلے نازل ہوئیں۔ باقی آیات بعد میں مدینہ میں مخالفت کے دوران نازل ہوئیں۔",
                            arabic: "سورة العلق لها تاريخ نزول فريد. الآيات 1-5 كانت أول وحي نزل على النبي محمد صلى الله عليه وسلم في غار حراء حوالي 610 م.",
                            pashto: "د علق سورت د نزول ځانګړی تاریخ لري. د 1-5 آیات د پیغمبر (ص) پر د حرا په غار کې لومړی نازل شوي."
                        }, intent.language);

                    case 'meaning':
                        return this.getAnswerByLanguage({
                            english: "Al-Alaq means 'The Clot' or 'The Embryo', referring to the early stage of human creation. This surah emphasizes the importance of knowledge, reading, and recognizing Allah as the source of all learning.",
                            urdu: "علق کا مطلب 'جما ہوا خون' یا 'علقہ' ہے۔ یہ سورہ علم، تعلیم اور اللہ کو تمام علم کا منبع ماننے کی اہمیت پر زور دیتا ہے۔",
                            arabic: "العلق تعني الجلطة أو العلقة، وتشير إلى المرحلة المبكرة من خلق الإنسان. تؤكد هذه السورة على أهمية العلم والقراءة.",
                            pashto: "علق د وینې د ټوپ یا د ماشوم د لومړنۍ مرحلې معنی لري. دا سورت د پوهې او زده کړې اهمیت ټینګوي."
                        }, intent.language);

                    case 'benefits':
                        return this.getAnswerByLanguage({
                            english: "Reciting Surah Al-Alaq brings spiritual enlightenment, increases knowledge-seeking motivation, develops humility, strengthens connection with Allah, and reminds us of our humble origins while inspiring noble purposes.",
                            urdu: "سورہ علق کی تلاوت روحانی روشنی، علم حاصل کرنے کی تحریک، عاجزی، اللہ سے تعلق مضبوط کرنا، اور ہماری عاجز ابتدا یاد دلا کر عظیم مقاصد کی طرف رہنمائی کرتا ہے۔",
                            arabic: "تلاوة سورة العلق تجلب التنوير الروحي، وتزيد من دافع طلب العلم، وتطور التواضع، وتقوي الصلة بالله.",
                            pashto: "د علق د سورت لوستل روحاني رڼا، د پوهې غوښتنې هڅونه، عاجزي او د الله سره اړیکه پیاوړې کوي."
                        }, intent.language);

                    default:
                        return this.getAnswerByLanguage({
                            english: "This is a profound question about Surah Al-Alaq. This surah teaches us about the divine nature of knowledge, human creation from humble beginnings, and the importance of reading with divine consciousness. Would you like to explore any specific verse?",
                            urdu: "یہ سورہ علق کے بارے میں بہت اہم سوال ہے۔ یہ سورہ ہمیں علم کی الہی نوعیت، انسان کی عاجز ابتدا، اور الہی شعور کے ساتھ پڑھنے کی اہمیت سکھاتا ہے۔",
                            arabic: "هذا سؤال عميق حول سورة العلق. تعلمنا هذه السورة عن الطبيعة الإلهية للمعرفة وخلق الإنسان من بدايات متواضعة.",
                            pashto: "دا د علق سورت په اړه ډېر مهمه پوښتنه دی. دا سورت موږ ته د پوهې الهي طبیعت، د انسان عاجز پیل او د الهي شعور سره د لوستلو اهمیت ښووي."
                        }, intent.language);
                }
            }

            getAnswerByLanguage(answers, language) {
                return answers[language] || answers.english;
            }

            async speakAnswer(text, language = 'english') {
                if (!this.speechSynthesis) return;

                // Stop any current speech
                this.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                
                // Set language-specific voice settings
                switch (language) {
                    case 'urdu':
                        utterance.lang = 'ur-PK';
                        break;
                    case 'arabic':
                        utterance.lang = 'ar-SA';
                        break;
                    case 'pashto':
                        utterance.lang = 'ps-AF';
                        break;
                    default:
                        utterance.lang = 'en-US';
                }

                utterance.rate = this.state.audioSettings.speed;
                utterance.volume = this.state.audioSettings.volume;
                utterance.pitch = 1;

                // Find the best voice for the language
                const voices = this.speechSynthesis.getVoices();
                const bestVoice = voices.find(voice => voice.lang.startsWith(utterance.lang.split('-')[0]));
                if (bestVoice) {
                    utterance.voice = bestVoice;
                }

                this.speechSynthesis.speak(utterance);
            }

            // Enhanced Content Rendering
            async renderContent() {
                const mainContent = document.getElementById('mainContent');
                if (!mainContent) return;

                const surah = this.data.surah;
                if (!surah || !surah.verses) {
                    mainContent.innerHTML = '<div class="error-message">Failed to load surah content</div>';
                    return;
                }

                mainContent.innerHTML = '';

                for (let i = 0; i < surah.verses.length; i++) {
                    const verseElement = await this.createEnhancedVerseElement(surah.verses[i], i);
                    mainContent.appendChild(verseElement);
                }

                this.updateNavigationButtons();
            }

            async createEnhancedVerseElement(verse, index) {
                const verseDiv = document.createElement('article');
                verseDiv.className = 'verse-container';
                verseDiv.id = `verse-${verse.number}`;
                verseDiv.setAttribute('data-verse', verse.number);
                verseDiv.setAttribute('role', 'article');
                verseDiv.setAttribute('aria-labelledby', `verse-title-${verse.number}`);

                const tafsirLayers = this.data.tafsirLayers[verse.number] || verse.tafsirLayers || {};
                const isBookmarked = this.state.bookmarks.includes(verse.number);
                const userNote = this.state.userNotes[verse.number] || '';

                verseDiv.innerHTML = `
                    <div class="verse-header">
                        <div class="verse-number" id="verse-title-${verse.number}">${verse.number}</div>
                        <div class="verse-actions">
                            <button class="action-btn bookmark-btn ${isBookmarked ? 'active' : ''}" 
                                    onclick="app.toggleBookmark(${verse.number})" 
                                    title="Bookmark this verse"
                                    aria-label="Bookmark verse ${verse.number}">
                                🔖
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
                                aria-controls="translation-${index}-english"
                                onclick="app.showTranslation(${index}, 'english')">
                            English
                        </button>
                        <button class="tab-btn" 
                                role="tab" 
                                aria-selected="false"
                                aria-controls="translation-${index}-urdu"
                                onclick="app.showTranslation(${index}, 'urdu')">
                            اردو
                        </button>
                        <button class="tab-btn" 
                                role="tab" 
                                aria-selected="false"
                                aria-controls="translation-${index}-pashto"
                                onclick="app.showTranslation(${index}, 'pashto')">
                            پښتو
                        </button>
                    </div>
                    
                    <div class="translation active" 
                         id="translation-${index}-english" 
                         role="tabpanel"
                         aria-labelledby="tab-english-${index}">
                        <div class="translation-content">
                            <strong>Translation:</strong> ${verse.translationEnglish}<br>
                            <strong>Transliteration:</strong> <em lang="ar-Latn">${verse.transliteration}</em>
                        </div>
                    </div>
                    
                    <div class="translation urdu" 
                         id="translation-${index}-urdu" 
                         role="tabpanel"
                         aria-labelledby="tab-urdu-${index}"
                         lang="ur" 
                         dir="rtl">
                        <div class="translation-content">
                            <strong>ترجمہ:</strong> ${verse.translationUrdu}
                        </div>
                    </div>
                    
                    <div class="translation pashto" 
                         id="translation-${index}-pashto" 
                         role="tabpanel"
                         aria-labelledby="tab-pashto-${index}"
                         lang="ps" 
                         dir="rtl">
                        <div class="translation-content">
                            <strong>ژباړه:</strong> ${verse.translationPashto}
                        </div>
                    </div>
                    
                    <div class="audio-controls">
                        <button class="audio-btn" 
                                onclick="app.playVerseAudio(${verse.number})" 
                                aria-label="Play recitation of verse ${verse.number}">
                            🔊 Play Recitation
                        </button>
                        <button class="audio-btn" 
                                onclick="app.showWordAnalysis(${index})" 
                                aria-label="Show word analysis for verse ${verse.number}">
                            📖 Word Analysis
                        </button>
                        <button class="audio-btn" 
                                onclick="app.showDetailedTafsir(${index})" 
                                aria-label="Show detailed tafsir for verse ${verse.number}">
                            📚 Detailed Tafsir
                        </button>
                        <button class="audio-btn" 
                                onclick="app.showNoteEditor(${verse.number})" 
                                aria-label="Add note to verse ${verse.number}">
                            📝 Add Note
                        </button>
                    </div>
                    
                    <div class="verse-breakdown" id="word-analysis-${index}" style="display: none;">
                        ${this.renderWordAnalysis(verse.wordAnalysis || [])}
                    </div>
                    
                    ${userNote ? `
                        <div class="user-note">
                            <h4>📝 Your Note</h4>
                            <p>${userNote}</p>
                            <button class="edit-note-btn" onclick="app.showNoteEditor(${verse.number})">Edit</button>
                        </div>
                    ` : ''}
                    
                    <div class="tafsir-section">
                        <div class="tafsir-header">
                            🌟 Multi-Layered Tafsir
                        </div>
                        <div class="tafsir-content">
                            ${this.renderTafsirLayers(tafsirLayers)}
                        </div>
                    </div>
                    
                    <div class="modern-relevance">
                        <h4>🌍 Modern Relevance</h4>
                        <p>${verse.modernRelevance || 'This verse continues to guide humanity in contemporary times, offering timeless wisdom for modern challenges.'}</p>
                    </div>
                    
                    ${verse.hadithReferences ? `
                        <div class="hadith-reference">
                            <h4>📖 Related Hadith</h4>
                            ${verse.hadithReferences.map(hadith => `
                                <div class="hadith-item">
                                    <p><strong>Hadith:</strong> "${hadith.text}"</p>
                                    <p><strong>Source:</strong> ${hadith.source}</p>
                                    <p><strong>Relevance:</strong> ${hadith.relevance}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${verse.philosophicalQuotes ? `
                        <div class="philosophy-quote">
                            <h4>💎 Philosophical Insights</h4>
                            ${verse.philosophicalQuotes.map(quote => `
                                <blockquote>
                                    <p>"${quote.text}"</p>
                                    <footer class="quote-author">— ${quote.author}</footer>
                                </blockquote>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="sufi-interpretation">
                        <div class="mystical-symbol">☪️</div>
                        <h4>🌙 Sufi Interpretation</h4>
                        <p>${verse.sufiInterpretation || 'From the mystical perspective, this verse opens doors to deeper spiritual understanding and divine consciousness.'}</p>
                    </div>
                    
                    <div class="verse-benefits">
                        <h4>✨ Spiritual Benefits</h4>
                        <div class="benefits-grid">
                            ${this.renderBenefits(verse.benefits || [])}
                        </div>
                    </div>
                `;

                return verseDiv;
            }

            renderWordAnalysis(wordAnalysis) {
                if (!wordAnalysis || wordAnalysis.length === 0) {
                    return '<p>Word analysis will be available soon.</p>';
                }

                return wordAnalysis.map(word => `
                    <div class="word-analysis">
                        <div class="arabic-word" lang="ar" dir="rtl">${word.arabic}</div>
                        <div class="word-meaning">
                            <strong>Meaning:</strong> ${word.meaning}<br>
                            <strong>Significance:</strong> ${word.significance}
                            ${word.etymology ? `<br><strong>Etymology:</strong> ${word.etymology}` : ''}
                            ${word.grammatical ? `<br><strong>Grammar:</strong> ${word.grammatical}` : ''}
                        </div>
                    </div>
                `).join('');
            }

            renderTafsirLayers(tafsirLayers) {
                const layers = [
                    { key: 'cosmic', title: '🌌 Cosmic Dimension', icon: '🌌' },
                    { key: 'psychological', title: '🧠 Psychological Dimension', icon: '🧠' },
                    { key: 'social', title: '🏛️ Social Dimension', icon: '🏛️' },
                    { key: 'spiritual', title: '🤲 Spiritual Dimension', icon: '🤲' },
                    { key: 'historical', title: '📜 Historical Context', icon: '📜' },
                    { key: 'linguistic', title: '📚 Linguistic Analysis', icon: '📚' }
                ];

                return layers.map(layer => {
                    const content = tafsirLayers[layer.key];
                    if (!content) return '';

                    return `
                        <div class="tafsir-layer">
                            <div class="layer-title">${layer.icon} ${layer.title}</div>
                            <div class="layer-content">${content}</div>
                        </div>
                    `;
                }).join('');
            }

            renderBenefits(benefits) {
                if (!benefits || benefits.length === 0) {
                    return '<div class="benefit-item">Spiritual enlightenment and divine connection</div>';
                }

                return benefits.map(benefit => `
                    <div class="benefit-item">${benefit}</div>
                `).join('');
            }

            // Enhanced Navigation
            updateNavigationButtons() {
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                
                if (prevBtn) {
                    prevBtn.disabled = this.state.currentVerse <= 0;
                }
                
                if (nextBtn) {
                    const maxVerse = this.data.surah?.verses?.length || 0;
                    nextBtn.disabled = this.state.currentVerse >= maxVerse - 1;
                }
            }

            scrollToVerse(verseNumber) {
                const verseElement = document.getElementById(`verse-${verseNumber}`);
                if (verseElement) {
                    verseElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                    
                    this.state.currentVerse = verseNumber - 1;
                    this.updateNavigationButtons();
                    
                    // Add highlight effect
                    verseElement.classList.add('highlighted');
                    setTimeout(() => {
                        verseElement.classList.remove('highlighted');
                    }, 3000);

                    // Update reading progress
                    this.updateReadingProgress();
                }
            }

            nextVerse() {
                const maxVerse = this.data.surah?.verses?.length || 0;
                if (this.state.currentVerse < maxVerse - 1) {
                    this.state.currentVerse++;
                    this.scrollToVerse(this.state.currentVerse + 1);
                }
            }

            previousVerse() {
                if (this.state.currentVerse > 0) {
                    this.state.currentVerse--;
                    this.scrollToVerse(this.state.currentVerse + 1);
                }
            }

            // Enhanced Audio System
            async playVerseAudio(verseNumber) {
                const audio = document.getElementById('recitationAudio');
                if (!audio) return;

                try {
                    const reciter = this.state.audioSettings.reciter;
                    const audioUrl = `./assets/audio/reciters/${reciter}/096_${verseNumber.toString().padStart(3, '0')}.mp3`;
                    
                    if (audio.src !== audioUrl) {
                        audio.src = audioUrl;
                    }

                    audio.volume = this.state.audioSettings.volume;
                    audio.playbackRate = this.state.audioSettings.speed;

                    await audio.play();
                    this.state.isPlaying = true;
                    this.updateAudioButton();
                    
                    this.showNotification(`🔊 Playing verse ${verseNumber}`, 'info');

                } catch (error) {
                    console.error('Audio playback failed:', error);
                    this.showNotification(`❌ Audio file for verse ${verseNumber} not found`, 'error');
                    this.tryFallbackAudio(verseNumber);
                }
            }

            async tryFallbackAudio(verseNumber) {
                const audio = document.getElementById('recitationAudio');
                const fallbackUrl = `./assets/audio/fallback/096_${verseNumber.toString().padStart(3, '0')}.mp3`;
                
                try {
                    audio.src = fallbackUrl;
                    await audio.play();
                } catch (error) {
                    this.showNotification('📥 Please add audio files to the assets/audio folder', 'warning');
                }
            }

            toggleAudioRecitation() {
                const audio = document.getElementById('recitationAudio');
                if (!audio) return;

                if (audio.paused) {
                    const fullSurahUrl = `./assets/audio/reciters/${this.state.audioSettings.reciter}/096_full.mp3`;
                    if (audio.src !== fullSurahUrl) {
                        audio.src = fullSurahUrl;
                    }
                    audio.play().catch(error => {
                        console.error('Full surah playback failed:', error);
                        this.showNotification('❌ Full surah audio not found', 'error');
                    });
                } else {
                    audio.pause();
                }
                
                this.state.isPlaying = !audio.paused;
                this.updateAudioButton();
            }

            updateAudioButton() {
                const audioBtn = document.getElementById('audioBtn');
                if (audioBtn) {
                    audioBtn.classList.toggle('playing', this.state.isPlaying);
                    audioBtn.title = this.state.isPlaying ? 'Pause Audio' : 'Play Audio';
                }
            }

            // Enhanced Bookmark System
            initializeBookmarkSystem() {
                this.renderBookmarkIndicators();
            }

            toggleBookmark(verseNumber) {
                const index = this.state.bookmarks.indexOf(verseNumber);
                
                if (index > -1) {
                    this.state.bookmarks.splice(index, 1);
                    this.showNotification(`🔖 Bookmark removed from verse ${verseNumber}`, 'info');
                } else {
                    this.state.bookmarks.push(verseNumber);
                    this.showNotification(`🔖 Verse ${verseNumber} bookmarked`, 'success');
                }
                
                this.saveBookmarks();
                this.updateBookmarkButton(verseNumber);
            }

            saveBookmarks() {
                localStorage.setItem('surah-alaq-bookmarks', JSON.stringify(this.state.bookmarks));
            }

            updateBookmarkButton(verseNumber) {
                const verseElement = document.getElementById(`verse-${verseNumber}`);
                if (verseElement) {
                    const bookmarkBtn = verseElement.querySelector('.bookmark-btn');
                    if (bookmarkBtn) {
                        const isBookmarked = this.state.bookmarks.includes(verseNumber);
                        bookmarkBtn.classList.toggle('active', isBookmarked);
                        bookmarkBtn.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
                    }
                }
            }

            renderBookmarkIndicators() {
                this.state.bookmarks.forEach(verseNumber => {
                    this.updateBookmarkButton(verseNumber);
                });
            }

            showBookmarks() {
                if (this.state.bookmarks.length === 0) {
                    this.showNotification('📖 No bookmarks yet. Click the bookmark icon on any verse to save it.', 'info');
                    return;
                }

                const bookmarksList = this.state.bookmarks.map(verseNumber => {
                    const verse = this.data.surah.verses.find(v => v.number === verseNumber);
                    return `
                        <div class="bookmark-item" onclick="app.scrollToVerse(${verseNumber})">
                            <div class="bookmark-verse">Verse ${verseNumber}</div>
                            <div class="bookmark-preview">${verse?.translationEnglish?.substring(0, 100)}...</div>
                        </div>
                    `;
                }).join('');

                const modalContent = `
                    <h2>🔖 Your Bookmarks</h2>
                    <div class="bookmarks-list">
                        ${bookmarksList}
                    </div>
                `;

                this.showModal(modalContent);
            }

            // Enhanced Note System
            initializeNoteSystem() {
                this.renderUserNotes();
            }

            showNoteEditor(verseNumber) {
                const currentNote = this.state.userNotes[verseNumber] || '';
                
                const modalContent = `
                    <h2>📝 Add Note to Verse ${verseNumber}</h2>
                    <div class="note-editor">
                        <textarea 
                            id="noteTextarea" 
                            placeholder="Write your thoughts, reflections, or insights about this verse..."
                            rows="8"
                            style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--divine-white); font-family: inherit; font-size: 1rem; resize: vertical;"
                        >${currentNote}</textarea>
                        <div class="note-actions" style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: flex-end;">
                            <button class="audio-btn" onclick="app.closeModal()">Cancel</button>
                            <button class="audio-btn" onclick="app.saveNote(${verseNumber})">Save Note</button>
                        </div>
                    </div>
                `;

                this.showModal(modalContent);
                
                // Focus on textarea after modal opens
                setTimeout(() => {
                    const textarea = document.getElementById('noteTextarea');
                    if (textarea) {
                        textarea.focus();
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                    }
                }, 100);
            }

            saveNote(verseNumber) {
                const textarea = document.getElementById('noteTextarea');
                if (!textarea) return;

                const noteText = textarea.value.trim();
                
                if (noteText) {
                    this.state.userNotes[verseNumber] = noteText;
                    this.showNotification(`📝 Note saved for verse ${verseNumber}`, 'success');
                } else {
                    delete this.state.userNotes[verseNumber];
                    this.showNotification(`📝 Note removed from verse ${verseNumber}`, 'info');
                }

                this.saveUserNotes();
                this.closeModal();
                this.updateVerseNote(verseNumber, noteText);
            }

            saveUserNotes() {
                localStorage.setItem('surah-alaq-notes', JSON.stringify(this.state.userNotes));
            }

            updateVerseNote(verseNumber, noteText) {
                const verseElement = document.getElementById(`verse-${verseNumber}`);
                if (!verseElement) return;

                let noteElement = verseElement.querySelector('.user-note');
                
                if (noteText) {
                    if (!noteElement) {
                        noteElement = document.createElement('div');
                        noteElement.className = 'user-note';
                        const audioControls = verseElement.querySelector('.audio-controls');
                        if (audioControls) {
                            audioControls.parentNode.insertBefore(noteElement, audioControls.nextSibling);
                        }
                    }
                    
                    noteElement.innerHTML = `
                        <h4>📝 Your Note</h4>
                        <p>${noteText}</p>
                        <button class="edit-note-btn" onclick="app.showNoteEditor(${verseNumber})">Edit</button>
                    `;
                } else if (noteElement) {
                    noteElement.remove();
                }
            }

            renderUserNotes() {
                Object.keys(this.state.userNotes).forEach(verseNumber => {
                    this.updateVerseNote(parseInt(verseNumber), this.state.userNotes[verseNumber]);
                });
            }

            // Enhanced Modal System
            showModal(content, title = '') {
                const modal = document.getElementById('detailModal');
                const modalContent = document.getElementById('modalContent');
                
                if (modal && modalContent) {
                    modalContent.innerHTML = content;
                    modal.classList.add('active');
                    modal.style.display = 'flex';
                    
                    // Trap focus within modal
                    this.trapFocus(modal);
                    
                    // Close on escape key
                    this.addEventListenerOnce('keydown', (e) => {
                        if (e.key === 'Escape') {
                            this.closeModal();
                        }
                    });
                }
            }

            closeModal() {
                const modal = document.getElementById('detailModal');
                if (modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    
                    // Return focus to trigger element
                    this.restoreFocus();
                }
            }

            trapFocus(modal) {
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                const firstFocusable = focusableElements[0];
                const lastFocusable = focusableElements[focusableElements.length - 1];

                if (firstFocusable) {
                    firstFocusable.focus();
                }

                this.addEventListenerOnce('keydown', (e) => {
                    if (e.key === 'Tab') {
                        if (e.shiftKey) {
                            if (document.activeElement === firstFocusable) {
                                e.preventDefault();
                                lastFocusable.focus();
                            }
                        } else {
                            if (document.activeElement === lastFocusable) {
                                e.preventDefault();
                                firstFocusable.focus();
                            }
                        }
                    }
                });
            }

            // Enhanced Utility Functions
            showLoading(show, message = 'Loading...') {
                const loading = document.getElementById('loading') || document.getElementById('loadingScreen');
                const loadingText = loading?.querySelector('.loading-text');
                
                if (loading) {
                    loading.style.display = show ? 'block' : 'none';
                    if (loadingText && message) {
                        loadingText.textContent = message;
                    }
                }
                
                this.state.isLoading = show;
            }

            showNotification(message, type = 'info', duration = 3000) {
                // Create notification element if it doesn't exist
                let notification = document.getElementById('notification');
                if (!notification) {
                    notification = document.createElement('div');
                    notification.id = 'notification';
                    notification.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 1rem 1.5rem;
                        border-radius: 0.5rem;
                        font-weight: 600;
                        z-index: 10000;
                        max-width: 300px;
                        animation: slideInRight 0.3s ease;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                        backdrop-filter: blur(10px);
                    `;
                    document.body.appendChild(notification);
                }

                // Set notification style based on type
                const styles = {
                    success: { bg: 'rgba(34, 197, 94, 0.9)', border: '#22c55e' },
                    error: { bg: 'rgba(239, 68, 68, 0.9)', border: '#ef4444' },
                    warning: { bg: 'rgba(245, 158, 11, 0.9)', border: '#f59e0b' },
                    info: { bg: 'rgba(59, 130, 246, 0.9)', border: '#3b82f6' }
                };

                const style = styles[type] || styles.info;
                notification.style.background = style.bg;
                notification.style.border = `2px solid ${style.border}`;
                notification.style.color = 'white';
                notification.textContent = message;
                notification.style.display = 'block';

                // Auto hide
                setTimeout(() => {
                    if (notification) {
                        notification.style.animation = 'slideOutRight 0.3s ease';
                        setTimeout(() => {
                            notification.style.display = 'none';
                        }, 300);
                    }
                }, duration);
            }

            showVoiceResponse(message) {
                const responseDiv = document.getElementById('voiceResponse');
                if (responseDiv) {
                    responseDiv.textContent = message;
                    responseDiv.style.display = 'block';
                    
                    setTimeout(() => {
                        responseDiv.style.display = 'none';
                    }, 5000);
                }
            }

            // Enhanced Event Management
            setupEventListeners() {
                // Search functionality
                this.addEventListener('searchInput', 'keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.performSearch();
                    }
                });

                // Modal close on outside click
                this.addEventListener('detailModal', 'click', (e) => {
                    if (e.target.id === 'detailModal') {
                        this.closeModal();
                    }
                });

                // Menu close on outside click
                document.addEventListener('click', (e) => {
                    const menu = document.getElementById('menuItems');
                    const toggle = document.querySelector('.menu-toggle');
                    
                    if (menu && toggle && !menu.contains(e.target) && !toggle.contains(e.target)) {
                        menu.classList.remove('show');
                    }
                });

                // Keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        switch (e.key) {
                            case 'f':
                                e.preventDefault();
                                document.getElementById('searchInput')?.focus();
                                break;
                            case 's':
                                e.preventDefault();
                                this.exportNotes();
                                break;
                            case 'b':
                                e.preventDefault();
                                this.showBookmarks();
                                break;
                        }
                    } else {
                        switch (e.key) {
                            case 'ArrowRight':
                                if (!this.isInputFocused()) {
                                    e.preventDefault();
                                    this.nextVerse();
                                }
                                break;
                            case 'ArrowLeft':
                                if (!this.isInputFocused()) {
                                    e.preventDefault();
                                    this.previousVerse();
                                }
                                break;
                            case 'Escape':
                                this.closeModal();
                                break;
                            case ' ':
                                if (e.ctrlKey && !this.isInputFocused()) {
                                    e.preventDefault();
                                    this.toggleVoiceRecognition();
                                }
                                break;
                        }
                    }
                });

                // Audio events
                const audio = document.getElementById('recitationAudio');
                if (audio) {
                    audio.addEventListener('loadstart', () => this.showLoading(true, 'Loading audio...'));
                    audio.addEventListener('canplay', () => this.showLoading(false));
                    audio.addEventListener('ended', () => {
                        this.state.isPlaying = false;
                        this.updateAudioButton();
                        this.stopAudioVisualization();
                    });
                    audio.addEventListener('error', () => {
                        this.showLoading(false);
                        this.showNotification('❌ Audio file not found', 'error');
                    });
                }

                // Touch and mouse events for enhanced UX
                if ('ontouchstart' in window) {
                    this.setupTouchEvents();
                }

                // Window events
                window.addEventListener('beforeunload', () => {
                    this.saveUserPreferences();
                });

                window.addEventListener('online', () => {
                    this.showNotification('🌐 Back online', 'success');
                });

                window.addEventListener('offline', () => {
                    this.showNotification('📱 Offline mode active', 'warning');
                });
            }

            addEventListener(elementId, event, handler) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.addEventListener(event, handler);
                    
                    // Store for cleanup
                    if (!this.eventListeners.has(elementId)) {
                        this.eventListeners.set(elementId, []);
                    }
                    this.eventListeners.get(elementId).push({ event, handler });
                }
            }

            addEventListenerOnce(event, handler) {
                const wrappedHandler = (e) => {
                    handler(e);
                    document.removeEventListener(event, wrappedHandler);
                };
                document.addEventListener(event, wrappedHandler);
            }

            isInputFocused() {
                const activeElement = document.activeElement;
                return activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.contentEditable === 'true'
                );
            }

            setupTouchEvents() {
                let touchStartX = 0;
                let touchStartY = 0;

                document.addEventListener('touchstart', (e) => {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                });

                document.addEventListener('touchend', (e) => {
                    if (!touchStartX || !touchStartY) return;

                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;

                    const deltaX = touchEndX - touchStartX;
                    const deltaY = touchEndY - touchStartY;

                    // Swipe detection
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                        if (deltaX > 0) {
                            this.previousVerse(); // Swipe right
                        } else {
                            this.nextVerse(); // Swipe left
                        }
                    }

                    touchStartX = 0;
                    touchStartY = 0;
                });
            }

            // Enhanced Accessibility
            setupAccessibility() {
                // Add ARIA labels
                document.querySelectorAll('button:not([aria-label])').forEach(button => {
                    if (button.textContent.trim()) {
                        button.setAttribute('aria-label', button.textContent.trim());
                    }
                });

                // Announce page load for screen readers
                const announcement = document.createElement('div');
                announcement.setAttribute('aria-live', 'polite');
                announcement.setAttribute('aria-atomic', 'true');
                announcement.className = 'sr-only';
                announcement.textContent = 'Surah Al-Alaq interactive platform loaded successfully';
                document.body.appendChild(announcement);

                setTimeout(() => {
                    announcement.remove();
                }, 3000);

                // Focus management
                this.manageFocus();
            }

            manageFocus() {
                // Ensure visible focus indicators
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        document.body.classList.add('keyboard-nav');
                    }
                });

                document.addEventListener('mousedown', () => {
                    document.body.classList.remove('keyboard-nav');
                });

                // Add CSS for keyboard navigation
                const style = document.createElement('style');
                style.textContent = `
                    .keyboard-nav *:focus {
                        outline: 2px solid var(--primary-gold) !important;
                        outline-offset: 2px !important;
                    }
                `;
                document.head.appendChild(style);
            }

            // PWA Setup
            setupPWA() {
                // Register service worker
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('./sw.js')
                        .then(() => console.log('Service Worker registered'))
                        .catch(error => console.log('Service Worker registration failed:', error));
                }

                // Install prompt
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                    deferredPrompt = e;
                    this.showInstallPrompt();
                });

                window.addEventListener('appinstalled', () => {
                    this.showNotification('📱 App installed successfully!', 'success');
                    deferredPrompt = null;
                });
            }

            showInstallPrompt() {
                const installBtn = document.createElement('button');
                installBtn.textContent = '📱 Install App';
                installBtn.className = 'install-btn';
                installBtn.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 1rem 2rem;
                    background: var(--gradient-gold);
                    color: var(--deep-night);
                    border: none;
                    border-radius: 2rem;
                    font-weight: 600;
                    cursor: pointer;
                    z-index: 10000;
                    animation: slideUp 0.5s ease;
                `;

                installBtn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const result = await deferredPrompt.userChoice;
                        if (result.outcome === 'accepted') {
                            console.log('User accepted PWA install');
                        }
                        deferredPrompt = null;
                        installBtn.remove();
                    }
                });

                document.body.appendChild(installBtn);

                // Auto-hide after 10 seconds
                setTimeout(() => {
                    if (installBtn.parentNode) {
                        installBtn.remove();
                    }
                }, 10000);
            }

            // Enhanced Feature Methods
            toggleVoiceRecognition() {
                if (!this.recognition) {
                    this.showNotification('🎤 Voice recognition not supported', 'warning');
                    return;
                }

                if (this.state.isListening) {
                    this.recognition.stop();
                } else {
                    this.recognition.start();
                }
            }

            toggleVoiceSearch() {
                this.toggleVoiceRecognition();
            }

            stopListening() {
                this.state.isListening = false;
                this.updateVoiceButton();
                setTimeout(() => {
                    document.getElementById('voiceResponse').style.display = 'none';
                }, 3000);
            }

            updateVoiceButton() {
                const voiceBtn = document.getElementById('voiceBtn');
                const voiceSearchBtn = document.getElementById('voiceSearchBtn');
                
                [voiceBtn, voiceSearchBtn].forEach(btn => {
                    if (btn) {
                        btn.classList.toggle('listening', this.state.isListening);
                        btn.title = this.state.isListening ? 'Stop Listening' : 'Start Voice Search';
                    }
                });
            }

            handleVoiceError(error) {
                const errorMessages = {
                    'no-speech': 'No speech detected. Please try again.',
                    'audio-capture': 'Microphone not available.',
                    'not-allowed': 'Microphone permission denied.',
                    'network': 'Network error occurred.',
                    'service-not-allowed': 'Speech service not allowed.'
                };

                const message = errorMessages[error] || 'Speech recognition error occurred.';
                this.showNotification(`🎤 ${message}`, 'error');
            }

            performSearch() {
                const searchInput = document.getElementById('searchInput');
                if (!searchInput) return;

                const query = searchInput.value.trim();
                if (!query) {
                    this.showNotification('Please enter a search term', 'warning');
                    return;
                }

                const results = this.searchInContent(query);
                if (results.length === 0) {
                    this.showNotification('No results found', 'info');
                    return;
                }

                // Navigate to first result
                this.navigateToSearchResult(results[0].verseNumber);
                this.showNotification(`Found ${results.length} results`, 'success');
            }

            clearSearch() {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    this.hideSearchResults();
                }
            }

            // Translation Management
            showTranslation(verseIndex, language) {
                // Hide all translations for this verse
                const translations = document.querySelectorAll(`[id^="translation-${verseIndex}-"]`);
                translations.forEach(t => {
                    t.classList.remove('active');
                    t.style.display = 'none';
                });

                // Show selected translation
                const selectedTranslation = document.getElementById(`translation-${verseIndex}-${language}`);
                if (selectedTranslation) {
                    selectedTranslation.classList.add('active');
                    selectedTranslation.style.display = 'block';
                }

                // Update tab buttons
                const verseContainer = document.getElementById(`verse-${verseIndex + 1}`);
                if (verseContainer) {
                    const tabButtons = verseContainer.querySelectorAll('.tab-btn');
                    tabButtons.forEach(btn => {
                        btn.classList.remove('active');
                        btn.setAttribute('aria-selected', 'false');
                    });
                    
                    event.target.classList.add('active');
                    event.target.setAttribute('aria-selected', 'true');
                }

                this.state.currentLanguage = language;
            }

            showWordAnalysis(verseIndex) {
                const analysisDiv = document.getElementById(`word-analysis-${verseIndex}`);
                if (analysisDiv) {
                    const isVisible = analysisDiv.style.display !== 'none';
                    analysisDiv.style.display = isVisible ? 'none' : 'grid';
                    
                    if (!isVisible) {
                        analysisDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }

            showDetailedTafsir(verseIndex) {
                const verse = this.data.surah.verses[verseIndex];
                if (!verse) return;

                const tafsirLayers = this.data.tafsirLayers[verse.number] || verse.tafsirLayers || {};
                
                const modalContent = `
                    <h2 id="modalTitle">📚 Detailed Tafsir - Verse ${verse.number}</h2>
                    
                    <div class="modal-verse-display">
                        <div class="arabic-text" lang="ar" dir="rtl" style="text-align: center; margin: 2rem 0; font-size: 2rem;">
                            ${verse.arabic}
                        </div>
                        <div class="verse-translation" style="text-align: center; font-style: italic; margin-bottom: 2rem;">
                            "${verse.translationEnglish}"
                        </div>
                    </div>
                    
                    ${this.renderTafsirLayers(tafsirLayers)}
                    
                    ${verse.wordAnalysis ? `
                        <div class="modal-word-analysis">
                            <h3>📖 Word-by-Word Analysis</h3>
                            <div class="modal-word-grid">
                                ${this.renderWordAnalysis(verse.wordAnalysis)}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${verse.philosophicalQuotes ? `
                        <div class="modal-philosophy">
                            <h3>💭 Philosophical Reflections</h3>
                            ${verse.philosophicalQuotes.map(quote => `
                                <blockquote class="modal-quote">
                                    <p>"${quote.text}"</p>
                                    <footer class="quote-author">— ${quote.author}</footer>
                                </blockquote>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="modal-sufi">
                        <h3>🌙 Mystical Understanding</h3>
                        <div class="sufi-content">
                            <div class="mystical-symbol">☪️</div>
                            <p>${verse.sufiInterpretation || 'From the mystical perspective, this verse opens doors to deeper spiritual understanding and divine consciousness.'}</p>
                        </div>
                    </div>
                `;

                this.showModal(modalContent, `Detailed Tafsir - Verse ${verse.number}`);
            }

            // Menu Functions
            toggleMenu() {
                const menuItems = document.getElementById('menuItems');
                if (menuItems) {
                    menuItems.classList.toggle('show');
                }
            }

            showAllTranslations() {
                const verses = document.querySelectorAll('.verse-container');
                verses.forEach((verse, index) => {
                    // Show English first
                    this.showTranslation(index, 'english');
                    
                    // Then cycle through other languages with delays
                    setTimeout(() => this.showTranslation(index, 'urdu'), 1000);
                    setTimeout(() => this.showTranslation(index, 'pashto'), 2000);
                    setTimeout(() => this.showTranslation(index, 'english'), 3000);
                });

                this.showNotification('🌐 Cycling through all translations', 'info');
            }

            showPhilosophicalInsights() {
                const modalContent = `
                    <h2>🌟 Philosophical Insights of Surah Al-Alaq</h2>
                    
                    <div class="insight-section">
                        <div class="philosophy-quote">
                            <h3>💫 The Philosophy of Divine Knowledge</h3>
                            <p>Surah Al-Alaq presents a revolutionary epistemology that bridges empirical observation and divine revelation. The command "Iqra" (Read) transcends mere literacy—it represents the awakening of consciousness to cosmic truth through divine guidance.</p>
                        </div>
                        
                        <div class="philosophy-quote">
                            <h3>🌱 The Paradox of Human Creation</h3>
                            <p>The mention of creation from 'alaq (clot) reveals the fundamental paradox of human existence: supreme consciousness emerging from humble material origins. This teaches that nobility lies not in genesis but in potential for divine consciousness.</p>
                        </div>
                        
                        <div class="philosophy-quote">
                            <h3>📚 Sacred Epistemology</h3>
                            <p>When learning occurs "bi-ismi rabbika" (in your Lord's name), it transforms from intellectual acquisition to sacred communion. Knowledge becomes worship, understanding becomes proximity to the Divine.</p>
                        </div>
                        
                        <div class="philosophy-quote">
                            <h3>🖋️ The Cosmic Pen Principle</h3>
                            <p>The pen represents the cosmic principle of divine knowledge transmission across time and space. It symbolizes how consciousness itself writes the story of existence through divine inspiration.</p>
                        </div>
                        
                        <div class="philosophy-quote">
                            <h3>∞ Infinite Learning Paradigm</h3>
                            <p>"Taught man what he knew not" reveals learning as an infinite spiral where each answer births new questions, each discovery unveils greater mysteries, connecting the finite mind to infinite wisdom.</p>
                        </div>
                        
                        <div class="philosophical-reflection">
                            <h3>🌌 Contemporary Relevance</h3>
                            <p>In our information age, Surah Al-Alaq offers a framework for ethical knowledge—learning that serves humanity, science that acknowledges the sacred, and technology that enhances rather than replaces spiritual development.</p>
                        </div>
                    </div>
                `;

                this.showModal(modalContent);
            }

            showHistoricalContext() {
                const modalContent = `
                    <h2>📜 Historical Context of Surah Al-Alaq</h2>
                    
                    <div class="historical-timeline">
                        <div class="timeline-event">
                            <div class="timeline-marker">🏔️</div>
                            <div class="timeline-content">
                                <h3>Cave of Hira - 610 CE</h3>
                                <p>Prophet Muhammad (PBUH) was in spiritual retreat when Angel Jibril appeared with the first divine revelation. This cave, located near Mecca, became the birthplace of the final revelation to humanity.</p>
                            </div>
                        </div>
                        
                        <div class="timeline-event">
                            <div class="timeline-marker">👼</div>
                            <div class="timeline-content">
                                <h3>The Angel's Command</h3>
                                <p>Angel Jibril commanded "Iqra" three times. The Prophet's response "Ma ana bi-qari" (I cannot read) emphasizes that this knowledge was purely divine revelation, not human learning.</p>
                            </div>
                        </div>
                        
                        <div class="timeline-event">
                            <div class="timeline-marker">📅</div>
                            <div class="timeline-content">
                                <h3>Dual Revelation Period</h3>
                                <p>Verses 1-5: First revelation (Meccan period)<br>Verses 6-19: Later revelation (Medinan period) addressing opposition to the message</p>
                            </div>
                        </div>
                        
                        <div class="timeline-event">
                            <div class="timeline-marker">🌍</div>
                            <div class="timeline-content">
                                <h3>Civilizational Impact</h3>
                                <p>These verses sparked the Islamic Golden Age, leading to the establishment of universities, libraries, and centers of learning in Baghdad, Cordoba, Cairo, and beyond.</p>
                            </div>
                        </div>
                        
                        <div class="timeline-event">
                            <div class="timeline-marker">📚</div>
                            <div class="timeline-content">
                                <h3>Knowledge Revolution</h3>
                                <p>The emphasis on reading and the pen motivated Muslims to preserve and advance knowledge in mathematics, medicine, astronomy, philosophy, and numerous other fields.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="historical-impact">
                        <h3>🏛️ Long-term Influence</h3>
                        <p>These five verses laid the foundation for a civilization that valued learning, literacy, and intellectual inquiry as religious obligations. The concept of seeking knowledge "from cradle to grave" became a cornerstone of Islamic culture.</p>
                    </div>
                `;

                this.showModal(modalContent);
            }

            showSufiInterpretation() {
                const modalContent = `
                    <h2>🌙 Sufi Interpretation of Surah Al-Alaq</h2>
                    
                    <div class="sufi-content">
                        <div class="sufi-interpretation">
                            <div class="mystical-symbol">☪️</div>
                            <h3>🌟 The Inner Reading (Qira'a Batiniyya)</h3>
                            <p>For the mystic, "Iqra" means reading the book of existence with the heart's eye. Every particle contains divine verses visible only to the purified consciousness. The external Quran guides to the internal divine reality.</p>
                        </div>
                        
                        <div class="sufi-interpretation">
                            <div class="mystical-symbol">🕊️</div>
                            <h3>🌱 The Spiritual Embryo</h3>
                            <p>The 'alaq represents the spiritual seed within every heart. Just as the physical embryo grows through divine mercy, the spiritual heart develops through remembrance, love, and surrender to the Beloved.</p>
                        </div>
                        
                        <div class="sufi-interpretation">
                            <div class="mystical-symbol">💎</div>
                            <h3>✨ Divine Generosity (Karam-i-Ilahi)</h3>
                            <p>Al-Akram is experienced as the endless ocean of divine grace. Every breath is generosity, every heartbeat a gift, every moment of awareness a blessing from the Most Generous Beloved.</p>
                        </div>
                        
                        <div class="sufi-interpretation">
                            <div class="mystical-symbol">🖋️</div>
                            <h3>📜 The Mystical Pen</h3>
                            <p>The pen that teaches is the divine breath (nafas al-Rahman) writing love upon the heart. The mystic becomes a living manuscript where divine qualities manifest through spiritual transformation.</p>
                        </div>
                        
                        <div class="sufi-interpretation">
                            <div class="mystical-symbol">🌟</div>
                            <h3>🔮 The Sacred Unknown</h3>
                            <p>"What he knew not" points to the infinite mystery of divine love. Each spiritual station reveals new depths of the unknowable Beloved, keeping the seeker in perpetual wonder and gratitude.</p>
                        </div>
                        
                        <div class="mystical-poetry">
                            <h3>📿 Mystical Reflection</h3>
                            <blockquote>
                                <p>جو کچھ تو نے پڑھا ہے، وہ تو ابتدا ہے<br>
                                اصل کتاب تو دل کے اندر چھپی ہے<br><br>
                                Whatever you have read is just the beginning<br>
                                The real book is hidden within the heart</p>
                                <footer class="quote-author">— Sufi Wisdom</footer>
                            </blockquote>
                        </div>
                        
                        <div class="spiritual-practice">
                            <h3>🌙 Spiritual Practice</h3>
                            <p>The mystic recites "Iqra" not just with the tongue but with every cell, reading divine presence in all creation. This transforms ordinary perception into mystical vision, where everything becomes a sign of the Beloved.</p>
                        </div>
                    </div>
                `;

                this.showModal(modalContent);
            }

            showAudioLibrary() {
                const reciters = this.data.reciters;
                const reciterOptions = Object.entries(reciters).map(([key, reciter]) => `
                    <div class="reciter-option ${key === this.state.audioSettings.reciter ? 'active' : ''}" 
                         onclick="app.selectReciter('${key}')">
                        <div class="reciter-name">${reciter.name}</div>
                        <div class="reciter-info">${reciter.style} • ${reciter.origin}</div>
                        <button class="preview-btn" onclick="app.previewReciter('${key}', event)">▶️</button>
                    </div>
                `).join('');

                const modalContent = `
                    <h2>🎵 Audio Library & Settings</h2>
                    
                    <div class="audio-settings">
                        <h3>🔊 Audio Settings</h3>
                        <div class="setting-group">
                            <label>Volume: <span id="volumeValue">${Math.round(this.state.audioSettings.volume * 100)}%</span></label>
                            <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="${this.state.audioSettings.volume}" 
                                   onchange="app.updateAudioSetting('volume', this.value)">
                        </div>
                        
                        <div class="setting-group">
                            <label>Speed: <span id="speedValue">${this.state.audioSettings.speed}x</span></label>
                            <input type="range" id="speedSlider" min="0.5" max="2" step="0.1" value="${this.state.audioSettings.speed}"
                                   onchange="app.updateAudioSetting('speed', this.value)">
                        </div>
                    </div>
                    
                    <div class="reciters-section">
                        <h3>👨‍🎤 Select Reciter</h3>
                        <div class="reciters-grid">
                            ${reciterOptions}
                        </div>
                    </div>
                    
                    <div class="download-guide">
                        <h3>📥 Audio Files Guide</h3>
                        <div class="guide-content">
                            <p><strong>Required folder structure:</strong></p>
                            <pre>assets/audio/reciters/
├── sudais/
│   ├── 096_001.mp3
│   ├── 096_002.mp3
│   └── ...
├── ghamdi/
│   ├── 096_001.mp3
│   └── ...
└── ...</pre>
                            
                            <h4>📥 Download Sources:</h4>
                            <ul>
                                <li><a href="https://quran.com" target="_blank">Quran.com</a> - Multiple reciters</li>
                                <li><a href="https://everyayah.com" target="_blank">EveryAyah.com</a> - Verse-by-verse</li>
                                <li><a href="https://tanzil.net" target="_blank">Tanzil.net</a> - Various formats</li>
                            </ul>
                        </div>
                    </div>
                `;

                this.showModal(modalContent);
            }

            selectReciter(reciterKey) {
                this.state.audioSettings.reciter = reciterKey;
                this.saveAudioSettings();
                
                // Update UI
                document.querySelectorAll('.reciter-option').forEach(option => {
                    option.classList.remove('active');
                });
                event.target.closest('.reciter-option').classList.add('active');
                
                this.showNotification(`🎵 Selected ${this.data.reciters[reciterKey].name}`, 'success');
            }

            previewReciter(reciterKey, event) {
                event.stopPropagation();
                
                const audio = document.getElementById('recitationAudio');
                const previewUrl = `./assets/audio/reciters/${reciterKey}/096_001.mp3`;
                
                audio.src = previewUrl;
                audio.play().catch(() => {
                    this.showNotification('🎵 Preview not available', 'warning');
                });
            }

            updateAudioSetting(setting, value) {
                this.state.audioSettings[setting] = parseFloat(value);
                this.saveAudioSettings();
                
                // Update display
                if (setting === 'volume') {
                    document.getElementById('volumeValue').textContent = `${Math.round(value * 100)}%`;
                    
                    const audio = document.getElementById('recitationAudio');
                    if (audio) audio.volume = value;
                    
                } else if (setting === 'speed') {
                    document.getElementById('speedValue').textContent = `${value}x`;
                    
                    const audio = document.getElementById('recitationAudio');
                    if (audio) audio.playbackRate = value;
                }
            }

            saveAudioSettings() {
                localStorage.setItem('surah-alaq-audio-settings', JSON.stringify(this.state.audioSettings));
            }

            exportNotes() {
                const exportData = {
                    bookmarks: this.state.bookmarks,
                    notes: this.state.userNotes,
                    preferences: this.state.preferences,
                    exportDate: new Date().toISOString(),
                    surah: 'Al-Alaq (96)'
                };

                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `surah-alaq-notes-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                this.showNotification('📤 Notes exported successfully', 'success');
            }

            toggleDarkMode() {
                const currentTheme = document.body.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.body.setAttribute('data-theme', newTheme);
                this.state.preferences.theme = newTheme;
                this.saveUserPreferences();
                
                this.showNotification(`🌗 Switched to ${newTheme} mode`, 'info');
            }

            toggleBookmarks() {
                this.showBookmarks();
            }

            // Utility Functions
            copyVerse(verseNumber) {
                const verse = this.data.surah.verses.find(v => v.number === verseNumber);
                if (!verse) return;

                const text = `
Surah Al-Alaq, Verse ${verseNumber}

Arabic: ${verse.arabic}
Translation: ${verse.translationEnglish}
Transliteration: ${verse.transliteration}

Source: Divine Knowledge Platform
                `.trim();

                navigator.clipboard.writeText(text).then(() => {
                    this.showNotification(`📋 Verse ${verseNumber} copied to clipboard`, 'success');
                }).catch(() => {
                    this.showNotification('❌ Failed to copy text', 'error');
                });
            }

            shareVerse(verseNumber) {
                const verse = this.data.surah.verses.find(v => v.number === verseNumber);
                if (!verse) return;

                const shareData = {
                    title: `Surah Al-Alaq, Verse ${verseNumber}`,
                    text: `"${verse.translationEnglish}" - Quran 96:${verseNumber}`,
                    url: window.location.href
                };

                if (navigator.share) {
                    navigator.share(shareData).catch(console.error);
                } else {
                    this.copyVerse(verseNumber);
                }
            }

            updateReadingProgress() {
                const progressBar = document.getElementById('readingProgress');
                const progressFill = document.getElementById('progressFill');
                
                if (!progressBar || !progressFill) return;

                const totalVerses = this.data.surah?.verses?.length || 19;
                const progress = ((this.state.currentVerse + 1) / totalVerses) * 100;
                
                progressFill.style.width = `${progress}%`;
                progressBar.style.display = progress > 0 ? 'block' : 'none';
            }

            setupIntersectionObserver() {
                const options = {
                    root: null,
                    rootMargin: '-50% 0px -50% 0px',
                    threshold: 0
                };

                this.intersectionObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const verseNumber = parseInt(entry.target.getAttribute('data-verse'));
                            this.state.currentVerse = verseNumber - 1;
                            this.updateNavigationButtons();
                            this.updateReadingProgress();
                        }
                    });
                }, options);

                // Observe all verse containers
                document.querySelectorAll('.verse-container').forEach(verse => {
                    this.intersectionObserver.observe(verse);
                });
            }

            setupMutationObserver() {
                this.mutationObserver = new MutationObserver((mutations) => {
                    mutations.forEach(mutation => {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('verse-container')) {
                                    this.intersectionObserver?.observe(node);
                                }
                            });
                        }
                    });
                });

                this.mutationObserver.observe(document.getElementById('mainContent'), {
                    childList: true,
                    subtree: true
                });
            }

            setupDarkMode() {
                // System preference detection
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.setAttribute('data-theme', 'dark');
                } else {
                    document.body.setAttribute('data-theme', 'light');
                }

                // Listen for system changes
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                    if (!this.state.preferences.theme) {
                        document.body.setAttribute('data-theme', event.matches ? 'dark' : 'light');
                    }
                });
            }

            restoreUserPreferences() {
                const savedPrefs = JSON.parse(localStorage.getItem('surah-alaq-preferences') || '{}');
                const savedAudioSettings = JSON.parse(localStorage.getItem('surah-alaq-audio-settings') || '{}');
                
                this.state.preferences = { ...this.state.preferences, ...savedPrefs };
                this.state.audioSettings = { ...this.state.audioSettings, ...savedAudioSettings };

                // Apply theme
                if (this.state.preferences.theme) {
                    document.body.setAttribute('data-theme', this.state.preferences.theme);
                }

                // Apply audio settings
                const audio = document.getElementById('recitationAudio');
                if (audio) {
                    audio.volume = this.state.audioSettings.volume;
                    audio.playbackRate = this.state.audioSettings.speed;
                }
            }

            saveUserPreferences() {
                localStorage.setItem('surah-alaq-preferences', JSON.stringify(this.state.preferences));
                localStorage.setItem('surah-alaq-audio-settings', JSON.stringify(this.state.audioSettings));
            }

            logInteraction(question, answer, intent) {
                // Log for learning and improvement (privacy-conscious)
                const interaction = {
                    timestamp: Date.now(),
                    intent: intent.intent,
                    language: intent.language,
                    confidence: intent.confidence,
                    session: this.getSessionId()
                };

                // Store locally for analytics (no personal data sent)
                const interactions = JSON.parse(localStorage.getItem('interaction-log') || '[]');
                interactions.push(interaction);
                
                // Keep only last 100 interactions
                if (interactions.length > 100) {
                    interactions.splice(0, interactions.length - 100);
                }
                
                localStorage.setItem('interaction-log', JSON.stringify(interactions));
            }

            getSessionId() {
                let sessionId = sessionStorage.getItem('session-id');
                if (!sessionId) {
                    sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
                    sessionStorage.setItem('session-id', sessionId);
                }
                return sessionId;
            }

            restoreFocus() {
                // Implement focus restoration logic
                const lastFocused = document.querySelector('[data-last-focused]');
                if (lastFocused) {
                    lastFocused.focus();
                    lastFocused.removeAttribute('data-last-focused');
                }
            }

            // Fallback Data
            getFallbackSurahData() {
                return {
                    name: "Al-Alaq",
                    number: 96,
                    verses: [
                        {
                            number: 1,
                            arabic: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
                            transliteration: "Iqra bi-ismi rabbika alladhee khalaq",
                            translationEnglish: "Read in the name of your Lord who created",
                            translationUrdu: "پڑھو اپنے رب کے نام سے جس نے پیدا کیا",
                            translationPashto: "د خپل رب په نوم ولولئ چې هغه یې پیدا کړي دي",
                            modernRelevance: "In our information age, this verse reminds us that true knowledge begins with divine consciousness.",
                            benefits: ["Awakens intellectual consciousness", "Establishes divine connection in learning"]
                        },
                        {
                            number: 2,
                            arabic: "خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ",
                            transliteration: "Khalaqa al-insana min 'alaq",
                            translationEnglish: "Created man from a clinging substance",
                            translationUrdu: "انسان کو جمے ہوئے خون سے پیدا کیا",
                            translationPashto: "انسان یې د وینې د ټوپ څخه پیدا کړ",
                            modernRelevance: "Modern embryology confirms this 1400-year-old description.",
                            benefits: ["Teaches humility about human origins", "Establishes human equality"]
                        },
                        {
                            number: 3,
                            arabic: "اقْرَأْ وَرَبُّكَ الْأَكْرَمُ",
                            transliteration: "Iqra wa rabbuka al-akram",
                            translationEnglish: "Read, and your Lord is the Most Generous",
                            translationUrdu: "پڑھو اور تمہارا رب سب سے زیادہ کریم ہے",
                            translationPashto: "ولولئ او ستاسو رب خورا ډیر کریم دی",
                            modernRelevance: "Encourages generous sharing of knowledge in our interconnected world.",
                            benefits: ["Builds confidence in seeking knowledge", "Encourages generous sharing"]
                        },
                        {
                            number: 4,
                            arabic: "الَّذِي عَلَّمَ بِالْقَلَمِ",
                            transliteration: "Alladhee 'allama bil-qalam",
                            translationEnglish: "Who taught by the pen",
                            translationUrdu: "جس نے قلم کے ذریعے تعلیم دی",
                            translationPashto: "هغه چې د قلم په وسیله یې زده کړه ورکړه",
                            modernRelevance: "Encompasses all forms of written communication in the digital age.",
                            benefits: ["Honors the sacred act of writing", "Encourages preservation of knowledge"]
                        },
                        {
                            number: 5,
                            arabic: "عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ",
                            transliteration: "Allama al-insana ma lam ya'lam",
                            translationEnglish: "Taught man that which he knew not",
                            translationUrdu: "انسان کو وہ علم دیا جو وہ نہیں جانتا تھا",
                            translationPashto: "انسان ته یې هغه پوهه ورکړه چې هغه یې نه پوهیده",
                            modernRelevance: "Encourages all forms of research, innovation, and discovery.",
                            benefits: ["Encourages lifelong learning", "Promotes intellectual humility"]
                        }
                    ]
                };
            }

            getFallbackReciters() {
                return {
                    sudais: {
                        name: "Sheikh Abdul Rahman Al-Sudais",
                        style: "Melodious and Clear",
                        origin: "Saudi Arabia"
                    },
                    ghamdi: {
                        name: "Sheikh Saad Al-Ghamdi",
                        style: "Emotional and Moving",
                        origin: "Saudi Arabia"
                    },
                    alafasy: {
                        name: "Sheikh Mishary Rashid Alafasy",
                        style: "Beautiful and Rhythmic",
                        origin: "Kuwait"
                    }
                };
            }

            // Cleanup
            destroy() {
                // Clean up event listeners
                this.eventListeners.forEach((events, elementId) => {
                    const element = document.getElementById(elementId);
                    if (element) {
                        events.forEach(({ event, handler }) => {
                            element.removeEventListener(event, handler);
                        });
                    }
                });

                // Clean up observers
                if (this.intersectionObserver) {
                    this.intersectionObserver.disconnect();
                }
                
                if (this.mutationObserver) {
                    this.mutationObserver.disconnect();
                }

                // Clean up audio
                if (this.audioContext) {
                    this.audioContext.close();
                }

                // Clean up speech recognition
                if (this.recognition) {
                    this.recognition.abort();
                }

                // Clean up animation frame
                if (this.animationFrame) {
                    cancelAnimationFrame(this.animationFrame);
                }

                // Save final state
                this.saveUserPreferences();
            }
        }

        // Initialize the application
        let app;
        document.addEventListener('DOMContentLoaded', () => {
            app = new SurahAlAqalApp();
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (app) {
                app.destroy();
            }
        });

        // CSS Animation Keyframes
        const additionalStyles = document.createElement('style');
        additionalStyles.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .verse-container.highlighted {
                animation: highlightPulse 2s ease-in-out;
                border-color: var(--primary-gold) !important;
                box-shadow: var(--shadow-glow) !important;
            }
            
            @keyframes highlightPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            
            .user-note {
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid #22c55e;
                border-radius: var(--radius-xl);
                padding: var(--space-4);
                margin: var(--space-4) 0;
                animation: fadeInUp var(--duration-slow) ease;
            }
            
            .user-note h4 {
                color: #22c55e;
                margin-bottom: var(--space-2);
            }
            
            .edit-note-btn {
                background: transparent;
                border: 1px solid #22c55e;
                color: #22c55e;
                padding: var(--space-2) var(--space-3);
                border-radius: var(--radius-lg);
                cursor: pointer;
                margin-top: var(--space-2);
                transition: all var(--duration-normal) ease;
            }
            
            .edit-note-btn:hover {
                background: #22c55e;
                color: var(--deep-night);
            }
            
            .action-btn {
                background: transparent;
                border: 1px solid var(--glass-border);
                color: var(--divine-white);
                padding: var(--space-2);
                border-radius: var(--radius-lg);
                cursor: pointer;
                transition: all var(--duration-normal) ease;
                font-size: var(--font-lg);
            }
            
            .action-btn:hover {
                background: var(--primary-gold);
                color: var(--deep-night);
                border-color: var(--primary-gold);
            }
            
            .action-btn.active {
                background: var(--primary-gold);
                color: var(--deep-night);
                border-color: var(--primary-gold);
            }
            
            .verse-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--space-4);
                position: relative;
            }
            
            .verse-actions {
                display: flex;
                gap: var(--space-2);
            }
            
            .timeline-event {
                display: flex;
                align-items: flex-start;
                margin-bottom: var(--space-6);
                padding: var(--space-4);
                background: var(--glass-bg);
                border-radius: var(--radius-xl);
                border-left: 4px solid var(--primary-gold);
            }
            
            .timeline-marker {
                font-size: var(--font-2xl);
                margin-right: var(--space-4);
                flex-shrink: 0;
            }
            
            .timeline-content h3 {
                color: var(--primary-gold);
                margin-bottom: var(--space-2);
            }
            
            .reciter-option {
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-xl);
                padding: var(--space-4);
                cursor: pointer;
                transition: all var(--duration-normal) ease;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--space-3);
            }
            
            .reciter-option:hover,
            .reciter-option.active {
                border-color: var(--primary-gold);
                background: rgba(var(--primary-gold-rgb), 0.1);
            }
            
            .reciter-name {
                font-weight: 600;
                color: var(--divine-white);
            }
            
            .reciter-info {
                font-size: var(--font-sm);
                color: rgba(var(--divine-white-rgb), 0.7);
            }
            
            .preview-btn {
                background: var(--gradient-gold);
                border: none;
                color: var(--deep-night);
                padding: var(--space-2);
                border-radius: var(--radius-full);
                cursor: pointer;
                font-size: var(--font-base);
            }
            
            .setting-group {
                margin-bottom: var(--space-4);
            }
            
            .setting-group label {
                display: block;
                margin-bottom: var(--space-2);
                color: var(--divine-white);
                font-weight: 600;
            }
            
            .setting-group input[type="range"] {
                width: 100%;
                height: 6px;
                border-radius: var(--radius-full);
                background: var(--glass-border);
                outline: none;
                -webkit-appearance: none;
            }
            
            .setting-group input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: var(--radius-full);
                background: var(--primary-gold);
                cursor: pointer;
            }
            
            .setting-group input[type="range"]::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: var(--radius-full);
                background: var(--primary-gold);
                cursor: pointer;
                border: none;
            }
            
            .bookmark-item {
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-xl);
                padding: var(--space-4);
                margin-bottom: var(--space-3);
                cursor: pointer;
                transition: all var(--duration-normal) ease;
            }
            
            .bookmark-item:hover {
                border-color: var(--primary-gold);
                background: rgba(var(--primary-gold-rgb), 0.1);
            }
            
            .bookmark-verse {
                font-weight: 600;
                color: var(--primary-gold);
                margin-bottom: var(--space-2);
            }
            
            .bookmark-preview {
                color: var(--divine-white);
                opacity: 0.8;
                font-size: var(--font-sm);
            }
        `;
        document.head.appendChild(additionalStyles);
    

