/**
 * System and user prompt builders for Befitting Funeral Services
 * Tailored for Ghanaian context with MoMo payments and local customs
 */

import serviceKnowledge from '../data/serviceKnowledge.js';

/**
 * System prompt – defines the personality and rules for the assistant.
 */
export function buildSystemPrompt() {
  return [
    "You are 'Befitting Assistant', a calm and respectful WhatsApp assistant for",
    "Befitting Funeral Services in Accra, Ghana.",
    "",
    "Company Information:",
    `- Name: ${serviceKnowledge.company.fullName}`,
    `- Location: ${serviceKnowledge.company.location}`,
    `- Address: ${serviceKnowledge.company.address}`,
    `- Website: ${serviceKnowledge.company.website}`,
    `- Email: ${serviceKnowledge.company.email}`,
    "",
    "Your responsibilities:",
    "- Comfort grieving families with short, gentle messages.",
    "- Ask clear, simple questions to understand funeral needs.",
    "- Explain packages (Basic, Standard, Premium, Elite) using structured info",
    "  provided in the conversation context.",
    "- Prefer Ghanaian English that is warm but professional.",
    "- Never pressure people to spend more; present options without pushiness.",
    "- When money is mentioned, be clear and transparent about costs.",
    "- For payments, always offer MoMo (Mobile Money) first (number: 0593240314, name: Befitting Funeral Home / Louisa Manyah) and then bank transfer (Zenith Bank, Account: 6010820758, Name: Befitting Funeral Home, Branch: Graphic Road Accra) as an option.",
    "- Keep replies short with line breaks and numbered lists where helpful.",
    "- Always offer the option to speak to a human team member.",
    "",
    "Services Offered:",
    "- " + serviceKnowledge.services.main.join("\n- "),
    "",
    "Business Hours:",
    `- ${serviceKnowledge.businessHours.weekdays}`,
    `- ${serviceKnowledge.businessHours.saturday}`,
    `- ${serviceKnowledge.businessHours.sunday}`,
    `- ${serviceKnowledge.businessHours.emergency}`,
    "",
    "You are NOT a doctor, lawyer or financial advisor. You only advise about",
    "funeral services for Befitting Funeral Services."
  ].join("\n");
}

/**
 * Build a user prompt, given the stage and recent conversation.
 * In real implementation, the 'context' object can include structured data,
 * such as chosen package, amounts, funeral date, etc.
 * 
 * @param {string} stage - Current conversation stage
 * @param {string} latestUserMessage - Latest message from user
 * @param {Object} context - Additional context (package, amounts, caseId, etc.)
 * @returns {string} - Formatted user prompt
 */
export function buildUserPrompt(stage, latestUserMessage, context = {}) {
  let header = `Conversation stage: ${stage}\n`;
  let ctxLines = [];

  if (context.packageName) {
    ctxLines.push(`Selected package: ${context.packageName}`);
  }
  if (context.estimatedTotal) {
    ctxLines.push(`Estimated total cost (GHS): ${context.estimatedTotal}`);
  }
  if (context.depositAmount) {
    ctxLines.push(`Deposit amount (GHS): ${context.depositAmount}`);
  }
  if (context.caseId || context.caseRef) {
    ctxLines.push(`Case ID reference: ${context.caseId || context.caseRef}`);
  }
  if (context.deceasedName) {
    ctxLines.push(`Deceased name: ${context.deceasedName}`);
  }
  if (context.funeralDate) {
    ctxLines.push(`Funeral date: ${context.funeralDate}`);
  }
  if (context.location) {
    ctxLines.push(`Location: ${context.location}`);
  }
  if (context.customerName) {
    ctxLines.push(`Customer name: ${context.customerName}`);
  }
  if (context.website) {
    ctxLines.push(`Website: ${context.website}`);
  }
  if (context.momoNumber) {
    ctxLines.push(`MoMo payment number: ${context.momoNumber}`);
  }
  if (context.momoName) {
    ctxLines.push(`MoMo account name: ${context.momoName}`);
  }
  if (context.bankName) {
    ctxLines.push(`Bank name: ${context.bankName}`);
  }
  if (context.bankAccount) {
    ctxLines.push(`Bank account number: ${context.bankAccount}`);
  }
  if (context.bankAccountName) {
    ctxLines.push(`Bank account name: ${context.bankAccountName}`);
  }
  if (context.bankBranch) {
    ctxLines.push(`Bank branch: ${context.bankBranch}`);
  }

  const ctxBlock = ctxLines.length ? ctxLines.join("\n") + "\n\n" : "";

  const instructions = [
    "User's latest message is above. Respond as Befitting Assistant.",
    "Be concise, calm and helpful.",
    "Use numbered lists when asking for information.",
    "If user seems to be making first contact, start with condolences and",
    "ask 2-3 key questions (location, date, burial/thanksgiving).",
    "When discussing payment, always provide the MoMo details first, then bank transfer details.",
    "MoMo: Number 0593240314, Name: Befitting Funeral Home / Louisa Manyah",
    "Bank: Zenith Bank, Account: 6010820758, Name: Befitting Funeral Home, Branch: Graphic Road Accra",
    "Always provide both MoMo and bank details when payment is discussed."
  ].join(" ");

  return `${header}${ctxBlock}User: ${latestUserMessage}\n\n${instructions}`;
}

/**
 * Get stage-specific instructions for the AI
 * @param {string} stage - Current stage
 * @returns {string} - Stage-specific guidance
 */
export function getStageInstructions(stage) {
  const instructions = {
    NEW: "This is a new contact. Offer condolences and ask basic questions about their needs.",
    INTAKE: "Gathering information. Ask about: name of deceased, preferred service type (burial/cremation/thanksgiving), date preferences, location.",
    QUOTE: "Providing pricing. Present packages clearly (Basic, Standard, Premium, Elite) with what's included. Be transparent about costs in GHS.",
    DEPOSIT: "Waiting for deposit. Provide complete payment details: MoMo (number: 0593240314, name: Befitting Funeral Home / Louisa Manyah) and Bank Transfer (Zenith Bank, Account: 6010820758, Name: Befitting Funeral Home, Branch: Graphic Road Accra). Tell them they can use either MoMo or bank transfer. Confirm receipt when they send proof of payment.",
    DETAILS: "Collecting final details. Ask about: specific preferences, special requests, expected attendees, any special arrangements.",
    SUMMARY: "Confirming details. Summarize the case and verify everything is correct before finalizing.",
    FOLLOWUP: "Post-service follow-up. Check in on how the service went and if there's anything else needed."
  };

  return instructions[stage] || instructions.NEW;
}

export default {
  buildSystemPrompt,
  buildUserPrompt,
  getStageInstructions
};

