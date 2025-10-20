function castArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined) {
    return [];
  }

  return [value];
}

module.exports = castArray;
module.exports.default = castArray;
