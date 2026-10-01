// Les miniatures sont servies en cache « immutable » : incrémenter la version
// force les navigateurs à les recharger après une régénération côté serveur.
const THUMB_VERSION = 2;

export function thumbUrl(photoId: string): string {
  return `/api/photos/${photoId}/thumb?v=${THUMB_VERSION}`;
}
