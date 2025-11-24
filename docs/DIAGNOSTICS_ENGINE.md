# SME Auto-Diagnosis & Growth Recommendation Engine

## Overview

The SME Auto-Diagnosis & Growth Recommendation Engine is an AI-powered tool that analyzes an SME's profile, documents, behavior, and sector data to produce comprehensive diagnostic reports and growth roadmaps.

## Features

- **360° Business Health Check**: Comprehensive analysis across 6 key dimensions
- **Automated SWOT Analysis**: AI-generated strengths, weaknesses, opportunities, and threats
- **Funding Readiness Score**: Assessment of readiness for bank loans and investments
- **Compliance Maturity Score**: Evaluation of tax, regulatory, and governance compliance
- **Digital Maturity Score**: Analysis of digital presence and tool adoption
- **Governance Maturity Score**: Assessment of board, policies, and risk management
- **Market Readiness Score**: Evaluation of business model clarity and market positioning
- **Operational Efficiency Score**: Analysis of processes and digital tool usage
- **Personalized Recommendations**: Prioritized action items with timelines
- **Partner Matching**: Connection to relevant Wathaci network partners
- **PDF Report Export**: Downloadable business health reports

## Architecture

### Frontend Components

```
src/features/diagnostics/
├── BusinessHealthDashboard.tsx  # Main dashboard view
├── ScoreCard.tsx                # Individual score display
├── SWOTDisplay.tsx              # SWOT quadrant visualization
├── RecommendationsTimeline.tsx  # Action items by timeline
├── PartnerRecommendations.tsx   # Matched partners display
└── index.ts                     # Module exports
```

### Backend Services

```
backend/routes/
└── diagnostics.js               # API endpoints

src/lib/diagnostics/
├── scoringEngine.ts             # Score calculation logic
├── diagnosticsService.ts        # Main diagnosis orchestration
└── index.ts                     # Module exports
```

### Database Schema

```
supabase/migrations/
└── 20251124210000_create_diagnostics_engine.sql
```

Tables created:
- `diagnostics_runs`: Stores diagnosis results
- `sme_financial_data`: Optional financial metrics
- `sme_documents`: Uploaded documents
- `sector_benchmarks`: Sector reference data
- `wathaci_partners`: Partner directory
- `sme_platform_behavior`: User engagement tracking

## API Endpoints

### Run Diagnostics
```
POST /api/diagnostics/run
Body: { user_id: string, force_refresh?: boolean }
```

### Get Latest Diagnostics
```
GET /api/diagnostics/latest/:user_id
```

### Get Diagnostics History
```
GET /api/diagnostics/history/:user_id?limit=10&offset=0
```

### Get Partners
```
GET /api/diagnostics/partners?sector=retail&partner_type=bank
```

### Get Sector Benchmarks
```
GET /api/diagnostics/sector-benchmarks?sector=retail&country=ZM
```

## Scoring Model

### Funding Readiness Score (0-100)

| Factor | Weight |
|--------|--------|
| Formal registration | 15 |
| Years in business | 10 |
| Has revenue data | 15 |
| Revenue trend positive | 10 |
| Profitability | 10 |
| Has financial records | 15 |
| Has audited statements | 10 |
| Debt repayment behavior | 10 |
| Compliance complete | 5 |

**Bands:**
- 0-30: Not yet ready
- 31-60: Emerging / Semi-ready
- 61-80: Bankable with support
- 81-100: Strongly bankable

### Compliance Maturity Score (0-100)

| Factor | Weight |
|--------|--------|
| Tax registration | 20 |
| Tax clearance | 20 |
| Annual return filing | 15 |
| Industry licenses | 15 |
| HR policies/contracts | 15 |
| Governance structures | 15 |

### Digital Maturity Score (0-100)

| Factor | Weight |
|--------|--------|
| Website presence | 20 |
| Social media presence | 15 |
| Online sales channels | 20 |
| ERP system | 15 |
| POS system | 10 |
| Accounting software | 15 |
| Responsiveness | 5 |

### Governance Maturity Score (0-100)

| Factor | Weight |
|--------|--------|
| Board/advisory presence | 25 |
| Written policies | 25 |
| Role segregation | 20 |
| Risk management | 15 |
| Audit practices | 15 |

### Market Readiness Score (0-100)

| Factor | Weight |
|--------|--------|
| Clear business model | 20 |
| Defined revenue model | 15 |
| Customer diversification | 15 |
| Sector positioning | 15 |
| Years track record | 15 |
| Geographic presence | 10 |
| Online presence | 10 |

### Operational Efficiency Score (0-100)

| Factor | Weight |
|--------|--------|
| Employee structure | 15 |
| Digital tools adoption | 20 |
| Financial management | 20 |
| Customer management | 15 |
| Platform engagement | 15 |
| Process automation | 15 |

## Output Format

### JSON Structure

```json
{
  "overall_summary": {
    "health_band": "emerging",
    "business_stage": "growth",
    "headline": "Emerging business with growth potential",
    "key_strengths": ["..."],
    "urgent_gaps": ["..."],
    "recommended_themes": ["..."]
  },
  "swot_analysis": {
    "strengths": [{ "id": "...", "text": "...", "importance": "high" }],
    "weaknesses": [...],
    "opportunities": [...],
    "threats": [...]
  },
  "scores": {
    "funding_readiness": 55,
    "compliance_maturity": 40,
    "governance_maturity": 30,
    "digital_maturity": 65,
    "market_readiness": 50,
    "operational_efficiency": 45
  },
  "bottlenecks": [{
    "id": "...",
    "area": "Compliance",
    "severity": "high",
    "description": "...",
    "impact": "..."
  }],
  "recommendations": [{
    "id": "...",
    "priority": 1,
    "area": "Compliance",
    "action": "Obtain Tax Clearance Certificate",
    "why": "...",
    "how": ["Step 1", "Step 2"],
    "estimated_time": "2-4 weeks",
    "difficulty": "medium",
    "timeline_category": "NOW"
  }],
  "recommended_partners": [{
    "partner_type": "bank",
    "partner_id": "...",
    "name": "XYZ Bank",
    "reason": "...",
    "suggested_product": "Working Capital",
    "fit_score": 85
  }],
  "suggested_opportunities": [{
    "id": "...",
    "type": "grant",
    "title": "...",
    "description": "...",
    "provider": "...",
    "fit_score": 80
  }],
  "meta": {
    "last_updated": "2024-01-01T00:00:00Z",
    "data_coverage_level": "partial",
    "data_sources_used": ["profile", "documents"],
    "model_version": "v1.0",
    "prompt_version": "v1.0"
  }
}
```

## Usage

### Accessing the Dashboard

1. Sign in to Wathaci Connect
2. Navigate to `/business-health`
3. The system will automatically analyze your profile and generate a report

### Improving Your Score

1. Complete your business profile
2. Upload required documents (registration certificate, tax clearance, financial statements)
3. Add financial data
4. Use the platform regularly

## Technical Notes

### Data Requirements

**Minimal (basic analysis)**:
- Email
- Business name
- Sector

**Partial (improved precision)**:
- + Registration status
- + Years in operation
- + Employee count
- + Basic documents

**Comprehensive (full analysis)**:
- + Financial data (revenue, profit)
- + All compliance documents
- + Platform behavior data
- + Sector benchmarks

### Extensibility

The scoring engine is designed to be:
- **Explainable**: Every score can be traced to specific factors
- **Extensible**: New criteria can be added without breaking existing functionality
- **Versioned**: Each run is tagged with model and prompt versions

### Future Enhancements

- AI-powered document analysis with OCR
- Natural language narrative generation using LLMs
- Sector-specific scoring adjustments
- Peer comparison analytics
- Historical trend analysis
- Mobile app support

## Support

For questions or issues, contact support@wathaci.com
