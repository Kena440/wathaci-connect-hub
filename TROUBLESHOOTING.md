# Troubleshooting Guide

## NPM Installation Issues

### 403 Forbidden Error

If you encounter a `403 Forbidden` error when running `npm install`, try these solutions:

#### 1. Clear npm cache
```bash
npm cache clean --force
```

#### 2. Check npm registry
```bash
npm config get registry
```
Ensure it's set to the official registry:
```bash
npm config set registry https://registry.npmjs.org/
```

#### 3. Check authentication status
```bash
npm whoami
```
For public packages, authentication shouldn't be required.

#### 4. Try alternative installation methods
```bash
# Clear cache and reinstall
npm cache clean --force && npm install

# Use specific registry
npm install --registry https://registry.npmjs.org/

# Force refresh
npm install --force
```

#### 5. Network/Proxy issues
If behind a corporate firewall, configure proxy settings:
```bash
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
```

#### 6. Package-specific installation
If only specific packages fail, try installing them individually:
```bash
npm install react react-dom
npm install i18next react-i18next
```

### Common Package Dependencies

This project requires the following core packages:
- `react@^18.3.1`
- `react-dom@^18.3.1`
- `i18next@^25.4.2` (for internationalization)
- `react-i18next@^15.7.3` (React bindings for i18next)

### Build and Development

After successful package installation:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Run linting:**
   ```bash
   npm run lint
   ```

3. **Run tests:**
   ```bash
   npm run test:jest
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### Additional Notes

- The 403 error is often temporary and may resolve after waiting a few minutes
- Check npm service status at https://status.npmjs.org/ if issues persist
- Consider using `yarn` as an alternative package manager if npm continues to fail