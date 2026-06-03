export const CANOPI_VERSION = '0.6.0';
export const CANOPI_RELEASE_DATE = '2026-06-03';
export const CANOPI_RELEASE_TAG = `v${CANOPI_VERSION}`;
export const CANOPI_RELEASE_URL = `https://github.com/naejin/canopi/releases/tag/${CANOPI_RELEASE_TAG}`;
export const CANOPI_RELEASES_URL = 'https://github.com/naejin/canopi/releases';
export const CANOPI_DOWNLOAD_BASE_URL = `https://github.com/naejin/canopi/releases/download/${CANOPI_RELEASE_TAG}`;

export const CANOPI_DOWNLOADS = {
  linuxAppImage: `${CANOPI_DOWNLOAD_BASE_URL}/Canopi_${CANOPI_VERSION}_amd64.AppImage`,
  linuxDeb: `${CANOPI_DOWNLOAD_BASE_URL}/Canopi_${CANOPI_VERSION}_amd64.deb`,
  macAppleSiliconDmg: `${CANOPI_DOWNLOAD_BASE_URL}/Canopi_${CANOPI_VERSION}_aarch64.dmg`,
  macIntelDmg: `${CANOPI_DOWNLOAD_BASE_URL}/Canopi_${CANOPI_VERSION}_x64.dmg`,
  windowsSetupExe: `${CANOPI_DOWNLOAD_BASE_URL}/Canopi_${CANOPI_VERSION}_x64-setup.exe`,
  windowsMsi: `${CANOPI_DOWNLOAD_BASE_URL}/Canopi_${CANOPI_VERSION}_x64_en-US.msi`,
} as const;
