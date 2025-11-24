/**
 * Diagnostics API Routes
 * 
 * Backend API routes for the SME Auto-Diagnosis Engine.
 * 
 * NOTE: This implementation uses in-memory storage for demonstration purposes.
 * In production, replace the diagnosticsStore Map with actual Supabase database calls
 * using the diagnostics_runs table created in the migration.
 */

const express = require('express');
const router = express.Router();

/**
 * In-memory store for diagnostics runs.
 * PRODUCTION TODO: Replace with Supabase database integration:
 * - Use supabase.from('diagnostics_runs').insert/select/update
 * - This Map will lose all data on server restart
 */
const diagnosticsStore = new Map();

/**
 * POST /api/diagnostics/run
 * Trigger a new diagnostics run for an SME
 */
router.post('/run', async (req, res) => {
  try {
    const { user_id, force_refresh = false } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
    }

    // Check for existing recent run (within 24 hours) unless force refresh
    const existingRuns = diagnosticsStore.get(user_id) || [];
    const recentRun = existingRuns.find(run => {
      const runDate = new Date(run.created_at);
      const hoursSince = (Date.now() - runDate.getTime()) / (1000 * 60 * 60);
      return hoursSince < 24 && run.status === 'completed';
    });

    if (recentRun && !force_refresh) {
      return res.status(200).json({
        success: true,
        data: recentRun,
        cached: true,
        message: 'Returning cached diagnostics run from last 24 hours',
      });
    }

    // In a real implementation, this would:
    // 1. Fetch SME profile from database
    // 2. Fetch financial data, documents, behavior data
    // 3. Run the diagnostics engine
    // 4. Store results in database
    // 5. Optionally call AI for narrative generation

    // For now, return a placeholder response
    const newRun = {
      id: `run_${Date.now()}`,
      user_id,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: 'Diagnostics run initiated. Use GET /api/diagnostics/latest to retrieve results.',
    };

    // Store the pending run
    if (!diagnosticsStore.has(user_id)) {
      diagnosticsStore.set(user_id, []);
    }
    diagnosticsStore.get(user_id).unshift(newRun);

    res.status(202).json({
      success: true,
      data: newRun,
    });

  } catch (error) {
    console.error('Error running diagnostics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error running diagnostics',
    });
  }
});

/**
 * GET /api/diagnostics/latest/:user_id
 * Get the latest diagnostics run for an SME
 */
router.get('/latest/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
    }

    const runs = diagnosticsStore.get(user_id) || [];
    const latestRun = runs.find(run => run.status === 'completed');

    if (!latestRun) {
      return res.status(404).json({
        success: false,
        error: 'No completed diagnostics run found for this user',
        message: 'Run a new diagnostics by POST to /api/diagnostics/run',
      });
    }

    res.status(200).json({
      success: true,
      data: latestRun,
    });

  } catch (error) {
    console.error('Error fetching latest diagnostics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching diagnostics',
    });
  }
});

/**
 * GET /api/diagnostics/history/:user_id
 * Get diagnostics history for an SME
 */
router.get('/history/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
    }

    const runs = diagnosticsStore.get(user_id) || [];
    const completedRuns = runs.filter(run => run.status === 'completed');
    const paginatedRuns = completedRuns.slice(
      parseInt(offset, 10),
      parseInt(offset, 10) + parseInt(limit, 10)
    );

    res.status(200).json({
      success: true,
      data: paginatedRuns,
      total: completedRuns.length,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

  } catch (error) {
    console.error('Error fetching diagnostics history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching diagnostics history',
    });
  }
});

/**
 * GET /api/diagnostics/:run_id
 * Get a specific diagnostics run by ID
 */
router.get('/:run_id', async (req, res) => {
  try {
    const { run_id } = req.params;

    if (!run_id) {
      return res.status(400).json({
        success: false,
        error: 'run_id is required',
      });
    }

    // Search all users for the run
    let foundRun = null;
    for (const [, runs] of diagnosticsStore) {
      const run = runs.find(r => r.id === run_id);
      if (run) {
        foundRun = run;
        break;
      }
    }

    if (!foundRun) {
      return res.status(404).json({
        success: false,
        error: 'Diagnostics run not found',
      });
    }

    res.status(200).json({
      success: true,
      data: foundRun,
    });

  } catch (error) {
    console.error('Error fetching diagnostics run:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching diagnostics run',
    });
  }
});

/**
 * GET /api/diagnostics/partners
 * Get available Wathaci partners
 */
router.get('/partners', async (req, res) => {
  try {
    const { sector, revenue_range, partner_type } = req.query;

    // Mock partner data - in production, fetch from database
    const partners = [
      {
        id: 'partner_1',
        partner_type: 'bank',
        name: 'Zanaco SME Unit',
        description: 'Specialized SME banking services',
        products: [
          { name: 'Working Capital Facility', min_amount: 5000, max_amount: 500000 },
          { name: 'Asset Finance', min_amount: 10000, max_amount: 1000000 },
        ],
        target_sectors: ['retail', 'manufacturing', 'agriculture'],
        is_active: true,
      },
      {
        id: 'partner_2',
        partner_type: 'investor',
        name: 'BongoHive Ventures',
        description: 'Early stage tech investments',
        products: [
          { name: 'Seed Investment', min_amount: 25000, max_amount: 100000 },
        ],
        target_sectors: ['technology', 'fintech', 'agritech'],
        is_active: true,
      },
      {
        id: 'partner_3',
        partner_type: 'consultant',
        name: 'Business Advisory Services',
        description: 'Tax, compliance, and business advisory',
        products: [
          { name: 'Compliance Review', min_amount: 500, max_amount: 5000 },
          { name: 'Business Plan Development', min_amount: 1000, max_amount: 10000 },
        ],
        target_sectors: ['all'],
        is_active: true,
      },
    ];

    // Filter by partner type if specified
    let filteredPartners = partners.filter(p => p.is_active);
    
    if (partner_type) {
      filteredPartners = filteredPartners.filter(p => p.partner_type === partner_type);
    }
    
    if (sector) {
      filteredPartners = filteredPartners.filter(p => 
        p.target_sectors.includes('all') || p.target_sectors.includes(sector.toLowerCase())
      );
    }

    res.status(200).json({
      success: true,
      data: filteredPartners,
      total: filteredPartners.length,
    });

  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching partners',
    });
  }
});

/**
 * GET /api/diagnostics/sector-benchmarks
 * Get sector benchmarks for comparison
 */
router.get('/sector-benchmarks', async (req, res) => {
  try {
    const { sector, country = 'ZM' } = req.query;

    // Mock sector benchmarks - in production, fetch from database
    const benchmarks = [
      {
        sector: 'retail',
        country: 'ZM',
        avg_revenue_growth_pct: 12.5,
        median_employee_count: 5,
        avg_digital_maturity_score: 45,
        common_challenges: ['forex_access', 'competition', 'load_shedding'],
        growth_potential: 'medium',
      },
      {
        sector: 'manufacturing',
        country: 'ZM',
        avg_revenue_growth_pct: 8.3,
        median_employee_count: 15,
        avg_digital_maturity_score: 35,
        common_challenges: ['import_dependence', 'load_shedding', 'skilled_labor'],
        growth_potential: 'high',
      },
      {
        sector: 'agriculture',
        country: 'ZM',
        avg_revenue_growth_pct: 15.2,
        median_employee_count: 10,
        avg_digital_maturity_score: 25,
        common_challenges: ['climate', 'market_access', 'storage'],
        growth_potential: 'high',
      },
      {
        sector: 'technology',
        country: 'ZM',
        avg_revenue_growth_pct: 25.0,
        median_employee_count: 8,
        avg_digital_maturity_score: 75,
        common_challenges: ['talent', 'funding', 'market_size'],
        growth_potential: 'high',
      },
    ];

    let filteredBenchmarks = benchmarks.filter(b => b.country === country);
    
    if (sector) {
      filteredBenchmarks = filteredBenchmarks.filter(b => b.sector === sector.toLowerCase());
    }

    res.status(200).json({
      success: true,
      data: filteredBenchmarks,
    });

  } catch (error) {
    console.error('Error fetching sector benchmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error fetching sector benchmarks',
    });
  }
});

module.exports = router;
