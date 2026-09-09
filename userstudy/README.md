# Study guide

The static web application that ran the evaluation sessions: consent, background
questions, the two scenario briefs, the post-task questionnaires, the UEQ, and a
JSON export of the responses. Bilingual, English and German.

## Requirements

Any static web server. `api/config.js` is a Vercel serverless function; without
it the page still runs and result submission stays disabled.

## Installation

```bash
python3 -m http.server 8080     # from this directory
```

Configuration is read from the environment through `api/config.js`
(see `.env.example`):

- `RESULTS_SAVE_ENDPOINT` receives the responses as JSON. Empty by default, in
  which case the page tells the participant to export the results manually.
- `TUTORIAL_VIDEO_URL` is the tutorial shown before the first scenario.

## Usage

Open `http://localhost:8080`. The guide advances through eleven steps and keeps
its state in `localStorage`, so a reload during a session does not lose answers.
Responses can be downloaded as JSON at the end regardless of whether an endpoint
is configured.
