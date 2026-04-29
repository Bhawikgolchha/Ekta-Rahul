import {
  displayName,
  errorResponse,
  fail,
  handleOptions,
  hashPin,
  httpError,
  normalizeName,
  ok,
  randomSalt,
  readJson,
  serviceClient,
  signSession,
  uploaderSlug,
  validateName,
  validatePin,
  SESSION_SECONDS,
} from '../_shared/gallery.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    if (req.method !== 'POST') return fail(405, 'Method not allowed');

    const body = await readJson(req);
    const cleanName = validateName(body.name);
    const pin = validatePin(body.pin);
    const nameKey = normalizeName(cleanName);
    const slug = uploaderSlug(nameKey);
    const sb = serviceClient();

    let {data: uploader, error: selectError} = await sb
      .from('gallery_uploaders')
      .select('id, display_name, name_key, uploader_slug, pin_salt, pin_hash')
      .eq('name_key', nameKey)
      .maybeSingle();

    if (selectError) throw selectError;

    let mode = 'existing';

    if (!uploader) {
      mode = 'created';
      const salt = randomSalt();
      const pinHash = await hashPin(pin, salt);
      const inserted = await sb
        .from('gallery_uploaders')
        .insert({
          display_name: displayName(cleanName),
          name_key: nameKey,
          uploader_slug: slug,
          pin_salt: salt,
          pin_hash: pinHash,
        })
        .select('id, display_name, name_key, uploader_slug, pin_salt, pin_hash')
        .single();

      if (inserted.error) {
        if (inserted.error.code !== '23505') throw inserted.error;
        const retry = await sb
          .from('gallery_uploaders')
          .select('id, display_name, name_key, uploader_slug, pin_salt, pin_hash')
          .eq('name_key', nameKey)
          .single();
        if (retry.error) throw retry.error;
        uploader = retry.data;
        mode = 'existing';
      } else {
        uploader = inserted.data;
      }
    }

    if (!uploader) throw httpError(500, 'Could not create uploader');

    const expectedHash = await hashPin(pin, uploader.pin_salt);
    if (expectedHash !== uploader.pin_hash) {
      throw httpError(403, 'That name already exists with a different PIN', 'INVALID_PIN');
    }

    const sessionToken = await signSession({
      sub: uploader.id,
      displayName: uploader.display_name,
      nameKey: uploader.name_key,
      uploaderSlug: uploader.uploader_slug,
    });

    return ok({
      mode,
      expiresIn: SESSION_SECONDS,
      sessionToken,
      uploader: {
        id: uploader.id,
        displayName: uploader.display_name,
        nameKey: uploader.name_key,
        uploaderSlug: uploader.uploader_slug,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
