import { diffDays, type DateKey } from './dates';

const PROMPTS = [
  'Vad skulle göra idag till en bra dag?',
  'Vad är du tacksam för just nu?',
  'Vad tar energi från dig, och vad ger energi?',
  'Vilken liten sak kan du göra idag som ditt framtida jag tackar dig för?',
  'Vad har du skjutit upp – och vad är första steget?',
  'Vad lärde du dig senast som överraskade dig?',
  'Vem kan du höra av dig till idag?',
  'Vad vill du säga nej till den här veckan?',
  'När kände du dig senast riktigt fokuserad? Vad gjorde det möjligt?',
  'Vad skulle du göra annorlunda om du började om veckan idag?',
  'Vad är ett litet framsteg du gjort som du inte firat?',
  'Vilken vana gör mest skillnad för dig just nu?',
];

/** A stable prompt per day. */
export function promptForDay(day: DateKey): string {
  const n = Math.abs(diffDays('2024-01-01', day));
  return PROMPTS[n % PROMPTS.length]!;
}
