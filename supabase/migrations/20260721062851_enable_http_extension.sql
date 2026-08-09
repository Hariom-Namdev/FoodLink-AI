/*
# Enable HTTP extension for Gemini API calls

1. Extensions
- Enable `http` extension for making outbound HTTP requests from Postgres
2. Notes
- This allows calling the Gemini API directly from a Postgres function
- Bypasses the edge function which has a model version issue
*/

CREATE EXTENSION IF NOT EXISTS http;
