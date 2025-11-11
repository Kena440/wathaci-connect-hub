# WATHACI CONNECT - Production Launch Checklist

## Overview

This checklist must be completed and signed off before WATHACI CONNECT goes live. All items must be marked as complete, with appropriate approvals and dates recorded.

**Application**: WATHACI CONNECT v1.0  
**Target Launch Date**: TBD  
**Last Updated**: 2025-11-11

---

## 1. Management Approvals

All management approvals must be obtained before proceeding with production deployment.

### Executive Sign-Offs

- [ ] **Product Owner Sign-Off**
  - Name: ___________________________
  - Date: ___________________________
  - Signature: ______________________
  - Notes: Confirms product requirements met and application ready for users

- [ ] **Executive Sponsor Sign-Off**
  - Name: ___________________________
  - Date: ___________________________
  - Signature: ______________________
  - Notes: Authorizes production deployment and resource allocation

- [ ] **Final Management Authorization**
  - Name: ___________________________
  - Date: ___________________________
  - Signature: ______________________
  - Notes: Final go/no-go decision for production launch

---

## 2. Configuration Approvals

All production configuration must be reviewed and approved before deployment.

### 2.1 API Configuration

- [ ] **VITE_API_BASE_URL Set to Production**
  - Old Value (Staging/Dev): `http://localhost:3000`
  - New Value (Production): `https://api.wathaci.com` *(or your production URL)*
  - Approved By: ___________________________
  - Date: ___________________________
  - Verified By: ___________________________
  - Date: ___________________________

### 2.2 Supabase Configuration

- [ ] **Supabase URL Validated**
  - Environment Variable: `VITE_SUPABASE_URL`
  - Value: `https://nrjcbdrzaxqvomeogptf.supabase.co`
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Supabase Anon Key Validated**
  - Environment Variable: `VITE_SUPABASE_ANON_KEY`
  - Key Format: JWT token (starts with `eyJ`)
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Supabase Service Role Key Secured**
  - Environment Variable: `SUPABASE_SERVICE_ROLE_KEY`
  - Stored in: Secure environment variables only (not in code)
  - Verified By: ___________________________
  - Date: ___________________________

### 2.3 Lenco Payment Gateway Configuration

- [ ] **Live Lenco API URL Configured**
  - Environment Variable: `VITE_LENCO_API_URL`
  - Value: `https://api.lenco.co/access/v2`
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Live Lenco Public Key Validated**
  - Environment Variable: `VITE_LENCO_PUBLIC_KEY`
  - Key Format: `pub-[64-char-hex]` or `pk_live_[string]`
  - Test Mode Keys Removed: Yes / No
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Live Lenco Secret Key Secured**
  - Environment Variable: `LENCO_SECRET_KEY`
  - Key Format: `[64-char-hex]` or `sk_live_[string]`
  - Stored Securely: Yes / No
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Lenco Webhook URL Configured**
  - Environment Variable: `VITE_LENCO_WEBHOOK_URL`
  - Value: `https://[supabase-project].supabase.co/functions/v1/lenco-payments-validator`
  - Webhook Registered in Lenco Dashboard: Yes / No
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Lenco Webhook Secret Secured**
  - Environment Variable: `LENCO_WEBHOOK_SECRET`
  - Stored Securely: Yes / No
  - Verified By: ___________________________
  - Date: ___________________________

### 2.4 Production Environment Flag

- [ ] **Production Environment Confirmed**
  - Environment Variable: `VITE_APP_ENV`
  - Value: `production`
  - Vite MODE: `production`
  - Verified By: ___________________________
  - Date: ___________________________

### 2.5 Payment Configuration

- [ ] **Payment Currency Configured**
  - Environment Variable: `VITE_PAYMENT_CURRENCY`
  - Value: `ZMW` (or appropriate currency)
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Payment Country Configured**
  - Environment Variable: `VITE_PAYMENT_COUNTRY`
  - Value: `ZM` (or appropriate country)
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Payment Limits Configured**
  - Min Amount (`VITE_MIN_PAYMENT_AMOUNT`): ___________
  - Max Amount (`VITE_MAX_PAYMENT_AMOUNT`): ___________
  - Platform Fee (`VITE_PLATFORM_FEE_PERCENTAGE`): ___________
  - Verified By: ___________________________
  - Date: ___________________________

---

## 3. Pre-Launch Testing

All testing must be completed successfully before production deployment.

### 3.1 Build Verification

- [ ] **Release Candidate Build Successful**
  - Command: `npm run build`
  - Build Status: Success / Failed
  - Build Artifacts Generated: Yes / No
  - Build Output Size: ___________ MB
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Preview Mode Verified**
  - Command: `npm run preview`
  - Preview URL: `http://localhost:4173`
  - Application Loads: Yes / No
  - No Console Errors: Yes / No
  - Tested By: ___________________________
  - Date: ___________________________

### 3.2 Manual Authentication Smoke Tests

Reference: [PRE_LAUNCH_MANUAL_SMOKE_TESTS.md](../../PRE_LAUNCH_MANUAL_SMOKE_TESTS.md)

- [ ] **Sign-Up Flow Tested**
  - New user registration works
  - Profile auto-creation works
  - Email confirmation sent
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **OTP Sign-In Flow Tested**
  - OTP email delivery (< 30 seconds)
  - OTP verification works
  - Session establishment works
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Whitespace Handling Tested**
  - Email trimming works
  - Password preserves whitespace
  - Copy-paste issues prevented
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Backend Failure Scenarios Tested**
  - Graceful degradation verified
  - User-friendly error messages shown
  - Auth still works when backend down
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Email Confirmation Flow Tested**
  - Confirmation link generated
  - Link works correctly
  - User can access app after confirmation
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Profile Creation Verified**
  - Sign-up triggers profile creation
  - Profile data persists correctly
  - No blocking errors in console
  - Database triggers working
  - Tested By: ___________________________
  - Date: ___________________________

### 3.3 Payment Smoke Tests

- [ ] **Card Payment Flow Tested**
  - Test card: `5123450000000008` (Mastercard)
  - Payment processes successfully
  - Webhook received and logged
  - Transaction recorded in database
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Mobile Money Flow Tested**
  - Valid MSISDN tested
  - OTP sent to mobile number
  - Payment completes successfully
  - Webhook received and logged
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Payment Error Handling Tested**
  - Invalid card rejected
  - Insufficient funds handled
  - Network errors handled gracefully
  - Tested By: ___________________________
  - Date: ___________________________

### 3.4 Cross-Browser Testing

- [ ] **Chrome/Edge (Chromium) Tested**
  - Version: ___________
  - All features work: Yes / No
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Firefox Tested**
  - Version: ___________
  - All features work: Yes / No
  - Tested By: ___________________________
  - Date: ___________________________

- [ ] **Safari (if applicable) Tested**
  - Version: ___________
  - All features work: Yes / No
  - Tested By: ___________________________
  - Date: ___________________________

### 3.5 Mobile Responsiveness

- [ ] **Mobile View Tested**
  - Device/Emulator: ___________
  - Layout responsive: Yes / No
  - Touch interactions work: Yes / No
  - Tested By: ___________________________
  - Date: ___________________________

---

## 4. Security & Compliance

- [ ] **CodeQL Security Scan Passed**
  - No high/critical vulnerabilities
  - Scan Date: ___________________________
  - Reviewed By: ___________________________

- [ ] **Environment Variables Secured**
  - No secrets in source code
  - All secrets in environment variables
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **HTTPS/SSL Certificate Valid**
  - Certificate Issuer: ___________
  - Expiration Date: ___________
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **CORS Configuration Reviewed**
  - Allowed origins configured
  - No wildcard (*) in production
  - Verified By: ___________________________
  - Date: ___________________________

---

## 5. Database & Infrastructure

- [ ] **Database Schema Applied**
  - All migrations executed
  - Triggers active
  - RLS policies enabled
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Database Backup Configured**
  - Automated backups enabled
  - Backup frequency: ___________
  - Retention period: ___________
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Edge Functions Deployed**
  - Webhook handler deployed
  - Functions responding correctly
  - Secrets configured in Supabase
  - Verified By: ___________________________
  - Date: ___________________________

---

## 6. Monitoring & Operations

### 6.1 Day-0 Monitoring (First 24 Hours)

- [ ] **Monitoring Started**
  - Start Date/Time: ___________________________
  - Monitoring By: ___________________________

- [ ] **Error Tracking Active**
  - Error logging configured
  - Alerts configured
  - Responsible Team: ___________________________

- [ ] **Payment Monitoring Active**
  - Webhook logs being reviewed
  - Transaction monitoring active
  - Responsible Team: ___________________________

- [ ] **User Activity Monitoring**
  - Sign-ups tracked
  - Authentication success rate tracked
  - Responsible Team: ___________________________

### 6.2 Day-7 Review

- [ ] **First Week Review Completed**
  - Review Date: ___________________________
  - Issues Found: _____ (count)
  - Critical Issues: _____ (count)
  - Issues Resolved: _____ (count)
  - Reviewed By: ___________________________
  - Next Actions: _________________________________

### 6.3 Day-30 Review

- [ ] **First Month Review Completed**
  - Review Date: ___________________________
  - Total Users: _____
  - Active Users: _____
  - Total Transactions: _____
  - Issues Found: _____ (count)
  - Platform Stability: Excellent / Good / Fair / Poor
  - Reviewed By: ___________________________
  - Next Actions: _________________________________

---

## 7. Documentation

- [ ] **User Documentation Available**
  - User guide published
  - FAQ available
  - Support contact information provided
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **API Documentation Updated**
  - Backend API documented
  - Webhook documentation current
  - Verified By: ___________________________
  - Date: ___________________________

- [ ] **Deployment Documentation Current**
  - Deployment procedures documented
  - Rollback procedures documented
  - Emergency contacts listed
  - Verified By: ___________________________
  - Date: ___________________________

---

## 8. Launch Readiness Decision

### Final Go/No-Go Assessment

**Are all checklist items complete?** Yes / No

**Are all approvals obtained?** Yes / No

**Are all tests passing?** Yes / No

**Are all configurations validated?** Yes / No

**Is monitoring in place?** Yes / No

### Launch Decision

- [ ] **APPROVED FOR PRODUCTION LAUNCH**
  - Approved By: ___________________________
  - Title: ___________________________
  - Date: ___________________________
  - Signature: ___________________________

- [ ] **NOT APPROVED - Additional Work Required**
  - Blocked By: _________________________________
  - Required Actions: _________________________________
  - Re-review Date: ___________________________

---

## 9. Post-Launch

- [ ] **Launch Announced**
  - Announcement Date: ___________________________
  - Announced By: ___________________________
  - Channels Used: _________________________________

- [ ] **Support Team Briefed**
  - Briefing Date: ___________________________
  - Team Members: _________________________________

- [ ] **Incident Response Plan Active**
  - On-call team: _________________________________
  - Escalation contacts: _________________________________

---

## Configuration Change Log

| Date | Component | Old Value | New Value | Approved By | Notes |
|------|-----------|-----------|-----------|-------------|-------|
| YYYY-MM-DD | VITE_API_BASE_URL | `http://localhost:3000` | `https://api.wathaci.com` | Name | Switched to production API |
| | | | | | |
| | | | | | |
| | | | | | |

---

## Notes and Additional Comments

_Use this section to document any special considerations, exceptions, or additional information relevant to the launch:_

---

## References

- [Pre-Launch Manual Smoke Tests](../../PRE_LAUNCH_MANUAL_SMOKE_TESTS.md)
- [Production Launch Readiness Summary](../../PRODUCTION_LAUNCH_READINESS_SUMMARY.md)
- [Deployment Prerequisites Checklist](../../DEPLOYMENT_PREREQUISITES_CHECKLIST.md)
- [Authentication Verification](../../AUTHENTICATION_VERIFICATION.md)
- [Payment Webhook Readiness](../../PAYMENT_WEBHOOK_READINESS.md)
- [Environment Setup Guide](../../ENVIRONMENT_SETUP_GUIDE.md)

---

**Document Control**

- **Version**: 1.0
- **Last Modified**: 2025-11-11
- **Owner**: WATHACI CONNECT Launch Team
- **Review Cycle**: Update after each launch attempt or significant change
