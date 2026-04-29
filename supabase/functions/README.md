# Gallery Edge Functions

Deploy these functions after applying the gallery migration:

```bash
supabase functions deploy gallery-session
supabase functions deploy gallery-sign-upload
supabase functions deploy gallery-complete-upload
supabase functions deploy gallery-delete
```

Set a private session secret in the Supabase project:

```bash
supabase secrets set GALLERY_JWT_SECRET=replace-with-a-long-random-string
```

The functions also require the standard Supabase hosted secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
