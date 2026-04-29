import {
  BUCKET,
  errorResponse,
  fail,
  handleOptions,
  httpError,
  ok,
  readJson,
  serviceClient,
  verifySession,
} from '../_shared/gallery.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    if (req.method !== 'POST') return fail(405, 'Method not allowed');

    const body = await readJson(req);
    const session = await verifySession(body.sessionToken);
    const photoId = String(body.photoId || '');
    if (!photoId) throw httpError(400, 'Photo id is required');

    const sb = serviceClient();
    const {data: photo, error: selectError} = await sb
      .from('photo_uploads')
      .select('id, uploader_id, file_path')
      .eq('id', photoId)
      .single();

    if (selectError) throw selectError;
    if (!photo) throw httpError(404, 'Photo not found');
    if (photo.uploader_id !== session.sub) {
      throw httpError(403, 'Only the uploader can delete this photo');
    }

    const {error: removeError} = await sb.storage
      .from(BUCKET)
      .remove([photo.file_path]);

    if (removeError) throw removeError;

    const {error: deleteError} = await sb
      .from('photo_uploads')
      .delete()
      .eq('id', photo.id);

    if (deleteError) throw deleteError;

    return ok({deleted: true});
  } catch (error) {
    return errorResponse(error);
  }
});
