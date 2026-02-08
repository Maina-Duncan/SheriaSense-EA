import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { GeminiService } from '../gemini.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  userInput = '';
  isLoading = false;
  isAnalyzing = false;
  isListening = false;
  selectedFile: File | null = null;
  
  // State variables
  isSwahili = false;
  showSafetyWarning = false;
  speakingMessageIndex: number | null = null;
  currentMode: string = ''; // Tracks if we are in 'analyze', 'guide', or ''
  
  // --- LOCALIZED DATA ---
  chipsEn = [
    { label: ' Arrested?', text: 'I have been arrested. What are my immediate rights?' },
    { label: ' Rent Dispute', text: 'My landlord wants to evict me. What is the law?' },
    { label: ' Fired?', text: 'I was fired without notice. Is this legal?' },
    { label: ' Contract Review', text: 'What should I look for before signing a contract?' }
  ];

  chipsSw = [
    { label: ' Nimekamatwa?', text: 'Nimekamatwa na polisi. Haki zangu ni zipi?' },
    { label: ' Mzozo wa Kodi', text: 'Mwenye nyumba anataka kunifukuza. Sheria inasemaje?' },
    { label: ' Nimefutwa?', text: 'Nimefutwa kazi bila notisi. Hii ni halali?' },
    { label: ' Kagua Mkataba', text: 'Niangalie nini kabla ya kutia saini mkataba?' }
  ];

  // Active Chips (Defaults to English)
  suggestionChips = this.chipsEn;

  chatHistory: { 
    role: 'user' | 'ai', 
    text: string, 
    attachment?: boolean 
  }[] = [];

  countries = [
    { name: 'Kenya', flag: 'https://flagcdn.com/w40/ke.png' },
    { name: 'Uganda', flag: 'https://flagcdn.com/w40/ug.png' },
    { name: 'Tanzania', flag: 'https://flagcdn.com/w40/tz.png' }
  ];

  recognition: any;

  constructor(
    public geminiService: GeminiService, 
    private zone: NgZone,
    private route: ActivatedRoute
  ) {
    const { webkitSpeechRecognition }: any = window;
    if (webkitSpeechRecognition) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'en-KE'; 
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.zone.run(() => {
          this.userInput = transcript;
          this.isListening = false;
        });
      };
      this.recognition.onerror = () => this.zone.run(() => this.isListening = false);
      this.recognition.onend = () => this.zone.run(() => this.isListening = false);
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.currentMode = params['mode'] || ''; // Capture mode
      this.addWelcomeMessage();
    });
  }

  ngOnDestroy() {
    window.speechSynthesis.cancel();
  }

  // --- HELPER: GENERATE WELCOME MESSAGE ---
  getWelcomeMessage(swahili: boolean): string {
    const country = this.geminiService.selectedCountry;
    
    if (this.currentMode === 'analyze') {
      return swahili
        ? `Jambo! Uko katika **Hali ya Kuchambua Hati** 📄\nNiko tayari kupitia hati zako za kisheria za **${country}**.\n**Tafadhali pakia picha au PDF** ukitumia ikoni ya Pini (📎).`
        : `Jambo! You are in **Document Analysis Mode** 📄\nI am ready to review your **${country}** legal documents.\n**Please upload an image or PDF** using the Paperclip icon (📎).`;
    } else if (this.currentMode === 'guide') {
      return swahili
        ? `Jambo! Uko katika **Hali ya Mwongozo wa Hatua kwa Hatua** 🗺️\nNaweza kukuongoza kupitia taratibu rasmi za **${country}**.\n**Andika tu unachotaka kufanya.**`
        : `Jambo! You are in **Step-by-Step Guide Mode** 🗺️\nI can walk you through official **${country}** procedures.\n**Just type what you want to do.**`;
    } else {
      return swahili
        ? `Jambo! Karibu kwa **SheriaSenseEA**.\nNiko tayari kuelezea sheria za **${country}**.\n**Naweza kukusaidia aje leo?**`
        : `Jambo! Welcome to **SheriaSenseEA**.\nI am currently set to explain **${country}** laws.\n**How can I help you today?**`;
    }
  }

  // --- FEATURE: UPDATE UI & TRANSLATE WELCOME ---
  updateUI() {
    // 1. Swap Chips
    this.suggestionChips = this.isSwahili ? this.chipsSw : this.chipsEn;
    
    // 2. Update Voice Lang
    if (this.recognition) {
      this.recognition.lang = this.isSwahili ? 'sw-KE' : 'en-KE';
    }

    // 3. LIVE TRANSLATE WELCOME MESSAGE
    // Check if the first message is the AI welcome message
    if (this.chatHistory.length > 0 && this.chatHistory[0].role === 'ai') {
       this.chatHistory[0].text = this.getWelcomeMessage(this.isSwahili);
    }
  }

  addWelcomeMessage() {
    // Only add if empty
    if (this.chatHistory.length > 0) return;
    
    const msg = this.getWelcomeMessage(this.isSwahili);
    this.chatHistory.push({ role: 'ai', text: msg });
  }

  switchCountry(name: string) {
    if (this.geminiService.selectedCountry === name) return;
    this.geminiService.setCountry(name, 'Sheria');
    this.chatHistory = []; 
    this.addWelcomeMessage(); 
  }

  toggleMic() {
    if (!this.recognition) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.recognition.lang = this.isSwahili ? 'sw-KE' : 'en-KE';
      this.recognition.start();
      this.isListening = true;
    }
  }

  speak(text: string, index: number) {
    if (this.speakingMessageIndex === index) {
      window.speechSynthesis.cancel();
      this.speakingMessageIndex = null;
      return;
    }
    window.speechSynthesis.cancel();
    this.speakingMessageIndex = index;

    const cleanText = text.replace(/[*#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google UK English Male')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => this.zone.run(() => this.speakingMessageIndex = null);
    utterance.onerror = () => this.zone.run(() => this.speakingMessageIndex = null);

    window.speechSynthesis.speak(utterance);
  }

  share(text: string) {
    const cleanText = text.replace(/[*#]/g, '');
    const url = `https://wa.me/?text=${encodeURIComponent('From SheriaSense:\n\n' + cleanText)}`;
    window.open(url, '_blank');
  }

  useChip(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Please upload a file smaller than 5MB.");
        return;
      }
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        this.selectedFile = file;
      } else {
        alert('Please upload an Image or PDF.');
      }
    }
  }

  clearFile() {
    this.selectedFile = null;
  }

  // --- UPDATED SEND MESSAGE (FORCES COUNTRY CONTEXT) ---
  async sendMessage() {
    if ((!this.userInput.trim() && !this.selectedFile) || this.isLoading) return;
    
    // Stop speaking if currently speaking
    window.speechSynthesis.cancel();
    this.speakingMessageIndex = null;

    const lowerMsg = this.userInput.toLowerCase();
    this.showSafetyWarning = !!lowerMsg.match(/suicide|kill|rape|assault|murder|die|violence|kufa|ua|baka/); 

    // 1. BASE PROMPT
    let finalPrompt = this.userInput;

    // 2. FORCE COUNTRY CONTEXT 
    // This injects the selected country into the prompt so Gemini cannot ignore it.
    const country = this.geminiService.selectedCountry;
    finalPrompt = `[Context: The user is located in ${country}. Answer strictly according to ${country} laws.] ${finalPrompt}`;

    // 3. SWAHILI INSTRUCTION
    if (this.isSwahili) {
      finalPrompt += " (Reply in fluent Swahili, use simple legal terms)";
    }

    const messageDisplay = this.userInput; 
    const hasFile = !!this.selectedFile;
    const fileToSend = this.selectedFile; 

    // Clear input
    this.userInput = ''; 
    this.selectedFile = null;

    // Show user message (without the hidden context tags)
    this.chatHistory.push({ 
      role: 'user', 
      text: messageDisplay || (hasFile ? (this.isSwahili ? "Chambua hati hii" : "Analyze this document") : ""), 
      attachment: hasFile 
    });

    this.scrollToBottom();
    this.isLoading = true;
    if (hasFile) this.isAnalyzing = true;

    try {
      let response = '';
      if (hasFile && fileToSend) {
        const base64Data = await this.fileToBase64(fileToSend);
        // Send the PROMPT with the File
        response = await this.geminiService.chatWithGemini(finalPrompt || "Analyze this document.", { data: base64Data, mimeType: fileToSend.type });
      } else {
        // Send the PROMPT (Text only)
        response = await this.geminiService.chatWithGemini(finalPrompt);
      }
      this.zone.run(() => {
        this.chatHistory.push({ role: 'ai', text: response });
        this.isLoading = false;
        this.isAnalyzing = false;
      });
    } catch (error) {
      this.zone.run(() => {
        this.chatHistory.push({ role: 'ai', text: this.isSwahili ? "Hitilafu imetokea. Tafadhali jaribu tena." : "Error processing request. Please try again." });
        this.isLoading = false;
        this.isAnalyzing = false;
      });
    }
  }

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }

  scrollToBottom(): void {
    setTimeout(() => { try { this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight; } catch(err) { } }, 100);
  }

  formatText(text: string): string {
    if (!text) return '';
    let formatted = text;
    formatted = formatted.replace(/^#{1,6}\s+(.*)$/gm, '<strong>$1</strong>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^\*\s+(.*)$/gm, '• $1');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
}