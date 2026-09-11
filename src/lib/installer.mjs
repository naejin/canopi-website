// Keep uncertain devices in the chooser instead of guessing an installer.
export function isMacDesktop(ua, platform = '', touchPoints = 0) {
  const device = `${platform} ${ua}`;
  return /Mac/i.test(device) && !/Android|iPhone|iPad|iPod|CrOS/i.test(device) && touchPoints <= 1;
}

export function detectInstaller(ua, platform, architecture, touchPoints = 0, bitness = '') {
  const device = `${platform} ${ua}`;
  if (/Android|iPhone|iPad|iPod|CrOS/i.test(device) || (/Mac/i.test(device) && touchPoints > 1)) return null;
  if (bitness === '32' || /Win32|i[3-6]86/i.test(ua)) return null;
  const arm = /arm|aarch/i.test(architecture || ua);
  if (/Windows/i.test(device)) return arm ? null : 'windows';
  if (/Mac/i.test(device)) {
    if (!architecture) return null;
    return arm ? 'mac-arm' : /x86|x64/i.test(architecture) ? 'mac-intel' : null;
  }
  if (/Linux/i.test(device)) return arm ? null : /x86_64|amd64|x64|x86/i.test(`${architecture} ${ua}`) ? 'linux' : null;
  return null;
}
