import OpenAI from 'openai';
import { config } from '../config/config.js';
import { buildSystemPrompt, buildUserPrompt, getStageInstructions } from './prompts.js';

export class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.ai.openAiApiKey
    });
    this.model = config.ai.model;
    this.temperature = config.ai.temperature;
    
    // Use the Ghana-specific system prompt
    this.baseSystemPrompt = buildSystemPrompt();
  }

  async generateResponse(userMessage, conversationHistory = [], stageContext = null, caseContext = {}) {
    try {
      // Check if API key is set
      if (!config.ai.openAiApiKey) {
        console.warn("OPENAI_API_KEY is not set. Returning fallback message.");
        return "Our assistant is currently offline. A team member will reply shortly. Please contact us directly.";
      }

      // Build system prompt with stage instructions
      let systemPrompt = this.baseSystemPrompt;
      if (stageContext) {
        const stageInstructions = getStageInstructions(stageContext);
        systemPrompt += `\n\nCurrent conversation stage: ${stageContext}\n${stageInstructions}`;
      }
      
      // Build user prompt with context
      const userPrompt = buildUserPrompt(
        stageContext || 'NEW',
        userMessage,
        caseContext
      );
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userPrompt }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content?.trim();
      return response || "Thank you. We will get back to you shortly.";
    } catch (error) {
      console.error('AI Service Error:', error);
      return 'I apologize, but I\'m having trouble processing your request right now. Please contact us directly at ' + 
             (config.service.phone || 'our main number') + ' for immediate assistance.';
    }
  }

  /**
   * Simple wrapper function compatible with the client.js pattern
   * @param {string} stage - Current stage
   * @param {string} latestUserMessage - Latest user message
   * @param {Object} context - Case context
   * @returns {Promise<string>} - AI response
   */
  async generateReply(stage, latestUserMessage, context = {}) {
    return this.generateResponse(latestUserMessage, [], stage, context);
  }

  async detectIntent(message) {
    try {
      const intentPrompt = `Analyze this message and determine the primary intent. Respond with ONLY one word from: greeting, service_inquiry, pricing, scheduling, contact, referral, other.
      
Message: "${message}"
Intent:`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an intent classifier. Respond with only the intent word.' },
          { role: 'user', content: intentPrompt }
        ],
        temperature: 0.3,
        max_tokens: 10
      });

      return completion.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
      console.error('Intent detection error:', error);
      return 'other';
    }
  }
}
