# DNS Records Setup Guide for Wathaci Email

## Overview

This document provides exact DNS record configurations for wathaci.com email authentication and delivery. These records must be configured in Namecheap DNS management.

**Domain:** wathaci.com  
**DNS Provider:** Namecheap  
**Email Provider:** PrivateEmail (Namecheap)  
**Platform Email:** support@wathaci.com

---

## Prerequisites

Before starting:
- [ ] Access to Namecheap account for wathaci.com
- [ ] PrivateEmail account active and accessible
- [ ] DKIM public key obtained from PrivateEmail control panel
- [ ] 24-48 hours available for DNS propagation

---

## Complete DNS Record Configuration

### 1. MX Record (Mail Exchange)

**Purpose:** Routes incoming emails to PrivateEmail mail servers

| Field | Value |
|-------|-------|
| **Type** | MX |
| **Host** | @ |
| **Value** | mail.privateemail.com |
| **Priority** | 10 |
| **TTL** | Automatic (or 3600) |

**Configuration in Namecheap:**
1. Login to Namecheap → Domain List
2. Click "Manage" next to wathaci.com
3. Go to "Advanced DNS" tab
4. Click "Add New Record"
5. Select "MX Record" from dropdown
6. Enter values as shown above
7. Click "✓" (checkmark) to save

**Verification:**
```bash
dig MX wathaci.com
# Expected output: mail.privateemail.com with priority 10
```

---

### 2. SPF Record (Sender Policy Framework)

**Purpose:** Authorizes PrivateEmail servers to send emails on behalf of wathaci.com

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Host** | @ |
| **Value** | `v=spf1 include:_spf.privateemail.com ~all` |
| **TTL** | Automatic (or 3600) |

**SPF Value Explanation:**
- `v=spf1` → SPF version 1 (required)
- `include:_spf.privateemail.com` → Authorizes PrivateEmail's sending servers
- `~all` → Soft fail for unauthorized senders (recommended for initial setup)
  - Alternative: `-all` for hard fail (reject) - use after confirming everything works

**Configuration in Namecheap:**
1. In "Advanced DNS" tab
2. Click "Add New Record"
3. Select "TXT Record" from dropdown
4. Host: `@`
5. Value: `v=spf1 include:_spf.privateemail.com ~all`
6. Click "✓" to save

**Important Notes:**
- Only ONE SPF record per domain (multiple SPF records will break email)
- If you have an existing SPF record, UPDATE it instead of adding a new one
- To include multiple providers, add multiple `include:` statements in the same record:
  ```
  v=spf1 include:_spf.privateemail.com include:_spf.google.com ~all
  ```

**Verification:**
```bash
dig TXT wathaci.com | grep spf
# Expected output: "v=spf1 include:_spf.privateemail.com ~all"
```

**Online Verification:**
- https://mxtoolbox.com/spf.aspx
- Enter domain: wathaci.com
- Verify: Record found and valid

---

### 3. DKIM Record (DomainKeys Identified Mail)

**Purpose:** Cryptographically signs outgoing emails to prove authenticity

#### Step 1: Obtain DKIM Public Key from PrivateEmail

1. Login to PrivateEmail: https://privateemail.com
2. Navigate to email settings / domain settings
3. Look for "DKIM Configuration" or "Email Authentication"
4. Copy the DKIM public key value

#### Step 2: Configure DKIM Record

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Host** | default._domainkey |
| **Value** | `v=DKIM1;k=rsa;p=[YOUR_PUBLIC_KEY]` |
| **TTL** | Automatic (or 3600) |

**Current DKIM Key** (as documented in existing EMAIL_CONFIGURATION_GUIDE.md):

```
Type: TXT
Host: default._domainkey
Value: v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy3Mb9SuoMAr5pIztL+UCHzhb3fktj2Qf5NGgRBECmM9vAkgh9ZiutJYq2ShZBrw28PuuQlcWAqNOVB3Ku8TaELewfZf1fNI8ladYWVcJPkpUcvxM4QRqouVH6BNoaJU+vtIfXMCiUi1f608avzldEzt9A6SYJw+/3bf28NdeUyL/BLqNGPK0DDMnpQ6YMnfHy4qkB29GD2XmtSO/L00IIaJ3pKzXJMv5h626fBmSRDJwAWdl+i3NaXidxioLDWXDgJ0aYU888Nn+Foy2le7bTNm9ezOn5X19TDCzuSTWcy0Og8lE8uv+clZzy0ocB1/1KI2D4cOomls7OEAgYeXPowIDAQAB
TTL: Automatic
```

**⚠️ IMPORTANT:** Verify this key matches your current PrivateEmail DKIM configuration. If not, obtain the correct key from your PrivateEmail control panel.

**Configuration in Namecheap:**
1. In "Advanced DNS" tab
2. Click "Add New Record"
3. Select "TXT Record" from dropdown
4. Host: `default._domainkey`
5. Value: Full DKIM value starting with `v=DKIM1;k=rsa;p=...`
6. Click "✓" to save

**Notes:**
- The `default._domainkey` subdomain is standard for DKIM
- Some providers use custom selectors like `s1._domainkey` or `mail._domainkey`
- PrivateEmail typically uses `default._domainkey`
- The public key is safe to expose (it's PUBLIC by design)

**Verification:**
```bash
dig TXT default._domainkey.wathaci.com
# Expected output: "v=DKIM1;k=rsa;p=..." (your public key)
```

**Online Verification:**
1. Send test email to: https://dkimvalidator.com/
2. Check result: DKIM signature should validate
3. Alternative: https://www.appmaildev.com/en/dkim

---

### 4. DMARC Record (Domain-based Message Authentication)

**Purpose:** Defines policy for emails that fail SPF/DKIM authentication and provides reporting

| Field | Value |
|-------|-------|
| **Type** | TXT |
| **Host** | _dmarc |
| **Value** | `v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1` |
| **TTL** | Automatic (or 3600) |

**DMARC Value Explanation:**
- `v=DMARC1` → DMARC version 1 (required)
- `p=quarantine` → Policy: quarantine emails that fail authentication
  - `p=none` → Monitor only (recommended for initial setup)
  - `p=quarantine` → Move failures to spam/junk
  - `p=reject` → Reject failures outright (strictest)
- `rua=mailto:support@wathaci.com` → Send aggregate reports to this address
- `ruf=mailto:support@wathaci.com` → Send forensic (failure) reports to this address
- `fo=1` → Generate reports when any authentication mechanism fails

**Progressive DMARC Policy Recommendation:**

**Phase 1 (Week 1-2): Monitoring Only**
```
v=DMARC1; p=none; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1
```
- Monitor authentication results
- Review DMARC reports
- Identify and fix any issues

**Phase 2 (Week 3-4): Quarantine Failures**
```
v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1
```
- Failures go to spam/junk
- Continue monitoring reports
- Ensure no legitimate email is affected

**Phase 3 (Week 5+): Reject Failures (Optional)**
```
v=DMARC1; p=reject; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1
```
- Strictest policy
- Only implement if zero issues for 2+ weeks
- Provides maximum protection against spoofing

**Configuration in Namecheap:**
1. In "Advanced DNS" tab
2. Click "Add New Record"
3. Select "TXT Record" from dropdown
4. Host: `_dmarc`
5. Value: (choose appropriate policy from above)
6. Click "✓" to save

**Verification:**
```bash
dig TXT _dmarc.wathaci.com
# Expected output: "v=DMARC1; p=quarantine; ..."
```

**Online Verification:**
- https://dmarcian.com/
- Enter domain: wathaci.com
- Verify: DMARC record found and valid

---

## Complete DNS Records Summary Table

Copy-paste reference for Namecheap configuration:

| Type | Host | Value | Priority | TTL |
|------|------|-------|----------|-----|
| MX | @ | mail.privateemail.com | 10 | Auto |
| TXT | @ | v=spf1 include:_spf.privateemail.com ~all | - | Auto |
| TXT | default._domainkey | v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy3Mb9SuoMAr5pIztL+UCHzhb3fktj2Qf5NGgRBECmM9vAkgh9ZiutJYq2ShZBrw28PuuQlcWAqNOVB3Ku8TaELewfZf1fNI8ladYWVcJPkpUcvxM4QRqouVH6BNoaJU+vtIfXMCiUi1f608avzldEzt9A6SYJw+/3bf28NdeUyL/BLqNGPK0DDMnpQ6YMnfHy4qkB29GD2XmtSO/L00IIaJ3pKzXJMv5h626fBmSRDJwAWdl+i3NaXidxioLDWXDgJ0aYU888Nn+Foy2le7bTNm9ezOn5X19TDCzuSTWcy0Og8lE8uv+clZzy0ocB1/1KI2D4cOomls7OEAgYeXPowIDAQAB | - | Auto |
| TXT | _dmarc | v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1 | - | Auto |

**⚠️ IMPORTANT:** Verify the DKIM key matches your PrivateEmail configuration before adding.

---

## Step-by-Step Setup in Namecheap

### Complete Configuration Procedure

1. **Login to Namecheap**
   - URL: https://www.namecheap.com
   - Sign in with your account credentials

2. **Navigate to Domain Management**
   - Dashboard → Domain List
   - Find "wathaci.com" in the list
   - Click "Manage" button

3. **Access DNS Settings**
   - Click "Advanced DNS" tab at the top
   - You should see the DNS record management interface

4. **Add MX Record**
   - Click "Add New Record" button
   - Type: Select "MX Record"
   - Host: `@`
   - Value: `mail.privateemail.com`
   - Priority: `10`
   - TTL: Leave as "Automatic" (or set to 3600)
   - Click green checkmark (✓) to save

5. **Add SPF Record**
   - Click "Add New Record" button
   - Type: Select "TXT Record"
   - Host: `@`
   - Value: `v=spf1 include:_spf.privateemail.com ~all`
   - TTL: Leave as "Automatic"
   - Click green checkmark (✓) to save

6. **Add DKIM Record**
   - ⚠️ First: Verify your DKIM key from PrivateEmail control panel
   - Click "Add New Record" button
   - Type: Select "TXT Record"
   - Host: `default._domainkey`
   - Value: `v=DKIM1;k=rsa;p=[YOUR_PUBLIC_KEY]` (full key from above)
   - TTL: Leave as "Automatic"
   - Click green checkmark (✓) to save

7. **Add DMARC Record**
   - Click "Add New Record" button
   - Type: Select "TXT Record"
   - Host: `_dmarc`
   - Value: `v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1`
   - TTL: Leave as "Automatic"
   - Click green checkmark (✓) to save

8. **Save All Changes**
   - Click "Save All Changes" button at bottom (if present)
   - Confirm changes if prompted

9. **Wait for Propagation**
   - DNS changes can take 1-48 hours to propagate globally
   - Typical propagation time: 2-4 hours
   - You can proceed with other setup while waiting

---

## Verification Checklist

After adding all DNS records, verify each one:

### Immediate Verification (Right After Adding)

**In Namecheap Dashboard:**
- [ ] All 4 records visible in Advanced DNS tab
- [ ] No error messages or warnings
- [ ] Green checkmarks next to each record

### Propagation Check (After 1-2 Hours)

**Command Line Verification:**
```bash
# Check all records at once
echo "=== MX Record ===" && dig MX wathaci.com +short
echo "=== SPF Record ===" && dig TXT wathaci.com +short | grep spf
echo "=== DKIM Record ===" && dig TXT default._domainkey.wathaci.com +short
echo "=== DMARC Record ===" && dig TXT _dmarc.wathaci.com +short
```

**Expected Results:**
- MX: `10 mail.privateemail.com.`
- SPF: `"v=spf1 include:_spf.privateemail.com ~all"`
- DKIM: `"v=DKIM1;k=rsa;p=..."`
- DMARC: `"v=DMARC1; p=quarantine; ..."`

### Online Tool Verification

1. **MXToolbox - Comprehensive Check**
   - URL: https://mxtoolbox.com/
   - Enter: wathaci.com
   - Check: All tests should be green or OK
   - Verify: No blacklist issues

2. **SPF Validation**
   - URL: https://mxtoolbox.com/spf.aspx
   - Enter: wathaci.com
   - Result: SPF record valid
   - Authorization: PrivateEmail servers authorized

3. **DKIM Validation**
   - URL: https://dkimvalidator.com/
   - Send test email to provided address
   - Result: DKIM signature validates
   - Selector: default._domainkey.wathaci.com

4. **DMARC Validation**
   - URL: https://dmarcian.com/
   - Enter: wathaci.com
   - Result: DMARC policy found and valid
   - Policy: Quarantine (or as configured)

5. **Global DNS Propagation**
   - URL: https://dnschecker.org/
   - Select record type: TXT, MX
   - Enter: wathaci.com
   - Verify: Green checkmarks worldwide

### Verification Checklist

- [ ] MX record resolves correctly (dig command)
- [ ] SPF record found and valid (MXToolbox)
- [ ] DKIM record found and valid (dig command)
- [ ] DMARC record found and valid (DMARCian)
- [ ] All records propagated globally (DNSChecker)
- [ ] No errors or warnings on MXToolbox
- [ ] No blacklist issues detected
- [ ] DNS propagation complete (24-48 hours passed)

---

## Troubleshooting

### Issue: Record Not Propagating

**Symptoms:**
- `dig` command returns no results
- Online tools can't find record
- Hours have passed since adding record

**Solutions:**
1. **Verify Record in Namecheap:**
   - Login and check record is still there
   - Check for typos in Host or Value
   - Ensure record is saved (green checkmark)

2. **Check TTL:**
   - Lower TTL means faster propagation
   - Default "Automatic" should be 1800-3600 seconds
   - Wait at least 1 hour after adding

3. **DNS Cache:**
   - Your local DNS may be cached
   - Flush DNS cache:
     ```bash
     # macOS
     sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
     
     # Windows
     ipconfig /flushdns
     
     # Linux
     sudo systemd-resolve --flush-caches
     ```

4. **Use Different DNS Server:**
   - Query Google DNS directly:
     ```bash
     dig @8.8.8.8 TXT wathaci.com
     dig @8.8.8.8 MX wathaci.com
     ```

### Issue: Multiple SPF Records

**Symptoms:**
- SPF validation fails
- Error: "Multiple SPF records found"
- Email authentication fails

**Solution:**
1. Check for duplicate SPF records:
   ```bash
   dig TXT wathaci.com | grep spf
   ```
2. If you see multiple SPF records, **DELETE** all but one
3. Combine multiple authorizations into single SPF record:
   ```
   v=spf1 include:_spf.privateemail.com include:_spf.google.com ~all
   ```
4. Save and wait for propagation

### Issue: DKIM Signature Fails

**Symptoms:**
- Email headers show `dkim=fail`
- DKIM validator reports invalid signature
- Emails go to spam

**Solutions:**
1. **Verify DKIM Key:**
   - Login to PrivateEmail control panel
   - Find DKIM settings
   - Compare public key with DNS record
   - Update if mismatch

2. **Check DKIM Selector:**
   - PrivateEmail uses `default._domainkey`
   - Verify this matches your DNS record
   - Some providers use different selectors

3. **Wait for Propagation:**
   - DKIM can take longer to propagate (up to 48 hours)
   - Check with: `dig TXT default._domainkey.wathaci.com`

4. **Re-send Test Email:**
   - After fixing, send new test email
   - Check headers again
   - Should show `dkim=pass`

### Issue: DMARC Not Working

**Symptoms:**
- DMARC reports not received
- DMARC validation fails
- Email still goes to spam despite SPF/DKIM pass

**Solutions:**
1. **Verify DMARC Record:**
   ```bash
   dig TXT _dmarc.wathaci.com
   ```
   - Should return record starting with `v=DMARC1`

2. **Check Report Mailbox:**
   - Ensure support@wathaci.com exists and accessible
   - Check spam folder for DMARC reports
   - Reports sent daily/weekly, not immediately

3. **Verify SPF + DKIM:**
   - DMARC requires at least one of SPF or DKIM to pass
   - Check both are configured correctly
   - Test with: https://www.mail-tester.com/

4. **Wait for Reports:**
   - DMARC aggregate reports sent daily
   - May take 24-48 hours to receive first report
   - Forensic reports sent on failures only

---

## Post-Configuration Steps

After all DNS records are added and verified:

1. **Update Documentation:**
   - [ ] Mark DNS setup as complete in checklist
   - [ ] Document current DMARC policy phase
   - [ ] Schedule review for policy progression

2. **Configure Supabase SMTP:**
   - [ ] Follow Supabase SMTP configuration guide
   - [ ] Test email sending from Supabase
   - [ ] Verify emails authenticated (SPF/DKIM/DMARC pass)

3. **Run Email Tests:**
   - [ ] Send test emails to multiple providers
   - [ ] Verify inbox delivery (not spam)
   - [ ] Check authentication in email headers

4. **Monitor DMARC Reports:**
   - [ ] Set up system to receive DMARC reports
   - [ ] Review reports weekly for first month
   - [ ] Identify any authentication issues

5. **Plan Policy Progression:**
   - [ ] Week 1-2: Monitor with `p=none`
   - [ ] Week 3-4: Quarantine with `p=quarantine`
   - [ ] Week 5+: Consider `p=reject` if no issues

---

## Security Best Practices

### DKIM Private Key Security

⚠️ **CRITICAL:** The DKIM **private key** must be kept secure
- Private key is stored by PrivateEmail (not exposed to you)
- Never share private key if you have access to it
- Only the public key is added to DNS (safe to expose)
- If private key compromised, regenerate DKIM keys immediately

### DNS Security

✅ **Recommendations:**
- Enable two-factor authentication (2FA) on Namecheap account
- Use strong, unique password for Namecheap
- Limit access to Namecheap account to authorized team members only
- Enable domain lock to prevent unauthorized transfers
- Monitor DNS records regularly for unauthorized changes
- Set up alerts for DNS changes (if Namecheap supports)

### Email Security

✅ **Ongoing Monitoring:**
- Review DMARC reports regularly (weekly initially)
- Monitor for SPF/DKIM authentication failures
- Watch for suspicious sending patterns
- Respond promptly to authentication issues
- Keep PrivateEmail account secure (strong password, 2FA)

---

## DMARC Report Review Guide

### Understanding DMARC Reports

DMARC aggregate reports are XML files sent to your reporting address (support@wathaci.com) daily. They contain:
- Source IPs that sent email claiming to be from wathaci.com
- Number of messages sent
- SPF and DKIM authentication results
- Disposition (what recipient did with email)

### Interpreting Reports

**Look For:**
1. **Legitimate Sources:**
   - PrivateEmail servers (should have SPF pass, DKIM pass)
   - Your configured servers

2. **Failed Authentication:**
   - Unknown IPs sending email as wathaci.com
   - SPF failures from unexpected sources
   - DKIM failures

3. **Action Needed:**
   - If legitimate server failing: Fix SPF/DKIM configuration
   - If unauthorized sender: Investigate potential spoofing
   - High failure rate: Review and adjust policies

### DMARC Report Tools

**Recommended Services (Optional):**
- Postmark DMARC Digests (free, easy to read)
- DMARCian (paid, comprehensive analysis)
- Valimail (paid, enterprise solution)
- URI Ports DMARC Tools (free, basic analysis)

**Or Manual Review:**
- Parse XML files
- Use spreadsheet for tracking
- Focus on high-volume sources
- Prioritize authentication failures

---

## Quick Reference: DNS Commands

```bash
# Check all DNS records
dig MX wathaci.com
dig TXT wathaci.com
dig TXT default._domainkey.wathaci.com
dig TXT _dmarc.wathaci.com

# Check with specific DNS server (Google DNS)
dig @8.8.8.8 MX wathaci.com
dig @8.8.8.8 TXT wathaci.com

# Short output
dig MX wathaci.com +short
dig TXT wathaci.com +short | grep spf

# Check DNS propagation globally
# Use: https://dnschecker.org/

# Check email authentication
# Send test to: https://www.mail-tester.com/
# DKIM validator: https://dkimvalidator.com/
```

---

## Support Resources

**Namecheap Support:**
- Knowledge Base: https://www.namecheap.com/support/knowledgebase/
- Support Ticket: Submit via Namecheap account
- Live Chat: Available during business hours

**PrivateEmail Support:**
- Setup Guide: https://www.namecheap.com/support/knowledgebase/subcategory/68/privateemail/
- DKIM Setup: https://www.namecheap.com/support/knowledgebase/article.aspx/9976/2176/how-to-set-up-dkim-for-privateemail

**Email Authentication Resources:**
- SPF: http://www.openspf.org/
- DKIM: https://dkim.org/
- DMARC: https://dmarc.org/

**Testing Tools:**
- MXToolbox: https://mxtoolbox.com/
- Mail-Tester: https://www.mail-tester.com/
- DKIM Validator: https://dkimvalidator.com/
- DMARC Inspector: https://dmarcian.com/

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-17  
**Next Review:** After DNS propagation complete  
**Owner:** DevOps Team  
**Contact:** support@wathaci.com
