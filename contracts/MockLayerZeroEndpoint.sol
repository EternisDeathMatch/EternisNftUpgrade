// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LevelerMessenger.sol";

/// @notice Simple mock endpoint that directly calls lzReceive on the target
contract MockLayerZeroEndpoint {
    function send(address receiver, bytes calldata payload) external {
        ILayerZeroReceiver(receiver).lzReceive(0, bytes(""), 0, payload);
    }
}

