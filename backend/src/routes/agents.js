import { Agents } from '../agents/pipeline.js';
import { supabase } from '../services/supabase.js';

export async function agentRoutes(app) {
  /**
   * POST /api/v1/agents/run-quality-audit
   * Manually trigger Data Quality Agent for a store.
   * Typically called by scheduled cron job or admin.
   */
  app.post('/run-quality-audit', async (request) => {
    const { store_id } = request.body;
    if (!supabase || !store_id) {
      return { success: false, message: 'store_id required' };
    }

    // Fetch store context
    const { data: store } = await supabase
      .from('stores')
      .select('name, chains(name)')
      .eq('id', store_id)
      .single();

    // Fetch recent product locations
    const { data: records } = await supabase
      .from('product_locations')
      .select('*')
      .eq('store_id', store_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!records?.length) {
      return { success: false, message: 'No records to audit' };
    }

    const decision = await Agents.dataQuality(records, {
      store_name: store?.name || 'Unknown',
      chain_name: store?.chains?.name || 'Unknown',
    });

    // Auto-apply high-severity actions
    if (decision.data?.issues_found) {
      for (const issue of decision.data.issues_found) {
        if (issue.severity === 'high' && issue.suggested_action === 'delete') {
          await supabase
            .from('product_locations')
            .delete()
            .eq('id', issue.record_id);
        } else if (issue.severity === 'high' && issue.suggested_action === 'flag') {
          await supabase
            .from('product_locations')
            .update({ needs_review: true })
            .eq('id', issue.record_id);
        }
      }
    }

    return { success: true, decision };
  });

  /**
   * POST /api/v1/agents/parse-weekly-ad
   * Parse weekly ad content through the Weekly Ad Agent.
   */
  app.post('/parse-weekly-ad', async (request) => {
    const { chain_name, ad_content, store_id } = request.body;
    if (!chain_name || !ad_content) {
      return { success: false, message: 'chain_name and ad_content required' };
    }

    const decision = await Agents.weeklyAd(ad_content, chain_name);

    // Save extracted deals to database
    if (supabase && decision.data?.deals?.length > 0) {
      // Look up chain_id
      const { data: chain } = await supabase
        .from('chains')
        .select('id')
        .ilike('name', chain_name)
        .single();

      const deals = decision.data.deals.map(deal => ({
        chain_id: chain?.id,
        store_id: store_id || null,
        product_name: deal.product_name,
        brand: deal.brand,
        sale_price: deal.sale_price,
        regular_price: deal.regular_price,
        discount_text: deal.discount_text,
        is_digital_coupon: deal.is_digital_coupon || false,
        placement_hint: deal.placement_hint,
        start_date: deal.start_date || decision.data.ad_valid_dates?.start,
        end_date: deal.end_date || decision.data.ad_valid_dates?.end,
        source_url: 'crawler',
      }));

      await supabase.from('deals').insert(deals);
    }

    return { success: true, decision };
  });

  /**
   * GET /api/v1/agents/status
   * Returns info about all available agents and their configuration.
   */
  app.get('/status', async () => {
    return {
      agents: [
        { name: 'ModerationAgent', role: 'Reviews community submissions', trigger: 'on_submission', auto_approve_threshold: parseFloat(process.env.AGENT_AUTO_APPROVE_THRESHOLD || '0.85') },
        { name: 'CategoryInferenceAgent', role: 'Infers product locations from store context', trigger: 'on_search_miss' },
        { name: 'StoreLayoutAgent', role: 'Extracts aisle data from photos', trigger: 'on_photo_upload' },
        { name: 'WeeklyAdAgent', role: 'Parses weekly ads into structured deal data', trigger: 'on_crawler_run' },
        { name: 'DataQualityAgent', role: 'Audits data for staleness and conflicts', trigger: 'nightly_cron' },
        { name: 'ContentSafetyAgent', role: 'Screens photos for safety/relevance', trigger: 'on_photo_upload' },
        { name: 'StoreOnboardingAgent', role: 'Validates and enriches new store data', trigger: 'on_store_create' },
        { name: 'PriceMonitorAgent', role: 'Analyzes pricing from search results', trigger: 'on_price_request' },
      ],
      config: {
        auto_approve_threshold: parseFloat(process.env.AGENT_AUTO_APPROVE_THRESHOLD || '0.85'),
        escalate_threshold: parseFloat(process.env.AGENT_ESCALATE_THRESHOLD || '0.5'),
        model: 'gemini-2.5-flash',
      },
    };
  });
}
