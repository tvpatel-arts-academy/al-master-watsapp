const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');

// Groq API Initialize
const groq = new Groq({ apiKey: "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" });

// ⚠️ APNA WHATSAPP NUMBER YAHAN DAALO (Country code 91 ke sath, bina kisi space ya + ke)
const MY_NUMBER = '917862019270'; 

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './auth_session' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// QR code generate hone ke bajaye hum Pairing Code mangenge
client.on('qr', async (qr) => {
    console.log('===============================================================');
    console.log('🔄 PAIRING CODE GENERATE HO RAHA HAI, 5 SECONDS RUKO...');
    console.log('===============================================================');
    
    try {
        // Yeh line WhatsApp se 8-digit ka text code nikalegi
        const pairingCode = await client.requestPairingCode(MY_NUMBER);
        console.log('\n🔥 AL-MASTUR BOT PAIRING CODE 🔥');
        console.log(`👉 APNA CODE: ${pairingCode} 👈`);
        console.log('\nIs code ko copy karo aur apne phone ke WhatsApp par daalo!');
    } catch (err) {
        console.error('Pairing code lene mein error aaya:', err);
    }
});

client.on('ready', () => {
    console.log('✅ SUCCESS! AL-Mastur WhatsApp Bot is ONLINE aur LIVE hai!');
});

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;
    console.log(`📩 Customer Message: ${msg.body}`);
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a highly polite and professional customer support assistant for 'AL-Mastur', a premium modest fashion brand selling Burqas, Naqabs, and Rumalis in India. Talk nicely in Hinglish. Keep answers short, crisp, and helpful. Always offer Cash on Delivery (COD)."
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

client.initialize();
