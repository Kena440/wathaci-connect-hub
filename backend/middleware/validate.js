const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, {
      allowedTags: [],
      allowedAttributes: {},
      allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, sanitizeObject(value)])
    );
  }
  return obj;
};

module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ 
      success: false,
      error: error.details.map(d => d.message).join(', ') 
    });
  }
  req.body = sanitizeObject(value);
  next();
};
