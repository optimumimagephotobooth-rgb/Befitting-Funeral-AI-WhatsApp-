/**
 * WhatsApp Cloud API Client
 * Handles sending messages via Meta WhatsApp Cloud API
 */

import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Send WhatsApp text message via Cloud API
 * @param {string} to - Recipient phone number (with country code, no +)
 * @param {string} message - Message text to send
 * @returns {Promise<Object>} - Result object with success status
 */
export async function sendWhatsAppText(to, message) {
  try {
    // Remove any formatting from phone number
    const phoneNumber = to.replace(/\D/g, '');
    
    // Ensure phone number has country code (Ghana: 233)
    const formattedNumber = phoneNumber.startsWith('233') 
      ? phoneNumber 
      : phoneNumber.startsWith('0') 
        ? '233' + phoneNumber.substring(1)
        : '233' + phoneNumber;

    const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedNumber,
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    };

    const headers = {
      'Authorization': `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json'
    };

    logger.debug('Sending WhatsApp message via Cloud API', {
      to: formattedNumber,
      messageLength: message.length
    });

    const response = await axios.post(url, payload, { headers });

    if (response.data.messages && response.data.messages[0]) {
      logger.success('WhatsApp message sent successfully', {
        messageId: response.data.messages[0].id,
        to: formattedNumber
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        to: formattedNumber
      };
    } else {
      throw new Error('Unexpected response format from WhatsApp API');
    }
  } catch (error) {
    logger.error('Error sending WhatsApp message via Cloud API', {
      error: error.message,
      response: error.response?.data,
      to
    });

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      details: error.response?.data?.error
    };
  }
}

/**
 * Send WhatsApp template message
 * @param {string} to - Recipient phone number
 * @param {string} templateName - Template name
 * @param {Array} parameters - Template parameters
 * @returns {Promise<Object>} - Result object
 */
export async function sendWhatsAppTemplate(to, templateName, parameters = []) {
  try {
    const phoneNumber = to.replace(/\D/g, '');
    const formattedNumber = phoneNumber.startsWith('233') 
      ? phoneNumber 
      : phoneNumber.startsWith('0') 
        ? '233' + phoneNumber.substring(1)
        : '233' + phoneNumber;

    const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en'
        },
        components: parameters.length > 0 ? [{
          type: 'body',
          parameters: parameters.map(param => ({
            type: 'text',
            text: param
          }))
        }] : []
      }
    };

    const headers = {
      'Authorization': `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(url, payload, { headers });

    if (response.data.messages && response.data.messages[0]) {
      logger.success('WhatsApp template message sent', {
        messageId: response.data.messages[0].id,
        template: templateName,
        to: formattedNumber
      });

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    logger.error('Error sending WhatsApp template', {
      error: error.message,
      response: error.response?.data,
      template: templateName
    });

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Send WhatsApp media message
 * @param {string} to - Recipient phone number
 * @param {string} mediaUrl - URL of the media
 * @param {string} mediaType - Type: image, video, audio, document
 * @param {string} caption - Optional caption
 * @returns {Promise<Object>} - Result object
 */
export async function sendWhatsAppMedia(to, mediaUrl, mediaType = 'image', caption = '') {
  try {
    const phoneNumber = to.replace(/\D/g, '');
    const formattedNumber = phoneNumber.startsWith('233') 
      ? phoneNumber 
      : phoneNumber.startsWith('0') 
        ? '233' + phoneNumber.substring(1)
        : '233' + phoneNumber;

    const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedNumber,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
        ...(caption && { caption })
      }
    };

    const headers = {
      'Authorization': `Bearer ${config.whatsapp.accessToken}`,
      'Content-Type': 'application/json'
    };

    const response = await axios.post(url, payload, { headers });

    if (response.data.messages && response.data.messages[0]) {
      logger.success('WhatsApp media message sent', {
        messageId: response.data.messages[0].id,
        mediaType,
        to: formattedNumber
      });

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    logger.error('Error sending WhatsApp media', {
      error: error.message,
      response: error.response?.data,
      mediaType
    });

    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

export default {
  sendWhatsAppText,
  sendWhatsAppTemplate,
  sendWhatsAppMedia
};

