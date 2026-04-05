
-- Update client_profile user_id to match the actual logged-in user
UPDATE public.client_profiles
SET user_id = '0ea8e92d-2327-4f5c-bd89-aca345f05580'
WHERE id = 'b1dad08c-f21f-4836-8062-b03770268d80'
  AND email = 'elpenergia@gmail.com';
