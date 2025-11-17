# Email Configuration Quick Reference

## 📧 Primary Email Address
**support@wathaci.com**

## 🔧 SMTP Settings

| Setting | Value |
|---------|-------|
| **Host** | mail.privateemail.com |
| **Port** | 465 |
| **Security** | SSL/TLS |
| **Username** | support@wathaci.com |
| **Password** | [In environment secrets] |
| **From Name** | Wathaci |

## 🌐 DNS Records (Copy-Paste)

### MX Record
```
Type: MX
Host: @
Priority: 10
Value: mail.privateemail.com
```

### SPF Record
```
Type: TXT
Host: @
Value: v=spf1 include:_spf.privateemail.com ~all
```

### DKIM Record
```
Type: TXT
Host: default._domainkey
Value: v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy3Mb9SuoMAr5pIztL+UCHzhb3fktj2Qf5NGgRBECmM9vAkgh9ZiutJYq2ShZBrw28PuuQlcWAqNOVB3Ku8TaELewfZf1fNI8ladYWVcJPkpUcvxM4QRqouVH6BNoaJU+vtIfXMCiUi1f608avzldEzt9A6SYJw+/3bf28NdeUyL/BLqNGPK0DDMnpQ6YMnfHy4qkB29GD2XmtSO/L00IIaJ3pKzXJMv5h626fBmSRDJwAWdl+i3NaXidxioLDWXDgJ0aYU888Nn+Foy2le7bTNm9ezOn5X19TDCzuSTWcy0Og8lE8uv+clZzy0ocB1/1KI2D4cOomls7OEAgYeXPowIDAQAB
```

### DMARC Record
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:support@wathaci.com; ruf=mailto:support@wathaci.com; fo=1
```

## ⚙️ Environment Variables

```bash
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_USER=support@wathaci.com
SMTP_PASSWORD=[your-password]
SMTP_FROM_EMAIL=support@wathaci.com
SMTP_FROM_NAME=Wathaci
SUPABASE_SMTP_ADMIN_EMAIL=support@wathaci.com
SUPABASE_SMTP_SENDER_NAME=Wathaci
```

## 🚀 Deployment Steps

1. ✅ Add environment variables to Vercel/Supabase
2. ✅ Configure SMTP in Supabase dashboard
3. ✅ Add DNS records in Namecheap
4. ⏰ Wait 24-48 hours for DNS propagation
5. ✅ Test email delivery
6. ✅ Verify SPF/DKIM/DMARC pass

## ✔️ Verification Commands

```bash
# Check MX
dig MX wathaci.com +short

# Check SPF
dig TXT wathaci.com +short | grep spf

# Check DKIM
dig TXT default._domainkey.wathaci.com +short

# Check DMARC
dig TXT _dmarc.wathaci.com +short
```

## 🔍 Online Verification Tools

- **MXToolbox:** https://mxtoolbox.com/
- **DKIM Validator:** https://dkimvalidator.com/
- **Mail Tester:** https://www.mail-tester.com/

## 📊 Success Criteria

- [ ] All emails from support@wathaci.com
- [ ] Emails delivered to inbox (not spam)
- [ ] SPF: PASS
- [ ] DKIM: PASS
- [ ] DMARC: PASS
- [ ] Mail-tester score: 8/10 or higher

## 📚 Documentation

- **Full Guide:** EMAIL_CONFIGURATION_GUIDE.md
- **DNS Guide:** DNS_SETUP_GUIDE.md
- **Testing Checklist:** EMAIL_READINESS_CHECKLIST.md
- **Deployment Summary:** EMAIL_DEPLOYMENT_SUMMARY.md

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sending | Check SMTP credentials in Supabase |
| Emails in spam | Verify DNS records, wait for propagation |
| Authentication fails | Check SPF/DKIM/DMARC records |
| Slow delivery | Check SMTP server status, rate limits |

## 📞 Support

- **Email:** support@wathaci.com
- **Help Center:** https://wathaci.com/help
- **PrivateEmail:** https://www.namecheap.com/support/

---

**Last Updated:** 2024-11-17
