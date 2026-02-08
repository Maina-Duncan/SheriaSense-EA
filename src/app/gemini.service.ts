import { Injectable } from '@angular/core';
import { 
  GoogleGenerativeAI, 
  ChatSession, 
  GenerativeModel, 
  HarmCategory, 
  HarmBlockThreshold 
} from '@google/generative-ai';
import { environment } from '../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel | null = null;
  private chatSession: ChatSession | null = null;
  
  // Public variables for components to bind to
  selectedCountry: string = 'Kenya'; 
  currentMotto: string = 'Sheria • Haki • Uwazi';

  constructor() {
    // Initialize Google AI with your API Key
    this.genAI = new GoogleGenerativeAI(environment.apiKey);
    
    // Start the initial chat session
    this.startNewChat();
  }

  // --- 1. Switch Country & Reset Persona ---
  setCountry(name: string, motto: string) {
    this.selectedCountry = name;
    this.currentMotto = motto;
    this.startNewChat(); // Reset the AI with the new country context
  }

  // --- 2. Initialize the AI Model & Chat ---
  startNewChat() {
    const PROMPT = `
    You are SheriaSenseEA, a specialized legal assistant for East Africa.
    
    **CURRENT CONTEXT:**
    You are currently assisting a user in **${this.selectedCountry}**. 
    Prioritize the Constitution and Laws of **${this.selectedCountry}**.

    **YOUR STRICT MANDATE:**
    1. **SCOPE:** You deal ONLY with the Laws, Constitutions, Legal Procedures, and Civic Matters of **Kenya, Uganda, and Tanzania**.
    2. **REFUSAL PROTOCOL:** If a user asks about:
       - Politics (unrelated to law)
       - General Knowledge (e.g., "Who is the President of USA?")
       - Laws of countries outside East Africa (e.g., US Law)
       - Sports, Entertainment, or Personal advice
       
       **YOU MUST REPLY:** "My expertise is strictly limited to legal matters in East Africa. I cannot answer questions about that topic."
    
    **RESPONSE FORMAT:**
    1. **IF "How to..." / "Steps for...":** Prerequisites -> Numbered Steps.
    2. **IF Document Analysis:** Summary -> Key Risks/Clauses.
    3. **IF General Legal Question:** Direct Answer -> Legal Basis (Cite laws).

    4. **DISCLAIMER:** End EVERY message with: "**Disclaimer: This is for educational purposes only. Consult a qualified Advocate.**"
    `;

    // Initialize Model with System Instruction
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-3-pro-preview', // UPDATED: Using the requested model
      systemInstruction: PROMPT,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    // Start a new chat session
    this.chatSession = this.model.startChat({
      history: [] 
    });
  }

  // --- 3. Send Message to Gemini ---
  async chatWithGemini(text: string, file?: { data: string, mimeType: string }): Promise<string> {
    if (!this.chatSession) this.startNewChat();

    try {
      let result;
      
      if (file) {
        console.log(`Sending file to model: ${file.mimeType}`);
        // Send Text + Image/PDF
        result = await this.chatSession!.sendMessage([
          { text: text || `Analyze this document based on the laws of ${this.selectedCountry}. Summarize legal risks.` },
          { inlineData: { data: file.data, mimeType: file.mimeType } }
        ]);
      } else {
        // Send Text Only
        result = await this.chatSession!.sendMessage(text);
      }

      const response = await result.response;
      return response.text();

    } catch (error: any) {
      console.error('Gemini Service Error:', error);
      
      // Error Handling specifically for model issues
      if (error.message && error.message.includes('404')) {
        return "Error 404: The model 'gemini-3-pro-preview' was not found. Please verify your API key access.";
      }
      if (error.message && error.message.includes('403')) {
        return "Error 403: API Key Invalid or Restricted.";
      }
      
      return "I encountered an error processing your request. Please try again.";
    }
  }
}