const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

// Groq API Initialize
const groq = new Groq({ apiKey: "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" });

// Client Configuration for Cloud/GitHub Environment
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './auth_session' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Jab QR Code Generate ho
client.on('qr', (qr) => {
    console.log('===============================================================');
    console.log('👉 AL-MASTUR BOT: PHONE SE IS QR CODE KO SCAN KAREIN:');
    console.log('===============================================================');
    qrcode.generate(qr, { small: true });
});

// Successful Auth aur Ready State
client.on('ready', () => {
    console.log('✅ SUCCESS! AL-Mastur WhatsApp Bot is ONLINE aur LIVE hai!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failure, restarting session...', msg);
});

// Incoming Message Trigger
client.on('message', async (msg) => {
    // Sirf individual chats handle karne ke liye (groups ko ignore karega)
    if (msg.from.includes('@g.us')) return;

    console.log(`📩 Customer Message: ${msg.body}`);

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a highly polite and professional customer support assistant for 'AL-Mastur', a premium modest fashion brand selling Burqas, Naqabs, and Rumalis in India. Talk nicely in Hinglish (Hindi written in English alphabet). Keep answers short, crisp, and helpful. Always offer Cash on Delivery (COD)."
                },
                {
                    role: "user",
                    content: msg.body
                }
            ],
            model: "llama-3.1-8b-instant",
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Maaf karna, main abhi theek se samajh nahi paaya.";
        
        await msg.reply(reply);
        console.log(`📤 Bot Reply Sent: ${reply}`);

    } catch (error) {
        console.error("❌ Groq API Error:", error);
    }
});

// Initialize Client
client.initialize();
