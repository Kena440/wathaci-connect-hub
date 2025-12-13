const maskEmail = value => {
  if (typeof value !== 'string') return value;
  const [local, domain] = value.split('@');
  if (!domain) return value;
  const maskedLocal = `${local[0] || ''}***`;
  return `${maskedLocal}@${domain}`;
};

const maskPhone = value => {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D+/g, '');
  if (digits.length < 6) return value;
  return `+${digits.slice(0, 2)} *** *** ${digits.slice(-3)}`;
};

const scrubSecrets = value => {
  if (typeof value !== 'string') return value;
  return value.replace(/(sk_[A-Za-z0-9]+)/g, '***');
};

const traverse = (input, summary) => {
  if (Array.isArray(input)) {
    return input.map(item => traverse(item, summary));
  }
  if (input && typeof input === 'object') {
    const output = {};
    Object.entries(input).forEach(([key, val]) => {
      if (key.toLowerCase().includes('email')) {
        summary.push({ field: key, action: 'masked_email' });
        output[key] = maskEmail(val);
      } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
        summary.push({ field: key, action: 'masked_phone' });
        output[key] = maskPhone(val);
      } else if (typeof val === 'string' && /(token|secret|key)/i.test(key)) {
        summary.push({ field: key, action: 'removed_secret' });
        output[key] = undefined;
      } else {
        output[key] = traverse(val, summary);
      }
    });
    return output;
  }
  if (typeof input === 'string') return scrubSecrets(input);
  return input;
};

function redact(input) {
  const summary = [];
  const redacted = traverse(input, summary);
  return { redacted, summary };
}

module.exports = { maskEmail, maskPhone, scrubSecrets, redact };
