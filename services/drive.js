// Google Drive integration boundary. The app stores Drive IDs/metadata in Firestore, not heavy creative files.
export const projectFolderBlueprint = [
  '01 Brief','02 Client Assets','03 Research','04 Moodboard','05 Working Files','06 Review Versions','07 Approved','08 Final Delivery'
];

export function driveAssetRecord({ fileId, projectId, category, version = 1, previewFileId = null }) {
  return {
    fileId, projectId, category, version, previewFileId,
    provider:'google-drive', createdAt:new Date().toISOString()
  };
}
