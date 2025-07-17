// Enhanced Voice Recognition Module for Surah Al-Alaq
class VoiceRecognitionManager {
    constructor() {
        this.recognition = null;
        this.speechSynthesis = window.speechSynthesis;
        this.isListening = false;
        this.currentLanguage = 'en-US';
        this.supportedLanguages = {
            'english': 'en-US',
            'urdu': 'ur-PK',
            'pashto': 'ps-AF',
            'arabic': 'ar-SA'
        };
        
        this.languagePatterns = {
            // Arabic script detection
            arabic: /[\u0600-\u06FF]/,
            // Urdu specific patterns
            urdu: /[\u0627-\u064A\u06A9\u06AF\u06BE\u06CC]/,
            // Pashto specific characters
            pashto: /[ټډړږښګځڅ]/,
            // English (Latin script)
            english: /[a-zA-Z]/
        };

        this.intentPatterns = {
            revelation: {
                english: /revelation|revealed|when.*reveal|first.*verse|cave.*hira/i,
                urdu: /نازل|نزول|کب.*نازل|پہلی.*آیت|غار.*حرا/i,
                pashto: /نازل|کله.*نازل|لومړی.*آیت|غار.*حرا/i,
                arabic: /نزول|نازل|متى.*نزل|أول.*آية|غار.*حراء/i
            },
            meaning: {
                english: /meaning|means|what.*mean|definition|explain/i,
                urdu: /معنی|مطلب|کیا.*مطلب|تعریف|وضاحت/i,
                pashto: /معنی|مطلب|څه.*مطلب|تعریف|وضاحت/i,
                arabic: /معنى|مفهوم|ما.*معنى|تعريف|شرح/i
            },
            tafsir: {
                english: /tafsir|commentary|interpretation|explain.*detail/i,
                urdu: /تفسیر|تفصیل|تشریح|تفصیلی.*وضاحت/i,
                pashto: /تفسیر|تفصیل|تشریح|تفصیلي.*وضاحت/i,
                arabic: /تفسير|شرح|تأويل|تفصيل/i
            },
            audio: {
                english: /audio|play|listen|recitation|sound/i,
                urdu: /آڈیو|سنو|بجا|تلاوت|آواز/i,
                pashto: /آډیو|واورئ|وغږوئ|تلاوت|غږ/i,
                arabic: /صوت|استمع|تشغيل|تلاوة|قراءة/i
            },
            benefits: {
                english: /benefits|blessing|virtue|reward|advantage/i,
                urdu: /فوائد|برکت|فضیلت|ثواب|فائدہ/i,
                pashto: /ګټې|برکت|فضیلت|ثواب|ګټه/i,
                arabic: /فوائد|بركة|فضل|ثواب|منفعة/i
            },
            translation: {
                english: /translation|translate|in.*language/i,
                urdu: /ترجمہ|ترجمے|زبان.*میں/i,
                pashto: /ژباړه|ژباړې|په.*ژبه/i,
                arabic: /ترجمة|ترجم|باللغة/i
            }
        };

        this.responses = {
            revelation: {
                english: "Surah Al-Alaq has a unique revelation history. Verses 1-5 were the very first revelation to Prophet Muhammad (peace be upon him) in the cave of Hira around 610 CE. These verses marked the beginning of the Quranic revelation. The remaining verses 6-19 were revealed later in Medina during conflicts with opposition.",
                urdu: "سورہ علق کی انوکھی تاریخ نزول ہے۔ آیات 1-5 نبی کریم صلی اللہ علیہ وسلم پر غار حرا میں سب سے پہلے نازل ہوئیں۔ یہ آیات قرآنی وحی کی ابتدا تھیں۔ باقی آیات 6-19 بعد میں مدینہ میں مخالفت کے دوران نازل ہوئیں۔",
                pashto: "د علق سورت د نزول ځانګړی تاریخ لري. د 1-5 آیات د پیغمبر (ص) پر د حرا په غار کې لومړی نازل شوي. دا آیات د قرآني وحي پیل وو. پاتې آیات 6-19 وروسته په مدینه کې د مخالفت پر مهال نازل شوي.",
                arabic: "سورة العلق لها تاريخ نزول فريد. الآيات 1-5 كانت أول وحي نزل على النبي محمد صلى الله عليه وسلم في غار حراء حوالي 610 م. هذه الآيات كانت بداية الوحي القرآني. الآيات الباقية 6-19 نزلت لاحقاً في المدينة أثناء الصراعات مع المعارضة."
            },
            meaning: {
                english: "Al-Alaq means 'The Clot' or 'The Embryo', referring to the early stage of human creation from a clinging substance. This surah emphasizes the divine nature of knowledge, the importance of reading and learning, and recognizing Allah as the ultimate source of all wisdom and education.",
                urdu: "علق کا مطلب 'جما ہوا خون' یا 'علقہ' ہے جو انسانی تخلیق کے ابتدائی مرحلے کو ظاہر کرتا ہے۔ یہ سورہ علم کی الہی نوعیت، پڑھنے اور سیکھنے کی اہمیت، اور اللہ کو تمام حکمت اور تعلیم کا منبع ماننے پر زور دیتا ہے۔",
                pashto: "علق د وینې د ټوپ یا د ماشوم د لومړنۍ مرحلې معنی لري چې د انسان د جوړولو لومړنۍ مرحله ښیي. دا سورت د پوهې الهي طبیعت، د لوستلو او زده کړې اهمیت، او د الله د ټولو حکمتونو او زده کړو د سرچینې په توګه پیژندلو ټینګار کوي.",
                arabic: "العلق تعني الجلطة أو العلقة، وتشير إلى المرحلة المبكرة من خلق الإنسان من مادة متعلقة. تؤكد هذه السورة على الطبيعة الإلهية للمعرفة، وأهمية القراءة والتعلم، والاعتراف بالله كمصدر نهائي لكل حكمة وتعليم."
            },
            tafsir: {
                english: "The tafsir of Surah Al-Alaq reveals multiple layers of meaning: cosmic (divine knowledge permeating creation), psychological (transforming learning into spiritual growth), social (establishing education as a divine mandate), and spiritual (reading as communion with Allah). Each verse contains profound wisdom about knowledge, creation, and human purpose.",
                urdu: "سورہ علق کی تفسیر کئی معنوی تہوں کو ظاہر کرتی ہے: کائناتی (تخلیق میں الہی علم کا سرایت)، نفسیاتی (تعلیم کو روحانی ترقی میں تبدیل کرنا)، سماجی (تعلیم کو الہی فریضہ قرار دینا)، اور روحانی (پڑھنے کو اللہ سے رابطے کا ذریعہ بنانا)۔ ہر آیت میں علم، تخلیق اور انسانی مقصد کے بارے میں گہری حکمت موجود ہے۔",
                pashto: "د علق سورت تفسیر د معنی څانګې څرګندوي: کائناتي (په تخلیق کې الهي پوهه)، رواني (زده کړه روحاني وده ته اړول)، ټولنیز (زده کړه د الهي دنده په توګه ټاکل)، او روحاني (لوستل د الله سره د اړیکې لاره). هر آیت کې د پوهې، تخلیق او د انسان د موخې په اړه ژور حکمت شته.",
                arabic: "تفسير سورة العلق يكشف طبقات متعددة من المعنى: كونية (المعرفة الإلهية تتخلل الخلق)، نفسية (تحويل التعلم إلى نمو روحي)، اجتماعية (تأسيس التعليم كتكليف إلهي)، وروحية (القراءة كتواصل مع الله). كل آية تحتوي على حكمة عميقة حول المعرفة والخلق والغرض الإنساني."
            },
            benefits: {
                english: "Reciting Surah Al-Alaq brings numerous spiritual benefits: awakens intellectual consciousness, strengthens connection with Allah, develops humility about human origins, encourages lifelong learning, promotes ethical knowledge acquisition, and inspires recognition of divine generosity in all learning experiences.",
                urdu: "سورہ علق کی تلاوت کے بے شمار روحانی فوائد ہیں: ذہنی شعور بیدار کرنا، اللہ سے تعلق مضبوط کرنا، انسانی ابتدا کے بارے میں عاجزی پیدا کرنا، زندگی بھر سیکھنے کی ترغیب، اخلاقی علم حاصل کرنے کو فروغ دینا، اور تمام تعلیمی تجربات میں الہی کرم کی پہچان کو متاثر کرنا۔",
                pashto: "د علق د سورت لوستل ډیرې روحاني ګټې لري: ذهني شعور راویښول، د الله سره اړیکه پیاوړې کول، د انسان د پیل په اړه عاجزي رامنځته کول، د ژوند د اوږدۍ زده کړې هڅول، اخلاقي پوهه ترلاسه کول، او په ټولو زده کړو کې د الهي کرم پیژندنه.",
                arabic: "تلاوة سورة العلق تجلب فوائد روحية عديدة: إيقاظ الوعي الفكري، تقوية الصلة بالله، تطوير التواضع حول أصول الإنسان، تشجيع التعلم مدى الحياة، تعزيز اكتساب المعرفة الأخلاقية، وإلهام الاعتراف بالكرم الإلهي في جميع تجارب التعلم."
            },
            general: {
                english: "This is a profound question about Surah Al-Alaq, the first revelation that began Islam's emphasis on knowledge and learning. This surah teaches us about the divine nature of knowledge, human creation from humble beginnings, and the importance of reading with divine consciousness. Would you like to explore any specific aspect?",
                urdu: "یہ سورہ علق کے بارے میں بہت اہم سوال ہے، جو پہلی وحی تھی جس نے اسلام میں علم اور تعلیم پر زور کی ابتدا کی۔ یہ سورہ ہمیں علم کی الہی نوعیت، انسان کی عاجز ابتدا، اور الہی شعور کے ساتھ پڑھنے کی اہمیت سکھاتا ہے۔ کیا آپ کسی خاص پہلو کو دیکھنا چاہیں گے؟",
                pashto: "دا د علق سورت په اړه ډېر مهمه پوښتنه دی، چې لومړی وحي وو چې په اسلام کې د پوهې او زده کړې ټینګار یې پیل کړ. دا سورت موږ ته د پوهې الهي طبیعت، د انسان عاجز پیل، او د الهي شعور سره د لوستلو اهمیت ښووي. ایا تاسو غواړئ کومه ځانګړې اړخ وګورئ؟",
                arabic: "هذا سؤال عميق حول سورة العلق، الوحي الأول الذي بدأ تأكيد الإسلام على المعرفة والتعلم. تعلمنا هذه السورة عن الطبيعة الإلهية للمعرفة، وخلق الإنسان من بدايات متواضعة، وأهمية القراءة بالوعي الإلهي. هل تود استكشاف أي جانب محدد؟"
            }
        };

        this.init();
    }

    init() {
        this.initializeSpeechRecognition();
        this.setupEventListeners();
        this.loadVoices();
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            this.showNotification('🎤 Voice recognition not supported in this browser', 'warning');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition settings
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        this.recognition.lang = this.currentLanguage;

        // Set up event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceButton();
            this.showVoiceResponse('🎤 Listening... Ask your question in any language');
            this.startListeningAnimation();
        };

        this.recognition.onresult = (event) => {
            let transcript = '';
            let isFinal = false;
            let confidence = 0;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                transcript += result[0].transcript;
                confidence = Math.max(confidence, result[0].confidence);
                if (result.isFinal) isFinal = true;
            }

            if (isFinal) {
                this.processVoiceInput(transcript, confidence);
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

        return true;
    }

    detectLanguage(text) {
        // Check for script patterns
        if (this.languagePatterns.pashto.test(text)) {
            return 'pashto';
        } else if (this.languagePatterns.arabic.test(text)) {
            // Distinguish between Arabic and Urdu
            if (this.languagePatterns.urdu.test(text)) {
                return 'urdu';
            }
            return 'arabic';
        } else if (this.languagePatterns.english.test(text)) {
            return 'english';
        }

        // Fallback to browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('ur')) return 'urdu';
        if (browserLang.startsWith('ar')) return 'arabic';
        if (browserLang.startsWith('ps')) return 'pashto';
        
        return 'english';
    }

    analyzeIntent(text, language) {
        const lowerText = text.toLowerCase();
        
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            const pattern = patterns[language];
            if (pattern && pattern.test(text)) {
                return {
                    intent,
                    confidence: this.calculateIntentConfidence(text, intent, language),
                    language
                };
            }
        }

        return {
            intent: 'general',
            confidence: 0.5,
            language
        };
    }

    calculateIntentConfidence(text, intent, language) {
        const words = text.split(/\s+/).length;
        const pattern = this.intentPatterns[intent]?.[language];
        
        if (!pattern) return 0.3;

        const matches = text.match(pattern);
        const matchCount = matches ? matches.length : 0;
        
        // Base confidence on match density and text length
        let confidence = Math.min(0.9, (matchCount / words) * 2 + 0.3);
        
        // Boost confidence for exact keyword matches
        const keywordBonus = this.getKeywordBonus(text, intent, language);
        confidence = Math.min(0.95, confidence + keywordBonus);
        
        return confidence;
    }

    getKeywordBonus(text, intent, language) {
        const keywordSets = {
            revelation: {
                english: ['revelation', 'revealed', 'first', 'cave', 'hira'],
                urdu: ['نازل', 'نزول', 'پہلی', 'غار', 'حرا'],
                pashto: ['نازل', 'لومړی', 'غار', 'حرا'],
                arabic: ['نزول', 'نازل', 'أول', 'غار', 'حراء']
            },
            meaning: {
                english: ['meaning', 'means', 'definition', 'explain'],
                urdu: ['معنی', 'مطلب', 'تعریف', 'وضاحت'],
                pashto: ['معنی', 'مطلب', 'تعریف', 'وضاحت'],
                arabic: ['معنى', 'مفهوم', 'تعريف', 'شرح']
            }
        };

        const keywords = keywordSets[intent]?.[language] || [];
        const lowerText = text.toLowerCase();
        
        let bonus = 0;
        keywords.forEach(keyword => {
            if (lowerText.includes(keyword.toLowerCase())) {
                bonus += 0.1;
            }
        });

        return Math.min(0.3, bonus);
    }

    async processVoiceInput(transcript, confidence) {
        try {
            this.showLoading(true, 'Processing your question...');
            
            // Detect language and analyze intent
            const language = this.detectLanguage(transcript);
            const intentAnalysis = this.analyzeIntent(transcript, language);
            
            console.log('Voice input processed:', {
                transcript,
                confidence,
                detectedLanguage: language,
                intent: intentAnalysis
            });

            // Generate response
            const response = this.generateResponse(intentAnalysis);
            
            // Show and speak response
            this.showVoiceResponse(response);
            await this.speakResponse(response, language);
            
            // Log interaction for analytics
            this.logInteraction(transcript, response, intentAnalysis);
            
        } catch (error) {
            console.error('Voice processing error:', error);
            this.showVoiceResponse('❌ Sorry, I could not process your question. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    generateResponse(intentAnalysis) {
        const { intent, language } = intentAnalysis;
        
        const responseSet = this.responses[intent] || this.responses.general;
        return responseSet[language] || responseSet.english;
    }

    async speakResponse(text, language) {
        if (!this.speechSynthesis) {
            console.warn('Speech synthesis not available');
            return;
        }

        // Stop any current speech
        this.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language-specific settings
        utterance.lang = this.supportedLanguages[language] || 'en-US';
        utterance.rate = 0.9;
        utterance.volume = 0.8;
        utterance.pitch = 1;

        // Find the best voice for the language
        const voices = this.speechSynthesis.getVoices();
        const preferredVoice = this.findBestVoice(voices, language);
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        // Add event listeners
        utterance.onstart = () => {
            console.log('Speech synthesis started');
        };

        utterance.onend = () => {
            console.log('Speech synthesis ended');
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
        };

        this.speechSynthesis.speak(utterance);
    }

    findBestVoice(voices, language) {
        const langCode = this.supportedLanguages[language];
        if (!langCode) return null;

        // First, try to find exact language match
        let voice = voices.find(v => v.lang === langCode);
        if (voice) return voice;

        // Then try language family match (e.g., 'en' for 'en-US')
        const langFamily = langCode.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(langFamily));
        if (voice) return voice;

        // Fallback to default voice
        return voices.find(v => v.default) || voices[0];
    }

    loadVoices() {
        // Load voices when they become available
        if (this.speechSynthesis.getVoices().length === 0) {
            this.speechSynthesis.addEventListener('voiceschanged', () => {
                console.log('Voices loaded:', this.speechSynthesis.getVoices().length);
            });
        }
    }

    startListening() {
        if (!this.recognition) {
            this.showNotification('🎤 Voice recognition not available', 'error');
            return false;
        }

        if (this.isListening) {
            this.stopListening();
            return false;
        }

        try {
            // Auto-detect language or use current setting
            this.recognition.lang = this.currentLanguage;
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.showNotification('🎤 Failed to start voice recognition', 'error');
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isListening = false;
        this.updateVoiceButton();
        this.stopListeningAnimation();
        
        // Hide voice response after delay
        setTimeout(() => {
            const voiceResponse = document.getElementById('voiceResponse');
            if (voiceResponse) {
                voiceResponse.style.display = 'none';
            }
        }, 3000);
    }

    switchLanguage(language) {
        if (this.supportedLanguages[language]) {
            this.currentLanguage = this.supportedLanguages[language];
            
            if (this.recognition) {
                this.recognition.lang = this.currentLanguage;
            }
            
            this.showNotification(`🌐 Voice recognition switched to ${language}`, 'info');
        }
    }

    handleVoiceError(error) {
        const errorMessages = {
            'no-speech': 'No speech detected. Please try speaking clearly.',
            'audio-capture': 'Microphone not available. Please check permissions.',
            'not-allowed': 'Microphone permission denied. Please allow microphone access.',
            'network': 'Network error occurred. Please check your connection.',
            'service-not-allowed': 'Speech service not allowed. Please try again.',
            'aborted': 'Speech recognition was aborted.',
            'language-not-supported': 'Language not supported. Switching to English.'
        };

        const message = errorMessages[error] || `Speech recognition error: ${error}`;
        this.showNotification(`🎤 ${message}`, 'error');

        // Auto-switch to English if language not supported
        if (error === 'language-not-supported') {
            this.switchLanguage('english');
        }
    }

    updateVoiceButton() {
        const voiceButtons = document.querySelectorAll('.voice-btn, .voice-search-btn');
        
        voiceButtons.forEach(btn => {
            if (btn) {
                btn.classList.toggle('listening', this.isListening);
                btn.title = this.isListening ? 'Stop Listening' : 'Start Voice Search';
                
                // Update button text/icon if needed
                if (this.isListening) {
                    btn.style.background = 'linear-gradient(45deg, #ff4444, #ff6666)';
                } else {
                    btn.style.background = 'var(--gradient-gold)';
                }
            }
        });
    }

    startListeningAnimation() {
        const voiceButtons = document.querySelectorAll('.voice-btn, .voice-search-btn');
        voiceButtons.forEach(btn => {
            if (btn) {
                btn.classList.add('listening');
            }
        });
    }

    stopListeningAnimation() {
        const voiceButtons = document.querySelectorAll('.voice-btn, .voice-search-btn');
        voiceButtons.forEach(btn => {
            if (btn) {
                btn.classList.remove('listening');
            }
        });
    }

    showVoiceResponse(message) {
        const responseDiv = document.getElementById('voiceResponse');
        if (responseDiv) {
            responseDiv.textContent = message;
            responseDiv.style.display = 'block';
        }
    }

    showLoading(show, message = 'Loading...') {
        const loading = document.getElementById('loading');
        const loadingText = loading?.querySelector('.loading-text');
        
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
            if (loadingText && message) {
                loadingText.textContent = message;
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create or update notification
        let notification = document.getElementById('voice-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'voice-notification';
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
            `;
            document.body.appendChild(notification);
        }

        // Set style based on type
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
        }, 4000);
    }

    logInteraction(input, output, analysis) {
        // Log interaction for analytics (privacy-conscious)
        const interaction = {
            timestamp: Date.now(),
            language: analysis.language,
            intent: analysis.intent,
            confidence: analysis.confidence,
            inputLength: input.length,
            outputLength: output.length
        };

        // Store locally for analytics
        const interactions = JSON.parse(localStorage.getItem('voice-interactions') || '[]');
        interactions.push(interaction);
        
        // Keep only last 50 interactions
        if (interactions.length > 50) {
            interactions.splice(0, interactions.length - 50);
        }
        
        localStorage.setItem('voice-interactions', JSON.stringify(interactions));
    }

    setupEventListeners() {
        // Listen for voice button clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.voice-btn, .voice-search-btn')) {
                e.preventDefault();
                this.startListening();
            }
        });

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Space for voice activation
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                this.startListening();
            }
            
            // Escape to stop listening
            if (e.key === 'Escape' && this.isListening) {
                e.preventDefault();
                this.stopListening();
            }
        });
    }

    // Public API methods
    toggle() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    setLanguage(language) {
        this.switchLanguage(language);
    }

    getStatus() {
        return {
            isListening: this.isListening,
            currentLanguage: this.currentLanguage,
            isSupported: !!this.recognition,
            supportedLanguages: Object.keys(this.supportedLanguages)
        };
    }
}

// Global voice recognition instance
window.voiceRecognition = new VoiceRecognitionManager();

// Global functions for backward compatibility
function toggleVoiceRecognition() {
    return window.voiceRecognition.toggle();
}

function toggleVoiceSearch() {
    return window.voiceRecognition.toggle();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceRecognitionManager;
}

