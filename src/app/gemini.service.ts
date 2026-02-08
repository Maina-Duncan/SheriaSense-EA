import { Injectable } from '@angular/core';
import { 
  GoogleGenerativeAI, 
  ChatSession, 
  GenerativeModel, 
  HarmCategory, 
  HarmBlockThreshold 
} from '@google/generative-ai';
import { environment } from '../environments/environment'; // Ensure this path is correct

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private chatSession: ChatSession | null = null;
  
  // These variables are needed by your components
  selectedCountry: string = 'Kenya'; 
  currentMotto: string = 'Sheria • Haki • Uwazi';

  constructor() {
    // Initialize with the key from your environment file
    this.genAI = new GoogleGenerativeAI(environment.geminiApiKey);
    
    // Using gemini-3-pro-preview (fallback to gemini-1.5-flash if 404 occurs)
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-3-pro-preview',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
    
    this.startNewChat();
  }

  // --- MISSING METHOD 1: setCountry ---
  setCountry(name: string, motto: string) {
    this.selectedCountry = name;
    this.currentMotto = motto;
    this.startNewChat(); 
  }

  // --- MISSING METHOD 2: startNewChat ---
  startNewChat() {
    const systemInstruction = `You are SheriaSenseEA, a specialized legal assistant for East Africa.
    
    **YOUR STRICT MANDATE:**
    1. **SCOPE:** You deal ONLY with the Laws, Constitutions, Legal Procedures, and Civic Matters of **Kenya, Uganda, and Tanzania**.
    2. **REFUSAL PROTOCOL:** If a user asks about:
       - Politics (unrelated to law)
       - General Knowledge (e.g., "Who is the President of USA?")
       - Laws of countries outside East Africa (e.g., US Law)
       - Sports, Entertainment, or Personal advice
       
       **YOU MUST REPLY:** "My expertise is strictly limited to legal matters in East Africa (Kenya, Uganda, Tanzania). I cannot answer questions about [Topic/Country]."
    
    **RESPONSE FORMAT:**
    1. **IF "How to..." / "Steps for...":** Prerequisites -> Numbered Steps.
    2. **IF Document Analysis:** Summary -> Key Risks/Clauses.
    3. **IF General Legal Question:** Direct Answer -> Legal Basis (Cite laws).

    4. **DISCLAIMER:** End EVERY message with: "**Disclaimer: This is for educational purposes only.**"`;

    this.chatSession = this.model.startChat({
      history: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Understood. I will strictly limit my responses to East African legal matters and refuse all off-topic or international queries." }] }
      ]
    });
  }

  // --- MISSING METHOD 3: chatWithGemini ---
  async chatWithGemini(text: string, file?: { data: string, mimeType: string }): Promise<string> {
    if (!this.chatSession) this.startNewChat();

    try {
      let result;
      
      if (file) {
        console.log(`Sending file to model: ${file.mimeType}`);
        result = await this.chatSession!.sendMessage([
          { inlineData: { data: file.data, mimeType: file.mimeType } },
          { text: text || "Analyze this document for legal risks and summary within the context of East African law." }
        ]);
      } else {
        result = await this.chatSession!.sendMessage(text);
      }

      const response = await result.response;
      return response.text();

    } catch (error: any) {
      console.error('Gemini Service Error:', error);
      if (error.message && error.message.includes('404')) {
        return "Error 404: The model 'gemini-3-pro-preview' was not found. Please check API key/Model name.";
      }
      return "I could not process that request. Please try again.";
    }
  }
}