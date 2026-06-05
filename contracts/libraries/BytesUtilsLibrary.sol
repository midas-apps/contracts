// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title BytesUtilsLibrary
 * @author RedDuck Software
 */
library BytesUtilsLibrary {
    error InvalidData(bytes data);

    function extractBytes32x2(bytes memory data)
        internal
        pure
        returns (bytes32, bytes32)
    {
        bytes32[] memory result = _extractBytes32Array(data, 2);
        return (result[0], result[1]);
    }

    function extractBytes32x3(bytes memory data)
        internal
        pure
        returns (
            bytes32,
            bytes32,
            bytes32
        )
    {
        bytes32[] memory result = _extractBytes32Array(data, 3);
        return (result[0], result[1], result[2]);
    }

    function extractBytes32x4(bytes memory data)
        internal
        pure
        returns (
            bytes32,
            bytes32,
            bytes32,
            bytes32
        )
    {
        bytes32[] memory result = _extractBytes32Array(data, 4);
        return (result[0], result[1], result[2], result[3]);
    }

    function _extractBytes32Array(bytes memory data, uint256 length)
        private
        pure
        returns (bytes32[] memory result)
    {
        require(data.length == length * 32, InvalidData(data));

        result = new bytes32[](length);
        for (uint256 i = 0; i < length; ) {
            assembly {
                mstore(
                    add(add(result, 0x20), mul(i, 0x20)),
                    mload(add(add(data, 0x20), mul(i, 0x20)))
                )
            }
            unchecked {
                ++i;
            }
        }
    }
}
