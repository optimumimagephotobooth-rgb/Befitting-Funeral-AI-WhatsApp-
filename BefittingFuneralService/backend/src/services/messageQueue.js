/**
 * Message Queue System
 * Handles message processing with retry logic and queuing
 */

import { logger } from '../utils/logger.js';

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  add(message, handler, priority = 0) {
    this.queue.push({
      message,
      handler,
      priority,
      retries: 0,
      addedAt: Date.now()
    });
    
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    if (!this.processing) {
      // Process asynchronously
      this.process().catch(error => {
        logger.error('Error in message queue processing', error);
      });
    }
    
    return Promise.resolve();
  }

  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      
      try {
        await item.handler(item.message);
        logger.debug('Message processed successfully', {
          phoneNumber: item.message.from
        });
      } catch (error) {
        logger.error('Error processing message', error);
        
        if (item.retries < this.maxRetries) {
          item.retries++;
          logger.warn(`Retrying message (attempt ${item.retries}/${this.maxRetries})`);
          
          // Add back to queue with delay
          setTimeout(() => {
            this.queue.push(item);
            this.queue.sort((a, b) => b.priority - a.priority);
          }, this.retryDelay * item.retries);
        } else {
          logger.error('Message failed after max retries', {
            phoneNumber: item.message.from,
            retries: item.retries
          });
        }
      }
    }

    this.processing = false;
  }

  getQueueSize() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }
}

export const messageQueue = new MessageQueue();
export default messageQueue;

