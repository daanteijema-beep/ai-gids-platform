-- Fix agent_learnings check constraint to include all learning types used by agents
ALTER TABLE agent_learnings
  DROP CONSTRAINT IF EXISTS agent_learnings_learning_type_check;

ALTER TABLE agent_learnings
  ADD CONSTRAINT agent_learnings_learning_type_check
  CHECK (learning_type IN (
    'niche_performance',
    'price_sensitivity',
    'platform_roi',
    'general',
    'content_strategy',
    'outreach_strategy',
    'research_focus'
  ));
