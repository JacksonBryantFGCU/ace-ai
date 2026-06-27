# Vapi setup (external configuration)

The behavioral voice interview (Phase 4) uses [Vapi](https://vapi.ai) for the
real-time call. Only the **public** key reaches the browser; the voice/model
providers are configured in your Vapi account.

## 1. Key

1. Create a Vapi account and a **Web** public key.
2. Add it to `.env.local`:
   ```
   NEXT_PUBLIC_VAPI_PUBLIC_KEY=<your-vapi-public-key>
   ```
   It is `NEXT_PUBLIC_*` by design — Vapi public keys are safe in the client bundle.

## 2. Providers (configured in the Vapi dashboard)

The assistant is created inline by the client with these providers, so your Vapi
project must have them enabled / keyed:

- **Model:** OpenAI `gpt-4.1`
- **Transcriber:** Deepgram `nova-3`
- **Voices:** ElevenLabs (`cassidy`, `jordan`) and a Vapi voice (`alex`)

These provider API keys live in Vapi, not in this app.

## 3. Notes

- The interviewer roster (voices + personalities) is in `lib/constants.ts`.
- The system prompt is built client-side in `lib/prompts/behavioral.ts` (Vapi needs
  it inline in the assistant config).
- Microphone permission is requested by the browser on call start; an `AudioContext`
  is resumed inside the click handler to satisfy autoplay policies.
