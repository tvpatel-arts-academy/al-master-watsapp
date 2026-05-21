const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

// 👇 YAHAN APNA WHATSAPP NUMBER DAALO (With Country Code, bina + ke)
// Example: "919876543210" 
const phoneNumber = "917862019270"; 

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // GitHub par QR print nahi karna hai
        logger: pino({ level: "silent" })
    });

    // Agar pehle se login nahi hai aur number diya hai, toh pairing code generate karega
    if (!sock.authState.creds.registered && phoneNumber) {
        await delay(3000); // 3 seconds wait karega setup ke liye
        try {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n============== PAIRING CODE ==============`);
            console.log(`Aapka WhatsApp Pairing Code Hai: ${code}`);
            console.log(`Apne Phone ke WhatsApp > Linked Devices > Link with phone number me jaakar yeh code daalein.`);
            console.log(`==========================================\n`);
        } catch (error) {
            console.error("Pairing code generate karne me dikkat aayi:", error);
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('Connection close ho gaya. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startWhatsApp();
        } else if (connection === 'open') {
            console.log('Mubarak ho! WhatsApp Bot successfully connect ho gaya hai! 🎉');
        }
    });

    // Baki aapka bot ka logic (messages handle karna) iske neeche aayega
    sock.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            // Aapka bot command handle karne ka code yahan...
        } catch (err) {
            console.log(err);
        }
    });
}

startWhatsApp();
