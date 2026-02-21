const axios = require('axios');
const xml2js = require('xml2js');

class eBayAPI {
  constructor(config) {
    this.token = config.token;
    this.environment = config.environment || 'production';
    this.useIAFToken = config.useIAFToken || false;

    this.apiURL = this.environment === 'production'
      ? 'https://api.ebay.com/ws/api.dll'
      : 'https://api.sandbox.ebay.com/ws/api.dll';

    this.appID = process.env.EBAY_APP_ID;
    this.devID = process.env.EBAY_DEV_ID;
    this.certID = process.env.EBAY_CERT_ID;
  }

  // Build XML request
  buildXMLRequest(apiCall, body) {
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'utf-8' }
    });

    const rootContent = {
      $: { xmlns: 'urn:ebay:apis:eBLBaseComponents' },
      ...body
    };

    // Include RequesterCredentials only when not using IAF token header
    if (!this.useIAFToken) {
      rootContent.RequesterCredentials = { eBayAuthToken: this.token };
    }

    const requestBody = {
      [`${apiCall}Request`]: rootContent
    };

    return builder.buildObject(requestBody);
  }

  // Parse XML response
  async parseXMLResponse(xml) {
    const parser = new xml2js.Parser({ explicitArray: false });
    return parser.parseStringPromise(xml);
  }

  // Make API call
  async makeCall(apiCall, body) {
    const xml = this.buildXMLRequest(apiCall, body);

    const headers = {
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1309',
      'X-EBAY-API-CALL-NAME': apiCall,
      'X-EBAY-API-APP-NAME': this.appID,
      'X-EBAY-API-DEV-NAME': this.devID,
      'X-EBAY-API-CERT-NAME': this.certID,
      'Content-Type': 'text/xml'
    };

    if (this.useIAFToken) {
      headers['X-EBAY-API-IAF-TOKEN'] = this.token;
    }

    const response = await axios.post(this.apiURL, xml, { headers });

    const parsed = await this.parseXMLResponse(response.data);
    const responseKey = `${apiCall}Response`;
    const result = parsed[responseKey];

    // Check for errors
    if (result.Ack === 'Failure' || result.Ack === 'PartialFailure') {
      const errors = Array.isArray(result.Errors) ? result.Errors : [result.Errors];
      const err = new Error(errors[0].LongMessage || 'eBay API error');
      err.status = 502;
      err.ebayErrors = errors;
      throw err;
    }

    return result;
  }
}

module.exports = eBayAPI;
