// Compares Google Routes API real-time departure with PTV scheduled time.
// The difference is the delay — no external dependency required.

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString('en-AU', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Australia/Melbourne'
  });
}

function getAlertsFromDeparture(googleDepartureTime, ptvScheduledTime) {
  if (!googleDepartureTime || !ptvScheduledTime) return [];

  const googleMs = new Date(googleDepartureTime).getTime();
  const ptvMs    = new Date(ptvScheduledTime).getTime();

  if (isNaN(googleMs) || isNaN(ptvMs)) return [];

  // Skip if times are more than 60 min apart — likely different services
  if (Math.abs(googleMs - ptvMs) > 60 * 60 * 1000) return [];

  const delayMinutes = Math.round((googleMs - ptvMs) / 60000);

  if (delayMinutes >= 2) {
    return [{
      type: 'delay',
      title: `Running ${delayMinutes} min late`,
      description: `Expected ${formatTime(googleMs)} · Scheduled ${formatTime(ptvMs)}`,
      delay_minutes: delayMinutes
    }];
  }

  return [];
}

module.exports = { getAlertsFromDeparture };
