# ElevenLabs Real Provider Testing

## Required environment variables

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_PHONE_NUMBER_ID`
- `ELEVENLABS_WEBHOOK_SECRET`
- `PUBLIC_WEBHOOK_BASE_URL`

Optional:

- `ELEVENLABS_SANDBOX_MODE=true|false`
- `ELEVENLABS_CALL_RECORDING_ENABLED=true|false`

## Provider mode

- Sandbox mode: `surveyai.calling.active-provider=ELEVENLABS`, `surveyai.calling.elevenlabs.enabled=true`, `ELEVENLABS_SANDBOX_MODE=true`
  This exercises dispatch, provider correlation, webhook plumbing, and inspection endpoints without placing a real call.
- Live mode: set `ELEVENLABS_SANDBOX_MODE=false`
  This places a real outbound call through ElevenLabs/Twilio.

## Webhook URL

Configure ElevenLabs post-call webhooks to POST to:

`{PUBLIC_WEBHOOK_BASE_URL}/api/v1/provider-webhooks/ELEVENLABS`

The server will log the expected URL at startup. For local testing, expose the app with ngrok or another public tunnel and set `PUBLIC_WEBHOOK_BASE_URL` to that public base URL.

## One-contact E2E test flow

1. Start the app and confirm startup diagnostics log the active provider, sandbox/live mode, and expected webhook URL.
2. Create or reuse a published survey with a minimal question set.
3. Create an operation for that survey and import exactly one contact with a real reachable phone number.
4. Verify readiness, then start the operation.
5. Open the call-job detail endpoint and the provider execution debug endpoint:
   - `GET /api/v1/operations/{operationId}/jobs?companyId={companyId}`
   - `GET /api/v1/operations/{operationId}/jobs/{callJobId}?companyId={companyId}`
   - `GET /api/v1/companies/{companyId}/provider-executions?operationId={operationId}`
6. Confirm the dispatch stage produced:
   - `provider=ELEVENLABS`
   - a `providerCallId`
   - `dispatch.accepted` or `dispatch.failed`
7. Wait for the post-call webhook and confirm a webhook event shows:
   - event type such as `post_call_transcription` or `call_initiation_failure`
   - for matched webhooks, populated `callJobId` and `callAttemptId`
   - outcome `ACCEPTED`, `IGNORED`, or `UNMATCHED`
8. Confirm result persistence:
   - `SurveyResponse` exists for the `callAttemptId`
   - `answerCount` is populated in provider execution events
   - `unmappedFieldCount` is `0` for a clean mapping or non-zero for partial mapping
   - transcript availability is visible in both call attempt detail and provider execution events
9. Check analytics after the webhook lands to confirm the response was included.

## What to inspect when something breaks

- Dispatch failure:
  Look for `dispatch.failed` in `/provider-executions`, then check `call_job.last_error_message` and `call_attempt.failure_reason`.
- Missing webhook:
  Confirm ElevenLabs can reach the public webhook URL and that the server logs `Provider webhook received`.
- Rejected webhook:
  Check server logs for `Provider webhook rejected`, then verify signature secret / timestamp drift.
- Duplicate webhook:
  Look for `IGNORED` webhook events with a stale or duplicate message.
- Partial mapping:
  Look for a `RESULT` event with outcome `PARTIAL`, then inspect `unmappedFieldCount`, `SurveyResponse.transcriptJson`, and the raw payload captured in execution events.
