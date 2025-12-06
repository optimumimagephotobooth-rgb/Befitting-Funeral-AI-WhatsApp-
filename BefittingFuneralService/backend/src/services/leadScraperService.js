/**
 * B2B Lead Scraping Service
 * Scrapes business leads from various sources
 */

import axios from 'axios';
import { createRequire } from 'module';
import puppeteer from 'puppeteer';
import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);
const cheerio = require('cheerio');
const { load } = cheerio;

export class LeadScraperService {
  constructor() {
    this.sources = [
      {
        name: 'Google Business',
        url: 'https://www.google.com/search',
        enabled: true
      },
      {
        name: 'Yellow Pages Ghana',
        url: 'https://www.yellowpages.com.gh',
        enabled: true
      },
      {
        name: 'Ghana Business Directory',
        url: 'https://www.ghanabusinessdirectory.com',
        enabled: true
      }
    ];
  }

  /**
   * Scrape leads from Google Business Search
   */
  async scrapeGoogleBusiness(query, location = 'Accra, Ghana', maxResults = 10) {
    try {
      logger.info(`Scraping Google Business for: ${query} in ${location}`);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + location)}&tbm=lcl`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for results
      await page.waitForSelector('[data-result-index]', { timeout: 10000 }).catch(() => {});
      
      const leads = await page.evaluate((max) => {
        const results = [];
        const items = document.querySelectorAll('[data-result-index]');
        
        for (let i = 0; i < Math.min(items.length, max); i++) {
          const item = items[i];
          const name = item.querySelector('h3')?.textContent?.trim() || '';
          const address = item.querySelector('[data-value="Address"]')?.textContent?.trim() || '';
          const phone = item.querySelector('[data-value="Phone"]')?.textContent?.trim() || '';
          const website = item.querySelector('a[href*="http"]')?.href || '';
          
          if (name) {
            results.push({
              companyName: name,
              address: address,
              phone: phone.replace(/\D/g, ''),
              website: website,
              source: 'Google Business'
            });
          }
        }
        
        return results;
      }, maxResults);
      
      await browser.close();
      
      logger.success(`Scraped ${leads.length} leads from Google Business`);
      return leads;
    } catch (error) {
      logger.error('Error scraping Google Business', error);
      return [];
    }
  }

  /**
   * Scrape leads from Yellow Pages Ghana
   */
  async scrapeYellowPages(query, maxResults = 10) {
    try {
      logger.info(`Scraping Yellow Pages Ghana for: ${query}`);
      
      const response = await axios.get('https://www.yellowpages.com.gh/search', {
        params: {
          q: query,
          location: 'Accra'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = load(response.data);
      const leads = [];
      
      $('.business-listing').slice(0, maxResults).each((i, elem) => {
        const companyName = $(elem).find('.business-name').text().trim();
        const phone = $(elem).find('.phone').text().trim();
        const address = $(elem).find('.address').text().trim();
        const website = $(elem).find('.website a').attr('href') || '';
        
        if (companyName) {
          leads.push({
            companyName,
            phone: phone.replace(/\D/g, ''),
            address,
            website,
            source: 'Yellow Pages Ghana'
          });
        }
      });
      
      logger.success(`Scraped ${leads.length} leads from Yellow Pages`);
      return leads;
    } catch (error) {
      logger.error('Error scraping Yellow Pages', error);
      return [];
    }
  }

  /**
   * Extract email from website
   */
  async extractEmailFromWebsite(websiteUrl) {
    try {
      if (!websiteUrl || !websiteUrl.startsWith('http')) {
        return null;
      }
      
      const response = await axios.get(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      });
      
      const $ = load(response.data);
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      
      // Search in page content
      const pageText = $('body').text();
      const emails = pageText.match(emailRegex);
      
      // Also check mailto links
      $('a[href^="mailto:"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const email = href?.replace('mailto:', '').split('?')[0];
        if (email && !emails?.includes(email)) {
          emails?.push(email);
        }
      });
      
      // Filter out common non-business emails
      const businessEmails = emails?.filter(email => 
        !email.includes('example.com') &&
        !email.includes('test.com') &&
        !email.includes('placeholder')
      );
      
      return businessEmails?.[0] || null;
    } catch (error) {
      logger.debug(`Could not extract email from ${websiteUrl}`, error.message);
      return null;
    }
  }

  /**
   * Scrape leads from multiple sources
   */
  async scrapeLeads(query, options = {}) {
    const {
      location = 'Accra, Ghana',
      maxResults = 20,
      sources = ['google', 'yellowpages'],
      extractEmails = true
    } = options;
    
    logger.info(`Starting lead scraping for: ${query}`);
    
    const allLeads = [];
    
    // Scrape from Google Business
    if (sources.includes('google')) {
      const googleLeads = await this.scrapeGoogleBusiness(query, location, maxResults);
      allLeads.push(...googleLeads);
    }
    
    // Scrape from Yellow Pages
    if (sources.includes('yellowpages')) {
      const yellowPagesLeads = await this.scrapeYellowPages(query, maxResults);
      allLeads.push(...yellowPagesLeads);
    }
    
    // Extract emails if requested
    if (extractEmails) {
      logger.info('Extracting emails from websites...');
      for (const lead of allLeads) {
        if (!lead.email && lead.website) {
          lead.email = await this.extractEmailFromWebsite(lead.website);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Deduplicate leads
    const uniqueLeads = this.deduplicateLeads(allLeads);
    
    logger.success(`Scraped ${uniqueLeads.length} unique leads`);
    return uniqueLeads;
  }

  /**
   * Deduplicate leads by email or company name
   */
  deduplicateLeads(leads) {
    const seen = new Set();
    const unique = [];
    
    for (const lead of leads) {
      const key = lead.email || lead.companyName?.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(lead);
      }
    }
    
    return unique;
  }

  /**
   * Enrich lead data (add more information)
   */
  async enrichLead(lead) {
    try {
      // Add industry classification
      if (!lead.industry) {
        lead.industry = this.classifyIndustry(lead.companyName);
      }
      
      // Add company size estimate
      if (!lead.companySize) {
        lead.companySize = 'Unknown';
      }
      
      return lead;
    } catch (error) {
      logger.error('Error enriching lead', error);
      return lead;
    }
  }

  /**
   * Classify industry based on company name
   */
  classifyIndustry(companyName) {
    const name = companyName.toLowerCase();
    
    if (name.includes('hospital') || name.includes('clinic') || name.includes('medical')) {
      return 'Healthcare';
    }
    if (name.includes('church') || name.includes('ministry') || name.includes('religious')) {
      return 'Religious Organization';
    }
    if (name.includes('school') || name.includes('education') || name.includes('academy')) {
      return 'Education';
    }
    if (name.includes('insurance')) {
      return 'Insurance';
    }
    if (name.includes('bank') || name.includes('financial')) {
      return 'Financial Services';
    }
    
    return 'General Business';
  }
}

export default LeadScraperService;

