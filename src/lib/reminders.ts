// Open the device's SMS composer; the owner reviews and sends the message.
export function smsReminderHref(number: string, message: string, userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  const separator = /iPhone|iPad|iPod/i.test(userAgent) ? '&' : '?';
  return `sms:+${number}${separator}body=${encodeURIComponent(message)}`;
}
