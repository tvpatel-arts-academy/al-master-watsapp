const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');

// Groq API Initialize
const groq = new Groq({ apiKey: "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" });

// APNA WHATSAPP NUMBER (Isme koi badlav mat karna agar pehle set kar diya tha)
const MY_NUMBER = '917862019270'; 

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './auth_session' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ]
    }
});

client.on('qr', async (qr) => {
    try {
        const pairingCode = await client.requestPairingCode(MY_NUMBER);
        console.log(`\n🔥 AL-MASTUR BOT PAIRING CODE: ${pairingCode} 🔥\n`);
    } catch (err) {
        console.error('Pairing code error:', err);
    }
});

client.on('ready', () => {
    console.log('✅ SUCCESS! AL-Mastur WhatsApp Bot IS ONLINE AUR LIVE HAI!');
});

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;

    // Agar khali message ya sirf link (reels) aaye jisme text na ho, toh default greeting set karein
    let incomingText = msg.body ? msg.body.trim() : "";
    if (incomingText.startsWith('http')) {
        incomingText = "Maine aapka reel/link dekha, mujhe is product ke baare mein janna hai.";
    }
    
    if (!incomingText) return;

    console.log(`📩 Customer Message: ${incomingText}`);

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a highly polite and professional customer support assistant for 'AL-Mastur', a premium modest fashion brand selling Burqas, Naqabs, and Rumalis in India. Talk nicely in Hinglish. Keep answers short, crisp, and helpful. Always offer Cash on Delivery (COD)."
                },
                {
                    role: "user",
                    content: incomingText
                }
            ],
            model: "llama-3.1-8b-instant",
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Maaf karna, main abhi theek se samajh nahi paaya.";
        
        // 🛠️ FIX: msg.reply ke bajaye direct sendMessage use kar rahe hain jo crash-proof hai
        await client.sendMessage(msg.from, reply);
        console.log(`📤 Bot Reply Sent: ${reply}`);

    } catch (error) {
        console.error("❌ WhatsApp Sending Error:", error);
    }
});

client.initialize();
