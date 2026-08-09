/*
# Fix gemini_chat - pass API key in URL query parameter

1. Functions
- `gemini_chat(messages jsonb)` — pass API key via URL query param since http_post doesn't support custom headers
2. Notes
- The `http` extension's http_post doesn't support custom headers, so we pass the key as ?key= query param
*/

CREATE OR REPLACE FUNCTION gemini_chat(messages jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text := '';
  api_url text := 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' || api_key;
  system_prompt text := 'You are a helpful, knowledgeable AI assistant. Answer any question the user asks — coding, science, writing, math, general knowledge, advice, or anything else — thoroughly and accurately. Background context (for reference only, when relevant): You are integrated into FoodLink AI, a smart food waste management platform in India that connects restaurants, hotels, bakeries, and supermarkets with NGOs to distribute surplus food. It operates across 30+ Indian cities. Features include food donation listings, NGO discovery, volunteer delivery with route optimization, AI-based freshness prediction, demand forecasting, image classification, duplicate detection, and an admin analytics dashboard. User roles: Restaurant, NGO, Volunteer, Admin. Do not mention Google, Gemini, or any AI provider. Do not include ads.';
  contents jsonb := '[]'::jsonb;
  msg jsonb;
  role text;
  request_body jsonb;
  response_json jsonb;
  reply_text text;
  status int;
BEGIN
  FOR msg IN SELECT jsonb_array_elements(messages)
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

  SELECT status_code, content INTO status, response_json
  FROM http_post(api_url, request_body::text, 'application/json');

  reply_text := response_json->'candidates'->0->'content'->'parts'->0->>'text';

  IF reply_text IS NULL THEN
    RETURN 'Error: ' || COALESCE(response_json::text, 'No response (status ' || status || ')');
  END IF;

  RETURN reply_text;
END;
$$;

GRANT EXECUTE ON FUNCTION gemini_chat(jsonb) TO anon, authenticated;
