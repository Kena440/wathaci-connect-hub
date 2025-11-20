export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL?.trim() || 'support@wathaci.com';

export const withSupportContact = (message: string) => {
  const trimmedMessage = message.trim();
  const needsPeriod = trimmedMessage.endsWith('.') ? '' : '.';
  return `${trimmedMessage}${needsPeriod} For assistance, contact ${SUPPORT_EMAIL}.`;
};
