# AI and data disclosure

The solo participant used an AI coding assistant for planning, implementation, testing, review, documentation, and demo preparation. Runtime caregiver-note interpretation uses the configured Gemini model through Google's OpenAI-compatible endpoint. Model and prompt version are recorded with each analyzed note. Runtime rules and care transitions remain deterministic application logic.

All patient identities, caregiver identities, readings, and note fixtures are synthetic. There are no imported patient datasets or hardware integrations. No real patient note or credential is included in the source, screenshots, verification reports, or video.

Normal browser regression tests use an explicitly named local mock provider for repeatability. Live Gemini evaluations and the recorded demonstration use the actual configured provider. The broader 40-case English-note suite contains independently authored synthetic development and confirmation cases; failures and raw errors are retained. See the [verification summary and original evaluation](verification/README.md#gemini-evaluation). This small set is not a clinical NLP accuracy benchmark. Human caregiver usability testing remains unperformed.

Optional email checks use fake credentials, reserved addresses, and a loopback receiver. No real cloud email was sent, delivered, or read as part of this work. Provider acceptance is distinct from caregiver acknowledgement.

Demo narration is synthesized locally with the installed Microsoft Zira voice. Screen footage shows real application actions and stored results; chapter captions and the closing architecture card are presentation aids. The visibly accelerated demo clock is synthetic.

The participant should review any additional declarations or terms displayed by the final submission form. Registration alone does not prove acceptance of a later declaration.
