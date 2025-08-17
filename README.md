# WhatsApp Voice Note Generator for ALS Patients

A voice message generator that converts text to natural-sounding voice notes and sends them via WhatsApp. This tool is designed to help ALS patients and others with speech difficulties communicate more easily by typing messages that are converted to voice and sent through WhatsApp.

## 🎯 Features

- **Text-to-Speech Conversion**: Uses ElevenLabs AI for natural-sounding voice generation
- **WhatsApp Integration**: Automatically sends voice notes to your WhatsApp
- **Web Interface**: Simple, user-friendly interface for typing messages
- **Cloudflare Workers**: Serverless deployment for reliability and scale
- **R2 Storage**: Temporary audio file storage

## 📋 Prerequisites

Before you begin, you'll need accounts and API keys from:

1. **Twilio Account** (for WhatsApp messaging)
   - Sign up at [Twilio](https://www.twilio.com/try-twilio)
   - Set up WhatsApp Sandbox: [Twilio WhatsApp Quickstart](https://www.twilio.com/docs/whatsapp/quickstart)
   - Get your Account SID and Auth Token

2. **ElevenLabs Account** (for voice generation)
   - Sign up at [ElevenLabs](https://elevenlabs.io/)
   - Get your API key from [your profile](https://elevenlabs.io/profile)
   - Choose or clone a voice ID

3. **Cloudflare Account** (for hosting)
   - Sign up at [Cloudflare](https://dash.cloudflare.com/sign-up)
   - Enable Workers and R2: [Workers Documentation](https://developers.cloudflare.com/workers/get-started/guide/)

4. **ngrok Account** (for local development)
   - Sign up at [ngrok](https://ngrok.com/)
   - Download and authenticate ngrok: [Getting Started](https://ngrok.com/docs/getting-started/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mull2536/whatsapp-voice-notes.git
cd whatsapp-voice-notes
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.dev.vars` file in the root directory:

```env
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+14155238886"  # Twilio Sandbox number
MY_WHATSAPP_NUMBER="+31612345678"   # Your WhatsApp number
ELEVENLABS_API_KEY="your_elevenlabs_api_key"
OPENAI_API_KEY="your_openai_api_key"  # Optional, for future features
WHATSAPP_WEBHOOK_URL="https://your-ngrok-url.ngrok-free.app"
```

### 4. Set Up R2 Bucket

```bash
# Create R2 bucket (if not already created)
wrangler r2 bucket create audio
```

### 5. Start ngrok

In a separate terminal:

```bash
ngrok http 8787
```

Copy the HTTPS URL and update `WHATSAPP_WEBHOOK_URL` in `.dev.vars`

### 6. Join WhatsApp Sandbox

Send a WhatsApp message to +14155238886 with the text:
```
join [your-sandbox-name]
```

Find your sandbox name in the [Twilio Console](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)

### 7. Run the Development Server

```bash
npm run dev
```

### 8. Access the Interface

Open your browser to: http://127.0.0.1:8787

## 🏗️ Project Structure

```
├── src/
│   └── index.ts          # Main application logic
├── public/
│   └── index.html        # Web interface
├── wrangler.toml         # Cloudflare Workers configuration
├── package.json          # Dependencies and scripts
└── .dev.vars            # Environment variables (create this)
```

## 🔧 Configuration

### Voice Settings

In `src/index.ts`, you can customize the voice:

```typescript
const voiceId = "RRH9oZEaBFwuWBWtFxC4"; // Change to your preferred voice
const voiceSettings = {
    model_id: "eleven_multilingual_v2",
    voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: 0.95,
    }
};
```

### Available Voices

Find voice IDs at [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)

## 📱 Usage

1. Type your message in the text area
2. Click "Generate & Send Voice Note"
3. The message will be converted to speech and sent to your WhatsApp
4. Forward the voice note to anyone from WhatsApp

## 🚀 Deployment

### Deploy to Cloudflare Workers

1. Configure production secrets:
```bash
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put ELEVENLABS_API_KEY
# ... add all other secrets
```

2. Update `wrangler.toml` with your production domain

3. Deploy:
```bash
npm run deploy
```

## 🐛 Troubleshooting

### Voice note not received
- Verify you've joined the Twilio Sandbox
- Check ngrok URL is current in `.dev.vars`
- Ensure all API keys are correct
- Check Twilio logs in [Twilio Console](https://console.twilio.com/us1/monitor/logs/errors)

### Audio file errors
- Verify R2 bucket exists and is named "audio"
- Check Cloudflare Workers logs
- Ensure ngrok is running and accessible

### API Limits
- ElevenLabs free tier: 10,000 characters/month
- Twilio Sandbox: Limited to numbers that have joined
- Consider upgrading for production use

## 📚 Resources

- [Twilio WhatsApp API Documentation](https://www.twilio.com/docs/whatsapp)
- [ElevenLabs API Documentation](https://docs.elevenlabs.io/api-reference/quick-start/introduction)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Framework Documentation](https://hono.dev/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built for ALS patients and others with speech difficulties
- Powered by ElevenLabs AI voice technology
- WhatsApp messaging via Twilio
- Serverless hosting on Cloudflare Workers
- Kudos to Thorsten Schaeff who made this available (https://github.com/thorwebdev/twilio-whatsapp-voice-agent/tree/main)
