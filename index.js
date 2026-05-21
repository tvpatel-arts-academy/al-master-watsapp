const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const Groq = require('groq-sdk');
const pino = require('pino');
const qrcode = require('qrcode-terminal'); // Naya tool QR code print karne ke liye

// Groq API Key Configuration
const groq = new Groq({ apiKey: "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" }); 

async function connectToWhatsApp() {
    // Session status load/save karne ke liye
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }) // Faltu logs ko chupane ke liye
    });

    sock.ev.on('creds.update', saveCreds);

    // Connection Status aur QR Code Handle karne ke liye
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Agar system QR code bhejta hai, toh use terminal par generate karo
        if (qr) {
            console.log('===============================================================');
            console.log('👉 AL-MASTUR BOT: PHONE SE IS QR CODE KO SCAN KAREIN:');
            console.log('===============================================================');
            qrcode.generate(qr, { small: true }); // Yeh terminal mein chota aur perfect QR print karega
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ SUCCESS! AL-Mastur WhatsApp Bot is ONLINE aur LIVE hai!');
        }
    });

    // Incoming Messages Filter aur Response Logic
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text) {
            console.log(`📩 Customer Message: ${text}`);

            try {
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
                
                await sock.sendMessage(sender, { text: reply });
                console.log(`📤 Bot Reply Sent: ${reply}`);

            } catch (error) {
                console.error("❌ Groq API Error:", error);
            }
        }
    });
}

// Bot Execution Start
connectToWhatsApp();
