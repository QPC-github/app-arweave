/** ******************************************************************************
 *  (c) 2020 Zondax GmbH
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ******************************************************************************* */

import Zemu, { DEFAULT_START_OPTIONS } from '@zondax/zemu'
import ArweaveApp from '@zondax/ledger-arweave'
import { APP_SEED, models } from './common'

const defaultOptions = {
  ...DEFAULT_START_OPTIONS,
  startDelay: 5000,
  logging: true,
  custom: `-s "${APP_SEED}"`,
  X11: false,
  startText: 'Not Ready',
}

const expected_address_string = 'ruH8xdwP4Y0rK3YpQOSO8pfmtao9sGi4HriXrg-5ZLg'

jest.setTimeout(3600000) // 1h

describe('Address', function () {
  test.each(models)('Address Checks', async function (m) {
    const sim = new Zemu(m.path)

    try {
      await sim.start({ ...defaultOptions, model: m.name })

      const app = new ArweaveApp(sim.getTransport())

      // Run initialize
      await sim.clickRight()
      await sim.clickBoth('', false) // Here there's all the calculation, do not wait to finish

      await sim.deleteEvents() // remove events to avoid matching "Not Ready" with "Ready"
      await sim.waitForText('Ready', 1800000) // 30min

      // here we have the device initialized
      const mainMenuSnapshot = await sim.snapshot()

      // getAddress
      const get_resp = await app.getAddress()
      console.log(get_resp)
      expect(get_resp.returnCode).toEqual(0x9000)
      expect(get_resp.errorMessage).toEqual('No errors')
      expect(get_resp.address).toEqual(expected_address_string)

      // showAddress
      const showRequest = app.showAddress()
      await sim.waitUntilScreenIsNot(mainMenuSnapshot)
      await sim.compareSnapshotsAndApprove('.', `${m.prefix.toLowerCase()}-show_address`)

      const show_resp = await showRequest

      console.log(show_resp)
      expect(show_resp.returnCode).toEqual(0x9000)
      expect(show_resp.errorMessage).toEqual('No errors')
      expect(show_resp.address).toEqual(expected_address_string)

      // showAddress reject
      const showExpertRequest = app.showAddress()
      await sim.waitUntilScreenIsNot(mainMenuSnapshot)
      await sim.navigateAndCompareUntilText('.', `${m.prefix.toLowerCase()}-show_address_reject`, 'REJECT')

      const resp = await showExpertRequest

      console.log(resp)
      expect(resp.returnCode).toEqual(0x6986)
      expect(resp.errorMessage).toEqual('Transaction rejected')
    } finally {
      await sim.close()
    }
  })
})
