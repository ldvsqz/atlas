export const MICROCYCLE_EXERCISES = [
  'Calentamiento',
  'Resistencia general',
  'Resistencia de la fuerza',
  'Rapidez reacción',
  'Fartlek',
  'Sombra',
  'Saco',
  'Suiza',
  'Escuela de Boxeo',
  'E.C.D.',
  'E.C.L.C',
  'Sparring libre',
];

export const MICROCYCLE_DAY_COUNT = 6;

export const createMicrocycleWorksheetRow = () => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  exercise: '',
  cells: {},
});

export const formatTrainingLoadInput = (value, finalize = false) => {
  const input = String(value || '').trim();
  const parts = input.toLowerCase().split('x');
  const numberPattern = /^\d+(?:[.,]\d+)?'?$/;

  if (parts.length < 2 || parts.length > 3 || !parts.every((part) => numberPattern.test(part))) {
    return input;
  }

  const [rounds, work, rest] = parts.map((part) => part.replace(/'$/, ''));
  if (parts.length === 2) {
    return finalize ? `${rounds}x${work}'` : input;
  }

  const closingQuote = finalize || parts[2].endsWith("'") ? "'" : '';
  return `${rounds}x${work}'x${rest}${closingQuote}`;
};

const parseNumber = (value) => Number(String(value).replace(',', '.'));

const roundToTwoDecimals = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const parseTrainingLoad = (value) => {
  const input = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!input) return { kind: 'empty', minutes: 0 };

  const roundInterval = input.match(/^(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)'x(\d+(?:[.,]\d+)?)'$/);
  if (roundInterval) {
    const rounds = parseNumber(roundInterval[1]);
    const workMinutes = parseNumber(roundInterval[2]);
    const restMinutes = parseNumber(roundInterval[3]);
    if (rounds <= 0 || workMinutes <= 0 || restMinutes < 0) return { kind: 'invalid' };
    return {
      kind: 'duration',
      minutes: roundToTwoDecimals(rounds * (workMinutes + restMinutes)),
    };
  }

  const duration = input.match(/^(\d+(?:[.,]\d+)?)(?:'|min)$/);
  if (duration) {
    const minutes = parseNumber(duration[1]);
    return minutes > 0
      ? { kind: 'duration', minutes: roundToTwoDecimals(minutes) }
      : { kind: 'invalid' };
  }

  const seconds = input.match(/^(\d+(?:[.,]\d+)?)s$/);
  if (seconds) {
    const valueInSeconds = parseNumber(seconds[1]);
    return valueInSeconds > 0
      ? { kind: 'duration', minutes: roundToTwoDecimals(valueInSeconds / 60) }
      : { kind: 'invalid' };
  }

  const distance = input.match(/^(\d+(?:[.,]\d+)?)(km|m)$/);
  if (distance) {
    const amount = parseNumber(distance[1]);
    if (amount <= 0) return { kind: 'invalid' };
    return {
      kind: 'distance',
      meters: roundToTwoDecimals(amount * (distance[2] === 'km' ? 1000 : 1)),
    };
  }

  return { kind: 'invalid' };
};

export const formatTrainingMinutes = (minutes) => {
  const value = roundToTwoDecimals(minutes);
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} min`;
};

export const formatTrainingDistance = (meters) => {
  const value = roundToTwoDecimals(meters);
  if (value >= 1000) {
    const kilometers = roundToTwoDecimals(value / 1000);
    return `${Number.isInteger(kilometers) ? kilometers : kilometers.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} km`;
  }
  return `${value} m`;
};

export const getMicrocycleDayTotals = (rows = []) => Array.from(
  { length: MICROCYCLE_DAY_COUNT },
  (_, dayIndex) => rows.reduce((total, row) => {
    const result = parseTrainingLoad(row.cells?.[dayIndex + 1]);
    if (result.kind === 'duration') total.minutes += result.minutes;
    if (result.kind === 'distance') total.meters += result.meters;
    if (result.kind === 'invalid') total.invalid += 1;
    return total;
  }, { minutes: 0, meters: 0, invalid: 0 })
);

export const getMicrocycleTotal = (rows = []) =>
  getMicrocycleDayTotals(rows).reduce((total, dayTotal) => ({
    minutes: total.minutes + dayTotal.minutes,
    meters: total.meters + dayTotal.meters,
    invalid: total.invalid + dayTotal.invalid,
  }), { minutes: 0, meters: 0, invalid: 0 });

export const formatTrainingTotal = ({ minutes = 0, meters = 0, invalid = 0 }) => {
  const parts = [];
  if (minutes) parts.push(formatTrainingMinutes(minutes));
  if (meters) parts.push(formatTrainingDistance(meters));
  if (!parts.length) parts.push('0 min');
  if (invalid) parts.push(`${invalid} formato${invalid === 1 ? '' : 's'} inválido${invalid === 1 ? '' : 's'}`);
  return parts.join(' · ');
};
