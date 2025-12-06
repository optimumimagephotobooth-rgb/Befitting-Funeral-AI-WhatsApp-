const intentKeywords = {
  bereavement: ['died', 'passed away', 'funeral', 'body', 'burial', 'wake', 'mourning'],
  planning: ['plan', 'arrange', 'service', 'details', 'schedule', 'venue'],
  payment: ['deposit', 'payment', 'cost', 'invoice', 'money', 'moMo', 'transfer'],
  obituary: ['obituary', 'life story', 'memorial', 'tribute'],
  announcement: ['announce', 'announcement', 'notify', 'invite'],
  prayer: ['pray', 'prayer', 'spirit', 'comfort'],
  vehicle: ['vehicle', 'transport', 'car', 'van', 'hearst', 'limo'],
  contact: ['contact', 'call', 'number', 'connect'],
  help: ['help', 'support', 'assist']
};

export function classifyIntent(text = '') {
  const normalized = text.toLowerCase();
  for (const [category, keywords] of Object.entries(intentKeywords)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }
  return 'general';
}


