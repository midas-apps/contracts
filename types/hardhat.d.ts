import { MTokenName, PaymentTokenName } from '../config/types';

import 'hardhat/types/runtime';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    mtoken?: MTokenName;
    paymentToken?: PaymentTokenName;
  }
}
