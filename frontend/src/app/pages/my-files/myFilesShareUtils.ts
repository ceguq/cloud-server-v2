import { getShareLinks } from "../../../services/shareService";

export type ShareableFileInput = {
  id: string;
};

export async function getExistingFileShareLink(file: ShareableFileInput) {
  const links = await getShareLinks();
  return links.find((link) => link.file?.id === file.id) ?? null;
}
