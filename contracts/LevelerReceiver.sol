// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";
import "./AlturaNFTLevelerV4.sol";

/// @notice Listens for LayerZero messages and calls your Leveler on Amoy
contract LevelerReceiver is NonblockingLzApp {
    AlturaNFTLevelerV4 public immutable leveler;
    event ReceivedAndLeveled(address indexed user, uint256 indexed tokenId);
    event ReceivedCall();

    /// @param _endpoint LayerZero endpoint on Polygon Amoy
    /// @param _leveler  Your deployed AlturaNFTLevelerV4 proxy address
    constructor(
        address _endpoint,
        address _leveler
    )
        NonblockingLzApp(_endpoint) // ← This is the **only** base constructor call
        Ownable(msg.sender)
    {
        leveler = AlturaNFTLevelerV4(_leveler);
    }

    function _nonblockingLzReceive(
        uint16, // srcChainId (ignored)
        bytes memory, // srcAddress (ignored)
        uint64, // nonce (ignored)
        bytes memory payload
    ) internal override {
        emit ReceivedCall();

        // // Decode only the two values we actually need
        // (address user, uint256 tokenId) = abi.decode(
        //     payload,
        //     (address, uint256)
        // );

        // emit ReceivedAndLeveled(user, tokenId);
        // Now call the bridge-only entrypoint
        // leveler.levelUpFromBridge(user, tokenId);
    }
}
