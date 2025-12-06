/**
 * Service Knowledge Base
 * Information extracted from www.befittingfuneralservices.com
 * This knowledge base powers the WhatsApp AI responses
 */

export const serviceKnowledge = {
  // Company Information
  company: {
    name: "Befitting Funeral Home",
    fullName: "Befitting Funeral Services",
    location: "Accra, Ghana",
    website: "www.befittingfuneralservices.com",
    email: "befittingfuneralhome1@gmail.com",
    phone: null, // To be added
    address: "Graphic Road, Accra, Ghana",
    branch: "Graphic Road Accra"
  },

  // Service Offerings (from website navigation)
  services: {
    main: [
      "Funeral Planning & Coordination",
      "Burial Services",
      "Cremation Services",
      "Memorial Services",
      "Thanksgiving Services",
      "Tombstone Installation",
      "Casket Selection",
      "Photo & Video Coverage"
    ],
    galleries: [
      "Hearse Gallery",
      "Tombstone Gallery",
      "Casket Gallery",
      "Photo & Video Coverage Gallery"
    ]
  },

  // Package Information with Pricing
  packages: {
    basic: {
      name: "Basic Package",
      description: "Essential funeral services for families seeking affordable, dignified arrangements",
      price: "GHS 5,000 - 8,000",
      priceMin: 5000,
      priceMax: 8000,
      includes: [
        "Basic casket selection",
        "Embalming and body preparation",
        "Transportation within Accra",
        "Basic funeral coordination",
        "Death certificate assistance"
      ],
      bestFor: "Families seeking essential services with budget considerations"
    },
    standard: {
      name: "Standard Package",
      description: "Comprehensive funeral services with enhanced coordination",
      price: "GHS 10,000 - 15,000",
      priceMin: 10000,
      priceMax: 15000,
      includes: [
        "Standard casket selection",
        "Embalming and body preparation",
        "Transportation (hearse + family vehicles)",
        "Funeral parlor use (4 hours)",
        "Full coordination and planning",
        "Basic refreshments",
        "Death certificate assistance",
        "Basic memorial program"
      ],
      bestFor: "Most families seeking comprehensive service with good value"
    },
    premium: {
      name: "Premium Package",
      description: "Premium funeral services with enhanced features and professional coverage",
      price: "GHS 18,000 - 25,000",
      priceMin: 18000,
      priceMax: 25000,
      includes: [
        "Premium casket selection",
        "Embalming and body preparation",
        "Premium hearse and transportation",
        "Funeral parlor use (full day)",
        "Full coordination and planning",
        "Catering services",
        "Professional photo coverage",
        "Video coverage (edited)",
        "Memorial program and materials",
        "Death certificate assistance",
        "Grave preparation assistance"
      ],
      bestFor: "Families wanting comprehensive service with professional documentation"
    },
    elite: {
      name: "Elite Package",
      description: "Luxury funeral services with premium features and complete memorial solutions",
      price: "GHS 30,000+",
      priceMin: 30000,
      priceMax: null,
      includes: [
        "Elite/luxury casket selection",
        "Premium embalming and body preparation",
        "Luxury hearse and premium transportation",
        "Funeral parlor use (extended hours)",
        "Full coordination and planning",
        "Premium catering services",
        "Professional photo & video coverage (full production)",
        "Custom memorial program and materials",
        "Tombstone/headstone installation",
        "Grave preparation and maintenance",
        "Death certificate assistance",
        "Post-service follow-up and support",
        "Custom memorial items"
      ],
      bestFor: "Families seeking premium, comprehensive memorial experience"
    }
  },

  // Payment Information
  payment: {
    momo: {
      number: "0593240314",
      name: "Befitting Funeral Home / Louisa Manyah"
    },
    bank: {
      name: "Zenith Bank",
      accountNumber: "6010820758",
      accountName: "Befitting Funeral Home",
      branch: "Graphic Road Accra"
    }
  },

  // Business Hours
  businessHours: {
    weekdays: "Monday - Friday: 9 AM - 5 PM",
    saturday: "Saturday: 10 AM - 2 PM",
    sunday: "Sunday: Closed",
    emergency: "24/7 emergency support available"
  },

  // Common Questions & Answers
  faq: [
    {
      question: "What services do you offer?",
      answer: "We offer comprehensive funeral services including burial, cremation, memorial services, thanksgiving services, tombstone installation, casket selection, and photo & video coverage. We have packages ranging from Basic to Elite to suit different needs and budgets."
    },
    {
      question: "Where are you located?",
      answer: "We are located on Graphic Road, Accra, Ghana. Our branch is easily accessible and we serve families throughout Accra and surrounding areas."
    },
    {
      question: "What are your business hours?",
      answer: "We're open Monday to Friday from 9 AM to 5 PM, and Saturday from 10 AM to 2 PM. We're closed on Sundays, but we provide 24/7 emergency support for urgent situations."
    },
    {
      question: "How do I make a payment?",
      answer: "You can pay via Mobile Money (MoMo) to 0593240314 (Befitting Funeral Home / Louisa Manyah) or via bank transfer to Zenith Bank, Account: 6010820758, Account Name: Befitting Funeral Home, Branch: Graphic Road Accra."
    },
    {
      question: "Do you offer payment plans?",
      answer: "Yes, we understand that funeral expenses can be significant. We offer flexible payment plans and can discuss options that work for your family's situation. Please contact us to discuss."
    },
    {
      question: "Can I visit your showroom?",
      answer: "Yes, you're welcome to visit our showroom on Graphic Road, Accra to view our caskets, hearse options, and tombstones. We recommend calling ahead to schedule a visit."
    }
  ],

  // Service Process
  process: [
    {
      step: 1,
      title: "Initial Consultation",
      description: "We meet with you to understand your needs and preferences"
    },
    {
      step: 2,
      title: "Package Selection",
      description: "Choose a package that fits your budget and requirements"
    },
    {
      step: 3,
      title: "Planning & Coordination",
      description: "We handle all arrangements and coordinate with all parties"
    },
    {
      step: 4,
      title: "Service Day",
      description: "We ensure everything runs smoothly on the day"
    },
    {
      step: 5,
      title: "Follow-up",
      description: "We follow up to ensure everything met your expectations"
    }
  ],

  // Cultural Considerations (Ghana-specific)
  cultural: {
    traditions: [
      "Traditional Ghanaian funeral customs",
      "Christian funeral services",
      "Thanksgiving services",
      "Memorial services",
      "Customary rites"
    ],
    languages: [
      "English",
      "Twi",
      "Ga",
      "Ewe"
    ]
  }
};

/**
 * Get package information by name
 */
export function getPackageInfo(packageName) {
  const normalizedName = packageName.toLowerCase();
  const packages = serviceKnowledge.packages;
  
  if (normalizedName.includes('basic')) return packages.basic;
  if (normalizedName.includes('standard')) return packages.standard;
  if (normalizedName.includes('premium')) return packages.premium;
  if (normalizedName.includes('elite')) return packages.elite;
  
  return null;
}

/**
 * Get FAQ answer by keyword
 */
export function getFAQAnswer(query) {
  const lowerQuery = query.toLowerCase();
  
  for (const faq of serviceKnowledge.faq) {
    if (lowerQuery.includes(faq.question.toLowerCase().split(' ')[0])) {
      return faq.answer;
    }
  }
  
  return null;
}

export default serviceKnowledge;

