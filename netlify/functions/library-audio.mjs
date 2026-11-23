const FOLDERS = [
  { id: '1RjSBKuAqcE9ZclPSe0Ry0pk_db-ZRJLF', name: 'Relaxation' },
  { id: '1tJyLJ-yL4oFBGSVbhzZZKmN_HjsJyqxt', name: 'Anxiety' },
  { id: '1Z7vd1pg4uojkb4iGchxcofIgQSfpmy0O', name: 'Sleep' }
];
const EXISTING_TRACK_ID = '13toX-WkS-jXR-WR1xHuzrJ-8FeriJ3qT';

export default async function handler() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Google Drive library feed is not configured.' }, { status: 503 });
  }

  try {
    const lists = await Promise.all(FOLDERS.map(async folder => {
      const params = new URLSearchParams({
        q: `'${folder.id}' in parents and trashed = false`,
        fields: 'files(id,name,mimeType,size,webViewLink)',
        pageSize: '100',
        key: apiKey
      });
      const response = await fetch('https://www.googleapis.com/drive/v3/files?' + params);
      if (!response.ok) throw new Error('Drive folder request failed');
      const data = await response.json();
      return (data.files || [])
        .filter(file => file.mimeType === 'audio/mpeg' && /\\.mp3$/i.test(file.name || ''))
        .filter(file => file.id !== EXISTING_TRACK_ID)
        .map(file => ({
          id: file.id,
          name: file.name,
          folder: folder.name,
          downloadUrl: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(file.id)
        }));
    }));
    const files = lists.flat().sort((a,b) => a.name.localeCompare(b.name));
    return Response.json({ files }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' }
    });
  } catch (error) {
    return Response.json({ error: 'Unable to read the public library folders.' }, { status: 502 });
  }
}
