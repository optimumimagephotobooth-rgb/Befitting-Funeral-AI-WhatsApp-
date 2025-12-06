# WhatsApp Flow (Cloud API)

1. **Incoming HTTP POST from Meta** hits `/whatsapp/webhook`
   - `routes/whatsapp.js` forwards to `whatsapp/webhook.js`
2. **`whatsapp/webhook.js`**
   - Validates Meta’s verification handshake (GET)
   - Calls `messageRouter.routeIncomingMessage()` for each payload inside `entry → changes → messages`
3. **`whatsapp/messageRouter.js`**
   - Normalizes payloads via `toInternalMessage()` so the services stack never has to guess the source
   - Logs summary metadata and routes the normalized object to `services/messageHandler.js`
4. **`services/messageHandler.js`**
   - Loads contacts/cases, handles referrals, payments, grief support, etc.
   - Invokes AI services and replies through `whatsapp/client.js` or the injected webhook service
5. **`whatsapp/client.js`**
   - Wraps Meta Cloud API calls (`https://graph.facebook.com/vXX.X/{PHONE_NUMBER_ID}/messages`)

Each module above now references this document so readers can follow the WhatsApp pipeline without spelunking through the repo.





