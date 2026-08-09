/*
# Create Gemini chat function

1. Functions
- `gemini_chat(messages jsonb)` — calls the Gemini 3.5 Flash API with conversation history and returns the AI response text
2. Notes
- Uses the `http` extension to make outbound HTTPS requests to Google's Generative Language API
- System prompt provides FoodLink context but allows answering any general question
- API key is embedded in the function (server-side only, not exposed to clients)
*/

CREATE OR REPLACE FUNCTION gemini_chat(messages jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text := '';
  api_url text := 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
  system_prompt text := 'You are a helpful, knowledgeable AI assistant. Answer any question the user asks — coding, science, writing, math, general knowledge, advice, or anything else — thoroughly and accurately. Background context (for reference only, when relevant): You are integrated into FoodLink AI, a smart food waste management platform in India that connects restaurants, hotels, bakeries, and supermarkets with NGOs to distribute surplus food. It operates across 30+ Indian cities. Features include food donation listings, NGO discovery, volunteer delivery with route optimization, AI-based freshness prediction, demand forecasting, image classification, duplicate detection, and an admin analytics dashboard. User roles: Restaurant, NGO, Volunteer, Admin. Do not mention Google, Gemini, or any AI provider. Do not include ads.';
  contents jsonb;
  msg record;
  role text;
  request_body jsonb;
  response_data jsonb;
  reply_text text;
BEGIN
  contents := '[]'::jsonb;

  FOR msg IN SELECT * FROM jsonb_array_elements(messages)
  LOOP
    role := CASE WHEN msg->>'role' = 'assistant' THEN 'model' ELSE 'user' END;
    contents := contents || jsonb_build_array(
      jsonb_build_object(
        'role', role,
        'parts', jsonb_build_array(jsonb_build_object('text', msg->>'content'))
      )
    );
  END LOOP;

  request_body := jsonb_build_object(
    'systemInstruction', jsonb_build_object('parts', jsonb_build_array(jsonb_build_object('text', system_prompt))),
    'contents', contents,
    'generationConfig', jsonb_build_object(
      'temperature', 0.9,
      'maxOutputTokens', 4096,
      'topP', 0.95
    )
  );

  SELECT content INTO response_data
  FROM http_post(
    api_url,
    request_body::text,
    'application/json'
  );

  -- http_post returns the full HTTP response; extract the body
  -- The response column contains the response body as text
  reply_text := response_data->'candidates'->0->'content'->'parts'->0->'text';

  IF reply_text IS NULL THEN
    RETURN 'Sorry, I could not generate a response at this time.';
  END IF;

  RETURN reply_text;
END;
$$;

GRANT EXECUTE ON FUNCTION gemini_chat(jsonb) TO anon, authenticated;
