// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AlturaNFTLeveler.sol";

/// @notice Minimal interface for a LayerZero-style receiver
interface ILayerZeroReceiver {
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

/// @notice Minimal interface for a LayerZero endpoint used for authentication
interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;
}

/// @title LevelerMessenger
/// @notice Receives cross-chain messages and forwards them to a Leveler contract
contract LevelerMessenger is ILayerZeroReceiver {
    ILayerZeroEndpoint public immutable endpoint;
    AlturaNFTLevelerV3 public immutable leveler;

    constructor(address _endpoint, address _leveler) {
        require(_endpoint != address(0), "invalid endpoint");
        require(_leveler != address(0), "invalid leveler");
        endpoint = ILayerZeroEndpoint(_endpoint);
        leveler = AlturaNFTLevelerV3(_leveler);
    }

    /// @notice Called by the LayerZero endpoint to deliver a message
    function lzReceive(
        uint16, /*_srcChainId*/
        bytes calldata, /*_srcAddress*/
        uint64, /*_nonce*/
        bytes calldata _payload
    ) external override {
        require(msg.sender == address(endpoint), "unauthorized");
        (address user, uint256 tokenId, uint8 rarity) = abi.decode(
            _payload,
            (address, uint256, uint8)
        );
        leveler.levelUp(user, tokenId, rarity);
    }
}

