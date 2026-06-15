export type UWScene =
  | 'dashboard'
  | 'triage'
  | 'submission-intake'
  | 'daily-tasks'
  | 'wrap-up'

export interface UWSubmission {
  id: string
  client: string
  broker: string
  brokerContact: string
  line: string
  tiv: string
  requestedLimit: string
  submittedAt: string
  deadline?: string
  status: 'urgent' | 'pending' | 'in-review' | 'quoted'
  flagReasons: string[]
  aiRecommendation: string
  fraudRisk: 'low' | 'moderate' | 'high'
  complianceFlags: string[]
}

export interface UWRenewal {
  id: string
  client: string
  broker: string
  renewalDate: string
  tiv: string
  currentPremium: string
  aiFlag: string | null
  profitabilityTrend: 'strong' | 'stable' | 'improving' | 'declining'
  recommendation: string
  churnRisk: 'low' | 'moderate' | 'high'
}
