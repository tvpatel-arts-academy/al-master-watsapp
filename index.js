const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: "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" });

const phoneNumber = "917862019270"; 

// Global lock
let pairingCodeRequested = false;

async function startBot() {
    // 🧹 NAYA FOLDER: Purana session kachra avoid karne ke liye
    const { state, saveCreds } = await useMultiFileAuthState('session_almastur_final');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Mac OS", "Chrome", "121.0.6167.159"]
    });

    sock.ev.on('creds.update', saveCreds);

    // 🎯 SMART TRIGGER LOGIC
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Jab WhatsApp sach mein login ke liye ready ho (qr signal de), TABHI code mango
        if (qr && !pairingCodeRequested) {
            pairingCodeRequested = true;
            console.log("\n⏳ WhatsApp server ready hai! Pairing Code generate ho raha hai, 3 second ruko...");
            
            // Connection ko thoda saans lene ke liye 3 second ka wait
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n===============================================================`);
                    console.log(`🔥 AAPKA PAIRING CODE HAI: ${code} 🔥`);
                    console.log(`👉 WhatsApp > Linked Devices > Link with phone number me daalein.`);
                    console.log(`===============================================================\n`);
                } catch (err) {
                    console.error("❌ Pairing code fail hua:", err?.message);
                    pairingCodeRequested = false; // Fail hone par lock khol do
                }
            }, 3000); 
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                setTimeout(startBot, 5000); 
            }
        } else if (connection === 'open') {
            console.log('✅ SUCCESS! AL-Mastur Bot ONLINE aur LIVE hai!');
        }
    });

    // 📩 MESSAGE HANDLING
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        let text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        
        if (!text && msg.message.extendedTextMessage?.contextInfo?.externalAdReply) {
            text = "Maine aapka product dekha hai, mujhe iske baare mein janna hai.";
        }
        
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
