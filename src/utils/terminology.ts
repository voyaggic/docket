export const DEFAULT_TERMINOLOGY = {
  case: 'Case',
  cases: 'Cases',
  referenceNumber: 'File Reference',
  filingDate: 'Date of Instruction',
  opposingParty: 'Respondent',
  leadCounsel: 'Instructing Advocate',
  caseStage: 'Case Stage',
  timeline: 'Case Diary',
  clientUpdates: 'Updates',
  teamChat: 'Chat',
  documents: 'Documents',
  deadlines: 'Deadline & Reminders',
  newCase: 'Open New Case',
  activeCases: 'Active Cases'
};

export type TerminologyKey = keyof typeof DEFAULT_TERMINOLOGY;

export function getTerm(key: TerminologyKey, settings?: any): string {
  const customList = settings?.terminology;
  if (customList && customList[key] && customList[key].trim() !== "") {
    return customList[key];
  }
  return DEFAULT_TERMINOLOGY[key];
}
