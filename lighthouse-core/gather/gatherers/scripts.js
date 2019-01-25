/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');
const NetworkRequest = require('../../lib/network-request');
const getElementsInDocumentString = require('../../lib/page-functions.js').getElementsInDocumentString; // eslint-disable-line max-len
const URL = require('../../lib/url-shim.js');

/**
 * @fileoverview Gets JavaScript file contents.
 */
class Scripts extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['Scripts']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;

    /** @type {LH.Artifacts['Scripts']} */
    const scripts = [];

    /** @type {string[]} */
    const inlineScripts = await driver.evaluateAsync(`(() => {
      ${getElementsInDocumentString};

      return getElementsInDocument('script')
        .filter(script => !script.src && script.text.trim())
        .map(script => meta.text);
    })()`, {useIsolation: true});

    if (inlineScripts.length) {
      const mainResource = loadData.networkRecords.find(
        request => URL.equalWithExcludedFragments(request.url, passContext.url));
      if (!mainResource) {
        throw new Error('could not locate mainResource');
      }
      scripts.push(...inlineScripts.map(code => ({
        code,
        requestId: mainResource.requestId,
      })));
    }

    const scriptRecords = loadData.networkRecords
      .filter(record => record.resourceType === NetworkRequest.TYPES.Script);

    for (const record of scriptRecords) {
      try {
        const content = await driver.getRequestContent(record.requestId);
        if (content) {
          scripts.push({
            code: content,
            requestId: record.requestId,
          });
        }
      } catch (e) {}
    }

    return scripts;
  }
}

module.exports = Scripts;
