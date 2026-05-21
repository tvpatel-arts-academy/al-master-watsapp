const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const Groq = require('groq-sdk');
const pino = require('pino');

// Yahan apni Groq API Key daalni hai (abhi test wali daal di hai)
const groq = new Groq({ apiKey: "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" }); 

async function connectToWhatsApp() {
    // Session save karne ka setup taaki baar-baar QR scan na karna pade
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // QR Code Terminal mein dikhega
        logger: pino({ level: "silent" }) // Faltu logs hide karne ke liye
    });

    sock.ev.on('creds.update', saveCreds);

    // Connection Status Check
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ AL-Mastur WhatsApp Bot is ONLINE!');
        }
    });

    // Jab koi naya message aaye
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        // Khud ke bheje hue message ya khali message ignore karo
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text) {
            console.log(`📩 Naya Message: ${text}`);

            try {
                // Groq Llama 3.1 AI se answer mangna
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are a highly polite and professional customer support assistant for 'AL-Mastur', a premium modest fashion brand selling Burqas, Naqabs, and Rumalis in India. Talk nicely in Hinglish (Hindi written in English alphabet). Keep answers short and helpful. Always offer Cash on Delivery (COD)."
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    model: "llama-3.1-8b-instant",
                });

                const reply = chatCompletion.choices[0]?.message?.content || "Maaf karna, main abhi theek se samajh nahi paaya.";
                
                // AI ka reply WhatsApp par bhejna
                await sock.sendMessage(sender, { text: reply });
                console.log(`📤 Bheja gaya Reply: ${reply}`);

            } catch (error) {
                console.error("❌ API Error:", error);
            }
        }
    });
}

// Bot ko Start Karo
connectToWhatsApp();
