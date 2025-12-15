export const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  let metaEnv: Record<string, string> | undefined;

  try {
    metaEnv = new Function(
      'return typeof import.meta !== "undefined" ? import.meta.env : undefined;',
    )();
  } catch {
    metaEnv = undefined;
  }

  if (metaEnv && metaEnv[key] !== undefined) {
    return metaEnv[key] === 'true';
  }

  if (typeof process !== 'undefined' && process.env?.[key] !== undefined) {
    return process.env[key] === 'true';
  }

  if (typeof globalThis !== 'undefined') {
    const runtimeValue = (globalThis as any)?.__APP_CONFIG__?.[key];
    if (runtimeValue !== undefined) {
      return String(runtimeValue) === 'true';
    }
  }

  return defaultValue;
};
