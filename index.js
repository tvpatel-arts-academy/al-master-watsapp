const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: "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" });

const phoneNumber = "917862019270"; 

// 🛠️ SAFETY LOCK: Isko function ke bahar rakha hai taaki bot restart hone par bhi memory me rahe
let isPairingCodeRequested = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('almastur_fresh_session');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Mac OS", "Safari", "10.15.7"] // Browser identity change karke aur stable kiya hai
    });

    // Agar code abhi tak nahi manga gaya hai, tabhi maango
    if (!sock.authState.creds.registered && !isPairingCodeRequested) {
        isPairingCodeRequested = true; // Lock laga diya taaki dobara na maange
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n===============================================================`);
                console.log(`🔥 AAPKA PAIRING CODE HAI: ${code} 🔥`);
                console.log(`👉 WhatsApp > Linked Devices > Link with phone number me daalein.`);
                console.log(`===============================================================\n`);
            } catch (err) {
                console.error("❌ Pairing code error:", err?.message);
                isPairingCodeRequested = false; // Agar code lene me fail hua, toh lock khol do taaki retry kare
            }
        }, 4000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                // Connection tootne par shanti se 5 second baad reconnect karega, code dobara nahi mangega
                setTimeout(startBot, 5000); 
            }
        } else if (connection === 'open') {
            console.log('✅ SUCCESS! AL-Mastur Bot ONLINE aur LIVE hai!');
        }
    });

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
