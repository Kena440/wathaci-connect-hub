# Using Supabase CLI in CI/CD

This guide explains how to use the Supabase CLI in automated CI/CD environments like GitHub Actions, GitLab CI, or other platforms.

## Prerequisites

1. **Generate a Supabase Access Token**
   - Visit: https://supabase.com/dashboard/account/tokens
   - Generate a new token with appropriate permissions
   - Store it securely

2. **Add Secrets to Your CI/CD Platform**
   - Add `SUPABASE_ACCESS_TOKEN` as a secret/environment variable
   - Add `SUPABASE_DB_PASSWORD` (from your .env file)
   - Add `SUPABASE_PROJECT_REF` (value: `YOUR_PROJECT_REF`)

> Replace `YOUR_PROJECT_REF` with the actual Supabase project reference shown in your dashboard URL.

## GitHub Actions Example

Create a workflow file at `.github/workflows/supabase-deploy.yml`:

```yaml
name: Deploy to Supabase

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Supabase CLI
        run: |
          cd /tmp
          curl -LO https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
          tar -xzf supabase_linux_amd64.tar.gz
          sudo mv supabase /usr/local/bin/
          supabase --version
      
      - name: Link Supabase Project
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        run: |
          supabase link --project-ref YOUR_PROJECT_REF --password "$SUPABASE_DB_PASSWORD"
      
      - name: Deploy Edge Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: |
          supabase functions deploy lenco-webhook
      
      - name: Run Database Migrations (if any)
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: |
          # Only run if there are migrations
          if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations)" ]; then
            supabase db push
          else
            echo "No migrations to run"
          fi
```

## GitLab CI Example

Create a `.gitlab-ci.yml` file:

```yaml
stages:
  - deploy

deploy:supabase:
  stage: deploy
  image: ubuntu:latest
  only:
    - main
  before_script:
    - apt-get update && apt-get install -y curl
    - cd /tmp
    - curl -LO https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
    - tar -xzf supabase_linux_amd64.tar.gz
    - mv supabase /usr/local/bin/
    - supabase --version
  script:
    - cd $CI_PROJECT_DIR
    - supabase link --project-ref YOUR_PROJECT_REF --password "$SUPABASE_DB_PASSWORD"
    - supabase functions deploy lenco-webhook
  variables:
    SUPABASE_ACCESS_TOKEN: $SUPABASE_ACCESS_TOKEN
    SUPABASE_DB_PASSWORD: $SUPABASE_DB_PASSWORD
```

## CircleCI Example

Create a `.circleci/config.yml` file:

```yaml
version: 2.1

jobs:
  deploy:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      
      - run:
          name: Install Supabase CLI
          command: |
            cd /tmp
            curl -LO https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
            tar -xzf supabase_linux_amd64.tar.gz
            sudo mv supabase /usr/local/bin/
            supabase --version
      
      - run:
          name: Link and Deploy
          command: |
            supabase link --project-ref YOUR_PROJECT_REF --password "$SUPABASE_DB_PASSWORD"
            supabase functions deploy lenco-webhook

workflows:
  deploy:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

## Docker Example

If you're using Docker for CI/CD:

```dockerfile
FROM ubuntu:latest

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Install Supabase CLI
RUN cd /tmp && \
    curl -LO https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz && \
    tar -xzf supabase_linux_amd64.tar.gz && \
    mv supabase /usr/local/bin/ && \
    rm supabase_linux_amd64.tar.gz

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Set environment variables (these should be passed at runtime)
ENV SUPABASE_ACCESS_TOKEN=""
ENV SUPABASE_DB_PASSWORD=""

# Link and deploy
CMD ["sh", "-c", "supabase link --project-ref YOUR_PROJECT_REF --password $SUPABASE_DB_PASSWORD && supabase functions deploy"]
```

## Environment Variables

The following environment variables are required for CI/CD:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_ACCESS_TOKEN` | Access token from Supabase dashboard | Yes |
| `SUPABASE_DB_PASSWORD` | Database password | Yes (for link) |
| `SUPABASE_PROJECT_REF` | Project reference (YOUR_PROJECT_REF) | Yes |

## Common CI/CD Tasks

### Deploy Edge Functions Only

```bash
supabase functions deploy function-name
```

### Deploy All Edge Functions

```bash
supabase functions deploy
```

### Run Database Migrations

```bash
supabase db push
```

### Verify Deployment

```bash
supabase functions list
supabase status
```

### Pull Remote Changes

```bash
supabase db pull
```

## Security Best Practices

1. **Never commit tokens**: Always use secrets/environment variables
2. **Rotate tokens regularly**: Generate new tokens periodically
3. **Use minimal permissions**: Create tokens with only required permissions
4. **Audit token usage**: Monitor access logs in Supabase dashboard
5. **Separate tokens per environment**: Use different tokens for dev/staging/prod

## Troubleshooting

### "Access token not provided"

Ensure `SUPABASE_ACCESS_TOKEN` is set:
```bash
export SUPABASE_ACCESS_TOKEN="your_token"
```

### "Failed to link project"

Check that:
- Access token is valid
- Database password is correct
- Project reference is correct
- Network connectivity is available

### "Function deployment failed"

Verify:
- Function code is valid
- Function name matches directory name
- All dependencies are included

## Migration Strategy

If you're migrating from manual deployment:

1. **Audit current state**: Document all manual deployments
2. **Test in dev**: Run CI/CD pipeline in a test environment first
3. **Gradual rollout**: Deploy non-critical functions first
4. **Monitor closely**: Watch logs and metrics after deployment
5. **Rollback plan**: Have a rollback strategy ready

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [CI/CD with Supabase](https://supabase.com/docs/guides/cli/cicd-workflow)
- [Edge Functions Deployment](https://supabase.com/docs/guides/functions/deploy)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For project-specific issues:
- Check [SUPABASE_CLI_SETUP.md](./SUPABASE_CLI_SETUP.md)
- Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Contact the development team
