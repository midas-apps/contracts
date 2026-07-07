import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { parseUnits } from 'ethers/lib/utils';

import { getRolesForToken } from '../../helpers/roles';
import { lockOrBurn, releaseOrMint } from '../common/ccip.helpers';
import { mintToken } from '../common/common.helpers';
import { ccipCctFixture } from '../common/fixtures';

describe('CCIP', function () {
  describe('MidasCCTBurnMintTokenPool', () => {
    describe('lockOrBurn', () => {
      it('burns the pool balance when called by the onRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool } = fixture;

        await mintToken(fixture.mTBILL, pool.address, 100);

        await lockOrBurn(fixture, { amount: parseUnits('100') });
      });

      it('should fail: when the pool loses the burner role', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, accessControl } = fixture;

        await mintToken(fixture.mTBILL, pool.address, 100);

        const roles = getRolesForToken('mTBILL');
        await accessControl.revokeRole(roles.burner, pool.address);

        await lockOrBurn(
          fixture,
          { amount: parseUnits('100') },
          { revertMessage: 'WMAC: hasnt role' },
        );
      });
    });

    describe('releaseOrMint', () => {
      it('mints to the receiver when called by the offRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: fixture.alice.address,
        });
      });

      it('should fail: when the pool loses the minter role', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, accessControl } = fixture;

        const roles = getRolesForToken('mTBILL');
        await accessControl.revokeRole(roles.minter, pool.address);

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100') },
          { revertMessage: 'WMAC: hasnt role' },
        );
      });
    });
  });
});
