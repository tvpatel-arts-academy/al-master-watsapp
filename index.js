const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: "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" });

// ⚠️ APNA WHATSAPP NUMBER YAHAN DAALEIN (Bina + ke, jaise 919876543210)
const phoneNumber = "917862019270"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // QR code bilkul band kar diya
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"] // Pairing code ke liye yeh zaroori hai
    });

    // Sirf ek baar pairing code generate karne ka logic (3 seconds delay ke sath taaki crash na ho)
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n==========================================`);
                console.log(`🔥 AAPKA PAIRING CODE HAI: ${code} 🔥`);
                console.log(`👉 Apne phone ke WhatsApp > Linked Devices > Link with phone number me daalein.`);
                console.log(`==========================================\n`);
            } catch (err) {
                console.error("Pairing code error:", err);
            }
        }, 3000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                setTimeout(startBot, 2000);
            }
        } else if (connection === 'open') {
            console.log('✅ SUCCESS! AL-Mastur Bot ONLINE aur LIVE hai!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text) return;

        console.log(`📩 Customer: ${text}`);

        try {
            const response = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a highly polite and professional customer support assistant for 'AL-Mastur', a premium modest fashion brand selling Burqas, Naqabs, and Rumalis in India. Talk nicely in Hinglish. Keep answers short and helpful. Always offer Cash on Delivery (COD)."
                    },
                    { role: "user", content: text }
                ],
                model: "llama-3.1-8b-instant"
            });

            const reply = response.choices[0]?.message?.content || "Maaf karna, main samjha nahi.";
            await sock.sendMessage(msg.key.remoteJid, { text: reply });
            console.log(`📤 Reply: ${reply}`);
        } catch (err) {
            console.error("❌ Groq Error:", err);
        }
    });
}

startBot();
