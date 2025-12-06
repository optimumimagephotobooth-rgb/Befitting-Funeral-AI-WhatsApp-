export function serializeSafeCase(caseRecord, options = {}) {
  if (!caseRecord) return null;
  const payments = caseRecord.payments || { charges: [], uploads: [], outstandingBalance: 0 };
  const allowedFields = {
    id: caseRecord.id,
    case_ref: caseRecord.case_ref,
    status: caseRecord.status,
    stage: caseRecord.stage,
    deceased_name: caseRecord.deceased_name,
    funeral_date: caseRecord.funeral_date,
    contact: {
      name: null,
      phone_number: null,
      email: null
    },
    package_name: caseRecord.package_name,
    total_amount: options.showCosts ? caseRecord.total_amount : null,
    deposit_amount: options.showCosts ? caseRecord.deposit_amount : null,
    schedule: caseRecord.schedule || [],
    documents: (caseRecord.documents || []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      file_url: doc.file_url,
      created_at: doc.created_at,
      metadata: doc.metadata || {},
      status: doc.metadata?.status || 'uploaded',
      uploader: doc.metadata?.uploader || 'family'
    })),
    messages: (caseRecord.messages || []).map((message) => ({
      id: message.id,
      sender: message.author,
      body: message.content,
      created_at: message.created_at
    })),
    automationAlerts: caseRecord.automationAlerts || [],
    compliance: caseRecord.compliance || {},
    familyUploads: (caseRecord.familyUploads || []).map((upload) => ({
      id: upload.id,
      title: upload.title,
      file_url: upload.file_url,
      created_at: upload.created_at
    })),
    payments: {
      charges: (payments.charges || []).map((charge) => ({
        id: charge.id,
        description: charge.description,
        amount: parseFloat(charge.amount || 0),
        status: charge.status,
        created_at: charge.created_at,
        metadata: charge.metadata || {}
      })),
      uploads: (payments.uploads || []).map((upload) => ({
        id: upload.id,
        amount: parseFloat(upload.amount || 0),
        reference: upload.reference,
        file_url: upload.file_url,
        status: upload.status,
        created_at: upload.created_at,
        metadata: upload.metadata || {}
      })),
      outstandingBalance: payments.outstandingBalance ?? 0
    }
  };
  return allowedFields;
}

