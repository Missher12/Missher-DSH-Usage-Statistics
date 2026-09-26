/** Snapshot wire schema adapted from the Desktop 0.5.10 generated Remote. */
import { z } from 'zod'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'

const _deepseek_ai_dsh_usage_insights_usageStatistics_snapshot_result$schema = z.object({
  'generatedAt': z.number(),
  'timeZone': z.string(),
  'sessionCount': z.number(),
  'omittedSessions': z.number(),
  'incompleteUsageSamples': z.number(),
  'summary': z.object({
  'totalTokens': z.union([z.literal(null), z.number()]),
  'peakDailyTokens': z.union([z.literal(null), z.number()]),
  'longestSessionMs': z.union([z.literal(null), z.number()]),
  'currentStreakDays': z.number(),
  'longestStreakDays': z.number(),
}),
  'insights': z.object({
  'cacheHitRate': z.union([z.literal(null), z.number()]),
  'mostUsedModel': z.union([z.literal(null), z.string()]),
  'mostUsedReasoningEffort': z.union([z.literal(null), z.string()]),
  'uniqueSkills': z.number(),
  'totalToolCalls': z.number(),
  'chatDays': z.number(),
}),
  'activity': z.array(z.object({
  'level': z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  'date': z.string(),
  'humanMessages': z.number(),
  'tokens': z.number(),
  'toolCalls': z.number(),
})),
  'features': z.array(z.object({
  'kind': z.union([z.literal("skill"), z.literal("tool")]),
  'name': z.string(),
  'count': z.number(),
})),
})

export const TYPERT_REMOTE = {
  package: '@missher/dsh-usage-statistics',
  descriptors: [
    {
      id: '@missher/dsh-usage-statistics#usageStatistics/snapshot',
      service: 'usageStatistics',
      namespace: 'usageStatistics',
      method: 'snapshot',
      invocation: { kind: 'direct' },
      parameters: [
      ],
      result: {
        mode: 'strict',
        typeSymbol: '@missher/dsh-usage-statistics/types#UsageInsightsSnapshot',
        schema: _deepseek_ai_dsh_usage_insights_usageStatistics_snapshot_result$schema,
      },
      sourceLocation: {"file":"src/index.ts","line":146,"column":3},
    },
  ],
} satisfies TypertRemoteContribution

export default TYPERT_REMOTE
