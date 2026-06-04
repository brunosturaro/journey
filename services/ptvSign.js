const crypto = require('crypto');

const BASE_URL = 'https://timetableapi.ptv.vic.gov.au';

function buildUrl(path, params = {}) {
  const devId = process.env.PTV_DEV_ID;
  const apiKey = process.env.PTV_API_KEY;

  const query = new URLSearchParams({ ...params, devid: devId }).toString();
  const rawToSign = `${path}?${query}`;

  const signature = crypto
    .createHmac('sha1', apiKey)
    .update(rawToSign)
    .digest('hex')
    .toUpperCase();

  return `${BASE_URL}${rawToSign}&signature=${signature}`;
}

module.exports = { buildUrl };
