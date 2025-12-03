-- Seed additional WATHACI knowledge entries (SME profile, investor onboarding, SME payments, SME matching, professional profiles, admin support)
-- This uses ON CONFLICT to keep the migration idempotent while allowing updates to existing slugs.

insert into public.wathaci_knowledge (slug, title, category, audience, content, tags)
values
-- SME profile: how to write a strong one
(
  'profile-sme-what-good-looks-like',
  'What a strong SME profile looks like on WATHACI',
  'profile',
  'sme',
  $$## Summary

A strong SME profile on WATHACI makes it easy for investors, donors, government programmes and professionals to quickly understand who you are, what you do and what you need.

## When this applies

- You have created an SME account and are filling out your profile.
- You want to improve your existing SME profile to get better matches.
- You are not getting enough interest or views on the platform.

## Key details

A strong SME profile usually includes:

- Clear business identity:
  - Registered business name (if applicable).
  - Location (country, city/region).
  - Sector (e.g. agriculture, manufacturing, services, digital, green, etc.).
- Simple explanation of what you do:
  - Your main products or services.
  - Who your customers are.
  - The problem you solve.
- Basic traction:
  - Years in operation.
  - Approximate size (staff or revenue band) if comfortable sharing.
  - Any notable achievements (key clients, awards, impact).
- Current needs:
  - Capital (with rough range).
  - Grants or technical assistance.
  - Markets or distribution partners.
  - Professional support (e.g. legal, finance, marketing, tech).

## Step-by-step guidance for users

1. Start with a simple, honest description of your business in 3–5 sentences.
2. Specify your sector and location clearly so the right partners can find you.
3. Add 2–3 key achievements that prove traction (e.g. “We supply 50+ shops”, “We grew revenue by 30% year-on-year”, “We serve 300+ smallholder farmers”).
4. Clearly list your current needs using simple language (“We are looking for a K X–Y investment”, “We need a marketing advisor to help us reach new markets”).
5. Review your profile from the perspective of an investor or partner seeing it for the first time – would they understand your business in one minute?

## What to do if problems persist

- If the profile form is not saving, try:
  - Checking your internet connection.
  - Breaking long text into shorter sections.
  - Logging out and back in, then trying again.
- If you are still stuck on what to write, contact support@wathaci.com with:
  - Your account email.
  - A short description of your business.
  - Your main questions about improving your profile.
- Do not share passwords or any confidential information in your email.$$,
  array['profile', 'sme', 'what-good-looks-like', 'traction']
),

-- Investor signup and profile
(
  'signup-investor-onboarding-basics',
  'How investor sign-up and onboarding works',
  'signup',
  'investor',
  $$## Summary

Investor accounts on WATHACI are designed to help you describe your investment focus and discover SMEs that fit your strategy.

## When this applies

- You are signing up as an investor or investment fund.
- You want to complete your investor profile to receive suitable SME matches.
- You want to refine your thesis and filters on the platform.

## Key details

An investor profile typically captures:

- Who you are:
  - Fund or organisation name.
  - Type of investor (e.g. VC, PE, family office, impact investor, angel network).
  - Headquarters and geographies where you invest.
- Investment focus:
  - Sectors (e.g. agriculture, digital, health, manufacturing).
  - Ticket sizes (minimum and maximum investment per deal).
  - Instruments (equity, debt, quasi-equity, blended finance, etc.).
  - Stage focus (e.g. seed, early growth, expansion).
- Non-financial support:
  - Whether you provide technical assistance, mentoring or strategic support in addition to capital.

## Step-by-step guidance for users

1. Create an investor account and complete basic organisation details.
2. Specify your preferred sectors and geographies as clearly as possible.
3. Define realistic ticket-size ranges and instruments to avoid mismatches.
4. Use the profile description to briefly explain your thesis and what you look for in SMEs.
5. Update your profile as your strategy evolves so that matching remains accurate.

## What to do if problems persist

- If the sign-up form errors or your investor profile does not save:
  - Take note of any visible error messages.
  - Capture a screenshot if possible.
- Email support@wathaci.com with:
  - Your name and organisation.
  - The email address used for the account.
  - A brief description of the issue and any error messages.
  - A screenshot if available.
- Do not include passwords or internal system links in your email.$$,
  array['signup', 'investor', 'onboarding', 'thesis']
),

-- SME payments and typical issues
(
  'payments-sme-typical-issues',
  'Typical SME payment issues and how to handle them',
  'payments',
  'sme',
  $$## Summary

SME payments on WATHACI are processed via integrated gateways (such as Lenco or card processors). Most issues are related to bank/card checks, network reliability or delayed confirmations.

## When this applies

- You are an SME trying to pay for a plan or service.
- Your payment is failing or remains pending.
- You are unsure if your payment went through.

## Key details

Common payment outcomes:

- **Succeeded:** The gateway confirmed the payment and WATHACI should update your access shortly.
- **Pending:** The payment is still being confirmed by the gateway or the webhook notification has not yet been processed.
- **Failed:** The payment attempt did not go through (e.g. card declined, insufficient funds).
- **Expired/Cancelled:** The payment session timed out or was cancelled.

Typical causes:

- Incorrect card details or expired card.
- Insufficient funds or bank restrictions.
- Temporary network issues or gateway timeouts.
- Webhook delay between the gateway and WATHACI.

## Step-by-step guidance for users

1. If your payment appears as failed:
   - Double-check card details and available funds.
   - Try again or use a different card or payment method if available.
2. If your payment appears as pending:
   - Wait a few minutes and refresh your WATHACI session.
   - Check your email or SMS for any payment confirmation from your bank or the gateway.
3. If you are charged but WATHACI still shows no access:
   - Take note of the payment reference and approximate time.
   - Log out and log back in to see if access updates.
4. If the situation does not resolve:
   - Email support@wathaci.com with:
     - Your full name and account email.
     - The plan or service you tried to pay for.
     - The payment reference and approximate date/time.
     - A screenshot of any bank or gateway confirmation.

## What to do if problems persist

- Do not attempt multiple payments too quickly without checking your bank statements.
- When emailing support, never include full card numbers or PINs—only references and screenshots that mask sensitive details.$$,
  array['payments', 'sme', 'errors', 'lenco']
),

-- SME matching improvements
(
  'matching-sme-how-to-improve',
  'How SMEs can improve their matching results',
  'matching',
  'sme',
  $$## Summary

Improving your SME profile and clarity around your needs helps WATHACI suggest better matches with investors, donors, programmes and professionals.

## When this applies

- You are an SME and not seeing enough relevant matches.
- You want higher-quality engagements from the matches you receive.
- You are updating your profile to align with a new strategy.

## Key details

Matching on WATHACI typically considers:

- Sector and subsector.
- Geography (country and possibly region).
- Stage and approximate size of the business.
- Capital and support needs (range and type).
- Thematic focus (e.g. green, digital, gender, youth).

## Step-by-step guidance for users

1. Review your sector and subsector tags and choose the most accurate ones.
2. Ensure your location information is correct and specific enough.
3. Add a clear description of your current needs (e.g. “We seek $X–Y in growth capital for working capital and equipment”).
4. Highlight any traction or impact that aligns with common themes (e.g. climate-smart, women-led, youth employment).
5. Keep your profile up to date as your business grows or your strategy changes.

## What to do if problems persist

- If you still feel your matches are off, document examples of mismatched connections.
- Email support@wathaci.com with:
  - Your account email.
  - A short description of your business and target partners.
  - 2–3 examples of matches that felt off and why.
- This feedback can help refine matching logic over time.$$,
  array['matching', 'sme', 'improve', 'profile']
),

-- Professional / freelancer profile guidance
(
  'profile-professional-what-good-looks-like',
  'How professionals and freelancers should structure their profiles',
  'profile',
  'professional',
  $$## Summary

A strong professional or freelancer profile on WATHACI makes it easy for SMEs and ecosystem actors to see your skills, experience and fit.

## When this applies

- You are a professional or freelancer signing up.
- You want SMEs to contact you for advisory, consulting or services.
- You want to differentiate yourself from generic profiles.

## Key details

A good professional profile usually includes:

- Clear skills and service areas (e.g. financial modelling, digital marketing, legal advisory).
- Years of experience and types of clients served.
- Sectors you know well (e.g. agriculture, retail, manufacturing, tech).
- 2–3 notable projects or achievements (without disclosing confidential client details).
- Engagement preferences (remote/on-site, short-term/long-term).

## Step-by-step guidance for users

1. Start with a short summary of your expertise in 2–3 sentences.
2. List your main service areas as bullet points for quick scanning.
3. Add 2–3 project examples that show your impact (e.g. “Helped SME increase online sales by 40% over six months”).
4. Specify sectors and regions you understand well.
5. Indicate your availability (part-time/full-time/occasional) and preferred types of engagements.

## What to do if problems persist

- If your profile does not save, check required fields and your connection.
- If you are not receiving enquiries, consider:
  - refining your description to be more concrete,
  - adding clearer examples of results you’ve delivered.
- For technical issues, email support@wathaci.com with your account details and screenshots.$$,
  array['profile', 'professional', 'freelancer', 'services']
),

-- Admin / support guidance (sanitised)
(
  'support-admin-triage-basics',
  'How admins should triage WATHACI support tickets (high-level)',
  'support',
  'admin',
  $$## Summary

Platform admins and support staff need a simple way to triage WATHACI tickets and prioritise issues.

## When this applies

- You are a WATHACI admin or support team member.
- You are reviewing issues from users (sign-up, sign-in, profiles, payments, matching).

## Key details

Typical categories:

- **Access issues:** sign-up, sign-in, verification emails, locked accounts.
- **Profile issues:** forms not saving, missing fields, validation problems.
- **Payment issues:** failed charges, delayed confirmations, mismatched statuses.
- **Matching issues:** irrelevant recommendations, missing obvious matches.
- **General questions:** how the platform works, plan details, etc.

## Step-by-step guidance for admins

1. Determine the category of the issue based on the user’s description.
2. Check whether there is a known incident (e.g. email provider issues, gateway downtime).
3. For access issues:
   - Verify the account state in the admin console or database.
   - Confirm whether emails are being sent successfully.
4. For payment issues:
   - Compare the user’s payment reference and timestamp with gateway logs.
   - Check the internal payment/transaction records.
5. For persistent bugs:
   - Capture exact error messages and reproduction steps.
   - Open or update a ticket in the internal issue tracker with full details.

## What to do if problems persist

- Escalate recurring or severe issues to the technical team with:
  - User details (email, role).
  - Clear timestamps and references.
  - Screenshots and logs where available.
- Never include raw credentials, API keys or secrets in tickets or email communications.$$,
  array['support', 'admin', 'triage', 'tickets']
)
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  audience = excluded.audience,
  content = excluded.content,
  tags = excluded.tags,
  updated_at = now();
