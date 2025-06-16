// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/interfaces/ILayerZeroEndpoint.sol";
import "./SentinelToken.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
using Strings for uint256;

contract XdcLevelerSender is Ownable {
    ILayerZeroEndpoint public immutable endpoint;
    SentinelToken public immutable sentinel;
    uint16 public constant AMOY_CHAIN = 109;
    bytes public amoyReceiver;

    event BridgeSendFailed(string reason);
    event ERC20TransferFailed(string reason);
    /// @notice Emitted once we've successfully pulled & burned SENT on XDC
    event Burned(address indexed from, uint256 amount);
    /// @notice Emitted once a LayerZero send succeeds
    event MessageSent(uint16 dstChain, bytes path, bytes payload);

    constructor(
        address _lzEndpoint,
        address _sentinelToken,
        bytes memory _amoyReceiver
    ) Ownable(msg.sender) {
        endpoint = ILayerZeroEndpoint(_lzEndpoint);
        sentinel = SentinelToken(_sentinelToken);
        amoyReceiver = _amoyReceiver;
    }

    function setReceiver(bytes calldata _r) external onlyOwner {
        amoyReceiver = _r;
    }

    // full estimateFees implementation
    function estimateFees(
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee) {
        return endpoint.estimateFees(
            AMOY_CHAIN,
            address(this), // this contract is the sender
            _payload,
            _payInZRO,
            _adapterParams
        );
    }

    function burnAndLevel(
        uint256 amount,
        address user,
        uint256 tokenId
    ) external payable {
        // 1) pull & burn: wrap the external ERC-20 call
        try sentinel.transferFrom(msg.sender, address(this), amount) returns (
            bool ok
        ) {
            require(ok, "ERC20 returned false");
        } catch Error(string memory reason) {
            emit ERC20TransferFailed(reason);
            revert(reason);
        } catch {
            emit ERC20TransferFailed("ERC20 call failed");
            revert();
        }
        // we know transferFrom succeeded, so burn:

        // 2) burn: wrap burn call
        try sentinel.burn(amount) {
            // success
        } catch Error(string memory reason) {
            emit ERC20TransferFailed(reason);
            revert(reason);
        } catch {
            emit ERC20TransferFailed("ERC20 burn failed");
            revert();
        }
// tell off-chain listeners that the burn happened
     emit Burned(msg.sender, amount);
        // 2) payload
        bytes memory payload = abi.encodePacked(user, tokenId);
        // build the 40-byte path: [remote][local]
        bytes memory path = abi.encodePacked(amoyReceiver, address(this));

        // 3) wrap the LayerZero send in its own try/catch
        try
            endpoint.send{value: msg.value}(
                AMOY_CHAIN,
                path,
                payload,
                payable(msg.sender),
                address(0),
                bytes("")
            )
        {
            // success
        } catch Error(string memory reason) {
            emit BridgeSendFailed(reason);
            revert(reason);
        } catch {
            emit BridgeSendFailed("bridge send failed");
            revert();
        }
            emit MessageSent(AMOY_CHAIN, path, payload);

    }
}
