/**
 * Stage detection / state machine for funeral service cases
 * Tracks conversation progression through different stages
 * 
 * Stages:
 * - NEW: Initial contact
 * - INTAKE: Gathering initial information
 * - QUOTE: Providing pricing information
 * - DEPOSIT: Waiting for deposit payment
 * - DETAILS: Collecting final details
 * - SUMMARY: Confirming all information
 * - FOLLOWUP: Post-service follow-up
 */

/**
 * Detect the next stage based on current stage and incoming message
 * @param {string} currentStage - Current case stage
 * @param {string} incomingText - Incoming message text
 * @returns {string} - Next stage
 */
export function detectStage(currentStage, incomingText) {
  const text = (incomingText || "").toLowerCase().trim();

  // NEW -> INTAKE: First message moves to intake
  if (currentStage === "NEW") {
    return "INTAKE";
  }

  // INTAKE -> QUOTE: User asks about pricing
  if (currentStage === "INTAKE") {
    if (
      text.includes("price") || 
      text.includes("how much") || 
      text.includes("cost") ||
      text.includes("pricing") ||
      text.includes("package") ||
      text.includes("what does it cost")
    ) {
      return "QUOTE";
    }
    return "INTAKE";
  }

  // QUOTE -> DEPOSIT: User selects an option
  if (currentStage === "QUOTE") {
    if (
      text.includes("we choose") || 
      text.includes("we will go with") || 
      text.includes("option") ||
      text.includes("i want") ||
      text.includes("we'll take") ||
      text.includes("yes") ||
      text.includes("let's go with")
    ) {
      return "DEPOSIT";
    }
    return "QUOTE";
  }

  // DEPOSIT -> DETAILS: User confirms payment
  if (currentStage === "DEPOSIT") {
    if (
      text.includes("paid") || 
      text.includes("payment") || 
      text.includes("screenshot") ||
      text.includes("sent") ||
      text.includes("done") ||
      text.includes("completed")
    ) {
      return "DETAILS";
    }
    return "DEPOSIT";
  }

  // DETAILS -> SUMMARY: User confirms details are complete
  if (currentStage === "DETAILS") {
    if (
      text.includes("ok") || 
      text.includes("thank") || 
      text.includes("yes") ||
      text.includes("correct") ||
      text.includes("that's all") ||
      text.length < 5 // Very short responses often indicate completion
    ) {
      return "SUMMARY";
    }
    return "DETAILS";
  }

  // SUMMARY -> FOLLOWUP: Case is complete, move to follow-up
  if (currentStage === "SUMMARY") {
    return "FOLLOWUP";
  }

  // FOLLOWUP: Stay in follow-up stage
  if (currentStage === "FOLLOWUP") {
    return "FOLLOWUP";
  }

  // Default: return current stage if unknown
  return currentStage || "NEW";
}

/**
 * Get stage-specific context for AI prompts
 * @param {string} stage - Current stage
 * @returns {string} - Stage context description
 */
export function getStageContext(stage) {
  const contexts = {
    NEW: "This is a new contact. Greet them warmly and offer assistance.",
    INTAKE: "Gathering initial information about the deceased and family needs. Ask about: name of deceased, preferred service type, date preferences, location preferences.",
    QUOTE: "Providing pricing information. Present available packages clearly and help them understand what's included.",
    DEPOSIT: "Waiting for deposit payment. Provide complete payment details: MoMo (number: 0593240314, name: Befitting Funeral Home / Louisa Manyah) and Bank Transfer (Zenith Bank, Account: 6010820758, Name: Befitting Funeral Home, Branch: Graphic Road Accra). Tell them they can use either payment method. Confirm receipt when they send proof of payment.",
    DETAILS: "Collecting final details for the service. Ask about: specific preferences, special requests, attendees, any special arrangements needed.",
    SUMMARY: "Confirming all details are correct. Summarize the case and confirm everything is accurate.",
    FOLLOWUP: "Post-service follow-up. Check in on how the service went and if there's anything else needed."
  };

  return contexts[stage] || contexts.NEW;
}

/**
 * Check if stage transition should trigger a specific action
 * @param {string} oldStage - Previous stage
 * @param {string} newStage - New stage
 * @returns {Object} - Action to take (if any)
 */
export function getStageTransitionAction(oldStage, newStage) {
  if (oldStage === newStage) {
    return null; // No transition
  }

  const actions = {
    "NEW->INTAKE": {
      type: "GREETING",
      message: "Thank you for contacting us. I'm here to help you during this difficult time."
    },
    "INTAKE->QUOTE": {
      type: "PROVIDE_QUOTE",
      message: "I'll provide you with our pricing information."
    },
    "QUOTE->DEPOSIT": {
      type: "REQUEST_DEPOSIT",
      message: "Great choice! To secure your booking, we'll need a deposit."
    },
    "DEPOSIT->DETAILS": {
      type: "COLLECT_DETAILS",
      message: "Thank you for the payment. Now let's finalize the details."
    },
    "DETAILS->SUMMARY": {
      type: "SUMMARIZE",
      message: "Let me confirm all the details with you."
    },
    "SUMMARY->FOLLOWUP": {
      type: "CASE_COMPLETE",
      message: "Everything is confirmed. We'll be in touch."
    }
  };

  const transition = `${oldStage}->${newStage}`;
  return actions[transition] || null;
}

export default {
  detectStage,
  getStageContext,
  getStageTransitionAction
};

