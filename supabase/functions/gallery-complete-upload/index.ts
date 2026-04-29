import {
  ALBUM_SLUGS,
  MAX_FILES,
  assertAlbum,
  assertImageType,
  errorResponse,
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
    const photos = Array.isArray(body.photos) ? body.photos : [];

    if (!photos.length) throw httpError(400, 'No uploaded photos to save');
    if (photos.length > MAX_FILES) throw httpError(400, `Save up to ${MAX_FILES} photos at once`);

    const rows = photos.map((photo) => {
      const eventAlbum = assertAlbum(String(photo.eventAlbum || ''));
      const contentType = assertImageType(String(photo.contentType || ''));
      const size = validateFileSize(Number(photo.size));
      const filePath = String(photo.filePath || '');
      const expectedPrefix = `events/${ALBUM_SLUGS[eventAlbum]}/${session.uploaderSlug}/`;

      if (!filePath.startsWith(expectedPrefix)) {
        throw httpError(403, 'Uploaded file does not belong to this session');
      }

      return {
        uploader_id: session.sub,
        uploader_name: session.displayName,
        event_album: eventAlbum,
        file_path: filePath,
        file_name: String(photo.fileName || 'photo').slice(0, 180),
        content_type: contentType,
        file_size: size,
      };
    });

    const sb = serviceClient();
    const {data, error} = await sb
      .from('photo_uploads')
      .insert(rows)
      .select('*');

    if (error) throw error;

    return ok({photos: data || []});
  } catch (error) {
    return errorResponse(error);
  }
});
