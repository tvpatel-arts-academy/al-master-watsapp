const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: "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" });

// Maine tumhara AL-Mastur wala number yahan daal diya hai
const phoneNumber = "917862019270"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_session');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // QR Code disable
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    let pairingCodeRequested = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // JAB SERVER SAHI SE READY HO JAYE (qr signal de), TABHI CODE MAANGO
        if (qr && !pairingCodeRequested) {
            pairingCodeRequested = true;
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n===============================================================`);
                console.log(`🔥 AAPKA PAIRING CODE HAI: ${code} 🔥`);
                console.log(`👉 WhatsApp > Linked Devices > Link with phone number me daalein.`);
                console.log(`===============================================================\n`);
            } catch (err) {
                console.error("❌ Pairing code error:", err?.message);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            // Agar connection close ho toh 5 second wait karke reconnect karega taaki loop na bane
            if (shouldReconnect) {
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
        
        // Agar customer sirf link bhej de toh
        if (!text && msg.message.extendedTextMessage?.contextInfo?.externalAdReply) {
            text = "Maine aapka product/link dekha hai, mujhe iske baare mein janna hai.";
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
