# Database Setup Guide

## Schema Overview

The database uses PostgreSQL and includes the following tables:

### 1. **contacts**
Stores WhatsApp contact information
- `id` (UUID) - Primary key
- `phone_number` (TEXT) - Unique phone number
- `name` (TEXT) - Contact name (optional)
- `created_at` (TIMESTAMPTZ) - Creation timestamp

### 2. **cases**
Stores funeral service cases
- `id` (UUID) - Primary key
- `contact_id` (UUID) - Reference to contacts table
- `case_ref` (TEXT) - Unique case reference (e.g., CASE-2025-0001)
- `status` (TEXT) - Case status (NEW, IN_PROGRESS, COMPLETED, etc.)
- `deceased_name` (TEXT) - Name of deceased
- `funeral_date` (DATE) - Scheduled funeral date
- `location` (TEXT) - Funeral location
- `package_name` (TEXT) - Selected package
- `total_amount` (NUMERIC) - Total cost
- `deposit_amount` (NUMERIC) - Deposit paid
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### 3. **messages**
Logs all WhatsApp messages
- `id` (UUID) - Primary key
- `case_id` (UUID) - Reference to cases table (optional)
- `direction` (TEXT) - INBOUND or OUTBOUND
- `from_number` (TEXT) - Phone number
- `body` (TEXT) - Message content
- `raw` (JSONB) - Raw message data
- `created_at` (TIMESTAMPTZ) - Message timestamp

### 4. **reminders**
Manages automated reminders
- `id` (UUID) - Primary key
- `case_id` (UUID) - Reference to cases table
- `type` (TEXT) - Reminder type (FUNERAL_REMINDER, FOLLOWUP, etc.)
- `send_at` (TIMESTAMPTZ) - When to send reminder
- `status` (TEXT) - PENDING, SENT, FAILED
- `created_at` (TIMESTAMPTZ) - Creation timestamp

## Setup Instructions

### Option 1: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a database:
   ```sql
   CREATE DATABASE befitting_funeral_db;
   ```
3. Update `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/befitting_funeral_db
   ```
4. Run the application - schema will be created automatically

### Option 2: Supabase (Recommended)

1. Go to [Supabase](https://supabase.com) and create a free account
2. Create a new project
3. Go to SQL Editor
4. Copy and paste the contents of `db/schema.sql`
5. Run the SQL script
6. Go to Project Settings > Database
7. Copy the connection string
8. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

### Option 3: Other Cloud Providers

- **Railway**: Create PostgreSQL database, get connection string
- **Render**: Create PostgreSQL database, get connection string
- **AWS RDS**: Create PostgreSQL instance, get connection string
- **Google Cloud SQL**: Create PostgreSQL instance, get connection string

## Database Models

The project includes model classes for easy database access:

- `Contact` - Manage contacts
- `Case` - Manage funeral cases
- `Message` - Log and retrieve messages
- `Reminder` - Manage reminders

## Usage Examples

### Creating a Contact
```javascript
import { Contact } from './models/Contact.js';

const contact = await Contact.create('+1234567890', 'John Doe');
```

### Creating a Case
```javascript
import { Case } from './models/Case.js';

const funeralCase = await Case.create(contactId, {
  deceased_name: 'Jane Doe',
  funeral_date: '2025-12-15',
  package_name: 'Premium Package',
  total_amount: 5000.00
});
```

### Logging Messages
```javascript
import { Message } from './models/Message.js';

await Message.create({
  case_id: caseId,
  direction: 'INBOUND',
  from_number: '+1234567890',
  body: 'Hello, I need help with funeral arrangements'
});
```

### Creating Reminders
```javascript
import { Reminder } from './models/Reminder.js';

await Reminder.create({
  case_id: caseId,
  type: 'FUNERAL_REMINDER',
  send_at: new Date('2025-12-14T09:00:00Z')
});
```

## Automatic Features

- **Contact Creation**: Contacts are automatically created when a new WhatsApp number messages
- **Case Creation**: New cases are automatically created for new conversations
- **Message Logging**: All messages (inbound and outbound) are automatically logged
- **Case Reference Generation**: Case references are automatically generated (CASE-YYYY-NNNN)

## Querying Data

### Get all cases for a contact
```javascript
const cases = await Case.findByContactId(contactId);
```

### Get conversation history
```javascript
const history = await Message.getConversationHistory(phoneNumber, 20);
```

### Get pending reminders
```javascript
const reminders = await Reminder.findPending();
```

## Notes

- The database schema is automatically initialized when the application starts
- All timestamps use UTC (TIMESTAMPTZ)
- Case references are unique and auto-generated
- Messages are linked to cases for easy conversation tracking

