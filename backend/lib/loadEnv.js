const fs = require('fs');
const path = require('path');

const parseLine = (line) => {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const exportPrefix = 'export ';
  const normalized = trimmed.startsWith(exportPrefix) ? trimmed.slice(exportPrefix.length) : trimmed;
  const equalsIndex = normalized.indexOf('=');

  if (equalsIndex === -1) {
    return null;
  }

  const key = normalized.slice(0, equalsIndex).trim();
  let value = normalized.slice(equalsIndex + 1);

  if (!key) {
    return null;
  }

  const stripInlineComment = (input) => {
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '#' && !inSingleQuote && !inDoubleQuote) {
        return input.slice(0, index);
      }
    }

    return input;
  };

  value = stripInlineComment(value).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
};

const applyEnvFromFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  content.split(/\r?\n/).forEach((line) => {
    const result = parseLine(line);

    if (!result) {
      return;
    }

    if (process.env[result.key] === undefined) {
      process.env[result.key] = result.value;
    }
  });
};

const resolveEnvPaths = () => {
  const roots = [
    process.cwd(),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '..', '..'),
  ];

  const filenames = ['.env.local', '.env'];

  const paths = new Set();

  roots.forEach((rootPath) => {
    filenames.forEach((filename) => {
      paths.add(path.resolve(rootPath, filename));
    });
  });

  return Array.from(paths);
};

const hydrateProcessEnv = () => {
  resolveEnvPaths().forEach(applyEnvFromFile);
};

hydrateProcessEnv();

module.exports = {
  hydrateProcessEnv,
};
