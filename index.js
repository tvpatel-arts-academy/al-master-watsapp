const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

// Console me phone number type karne ke liye readline setup
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startWhatsApp() {
    // Auth state manage karne ke liye
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // QR Code display band kar diya
        logger: pino({ level: 'silent' }), // Extra logs hide karne ke liye
        browser: ['Chrome (Linux)', '', ''] // Pairing code use karne ke liye browser set karna zaroori hai
    });

    // Agar session pehle se nahi bana hai, toh pairing code maangega
    if (!sock.authState.creds.registered) {
        // Country code ke saath number daalna zaroori hai (e.g., 919876543270)
        const phoneNumber = await question('Apna WhatsApp number enter karo (with country code): ');
        
        // WhatsApp se pairing code request karo
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n========================================`);
        console.log(`Bhai, tera Pairing Code ye hai: ${code}`);
        console.log(`========================================\n`);
        console.log(`WhatsApp me 'Linked Devices' -> 'Link with phone number' me jaake ye code daal.`);
    }

    // Credentials save karte rehna jab bhi update ho
    sock.ev.on('creds.update', saveCreds);

    // Connection status monitor karna
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            console.log('Connection close ho gaya, wapas connect kar raha hoon...');
            startWhatsApp(); // Reconnect
        } else if (connection === 'open') {
            console.log('WhatsApp successfully connect ho gaya!');
        }
    });
}

startWhatsApp();
