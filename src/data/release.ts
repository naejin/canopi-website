export const CANOPI_VERSION = '2.0.1';
export const CANOPI_RELEASE_DATE = '2026-10-16';
export const CANOPI_RELEASE_TAG = `v${CANOPI_VERSION}`;
export const CANOPI_RELEASE_URL = `https://github.com/opencanopi/canopi/releases/tag/${CANOPI_RELEASE_TAG}`;
export const CANOPI_RELEASES_URL = 'https://github.com/opencanopi/canopi/releases';
export const CANOPI_DOWNLOAD_BASE_URL = 'https://github.com/opencanopi/canopi/releases/latest/download';
export const CANOPI_CHECKSUMS_URL = `${CANOPI_DOWNLOAD_BASE_URL}/RELEASE-SHA256SUMS.txt`;

export const CANOPI_DOWNLOADS = {
  linuxAppImage: `${CANOPI_DOWNLOAD_BASE_URL}/canopi-linux-x64.AppImage`,
  linuxDeb: `${CANOPI_DOWNLOAD_BASE_URL}/canopi-linux-x64.deb`,
  macAppleSiliconDmg: `${CANOPI_DOWNLOAD_BASE_URL}/canopi-macos-arm64.dmg`,
  macIntelDmg: `${CANOPI_DOWNLOAD_BASE_URL}/canopi-macos-x64.dmg`,
  windowsSetupExe: `${CANOPI_DOWNLOAD_BASE_URL}/canopi-windows-x64.exe`,
  windowsMsi: `${CANOPI_DOWNLOAD_BASE_URL}/canopi-windows-x64.msi`,
} as const;
