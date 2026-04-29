import {
  ALBUM_SLUGS,
  BUCKET,
  MAX_FILES,
  assertAlbum,
  assertImageType,
  errorResponse,
  extensionFor,
  fail,
  handleOptions,
  httpError,
  ok,
  readJson,
  serviceClient,
  validateFileSize,
  verifySession,
} from '../_shared/gallery.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    if (req.method !== 'POST') return fail(405, 'Method not allowed');

    const body = await readJson(req);
    const session = await verifySession(body.sessionToken);
    const files = Array.isArray(body.files) ? body.files : [];

    if (!files.length) throw httpError(400, 'Choose at least one photo');
    if (files.length > MAX_FILES) throw httpError(400, `Upload up to ${MAX_FILES} photos at once`);

    const sb = serviceClient();
    const uploads = [];

    for (const file of files) {
      const eventAlbum = assertAlbum(String(file.eventAlbum || ''));
      const contentType = assertImageType(String(file.type || ''));
      const size = validateFileSize(Number(file.size));
      const fileName = String(file.name || 'photo').slice(0, 180);
      const ext = extensionFor(fileName, contentType);
      const filePath = `events/${ALBUM_SLUGS[eventAlbum]}/${session.uploaderSlug}/${crypto.randomUUID()}.${ext}`;

      const {data, error} = await sb.storage
        .from(BUCKET)
        .createSignedUploadUrl(filePath);

      if (error) throw error;

      uploads.push({
        eventAlbum,
        filePath,
        fileName,
        contentType,
        size,
        token: data.token,
      });
    }

    return ok({uploads});
  } catch (error) {
    return errorResponse(error);
  }
});
