export function displaySign(sign) {
  const name = String(sign || '').replace(/\s+under Jesus$/i, '').trim();
  return name ? `${name} under Jesus` : '';
}

export function birthSunLabels(symbolicSign, astronomicalSign) {
  const symbolic = displaySign(symbolicSign);
  const astronomical = displaySign(astronomicalSign);
  if (!astronomical || astronomical === symbolic) return [symbolic];
  return [`Lilly: ${astronomical}`,`Sepharial: ${symbolic}`];
}
