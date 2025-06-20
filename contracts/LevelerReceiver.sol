// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";
import "./AlturaNFTLevelerV4.sol";

contract LevelerReceiver is NonblockingLzApp {
    /// @notice Leveler contract that can only be called by this bridge
    AlturaNFTLevelerV4 public leveler;

    /// @notice Emitted when we successfully level up
    event ReceivedAndLeveled(address indexed user, uint256 indexed tokenId);

    /// @notice Emitted if the bridge call to `levelUpFromBridge` reverts
    event LevelUpFailed(
        address indexed user,
        uint256 indexed tokenId,
        string reason
    );

    event LevelerNotSet(
        string text
    );

    /// @param _endpoint LayerZero endpoint on the destination chain
    /// @param _leveler  Your deployed AlturaNFTLevelerV4 proxy address
    constructor(
        address _endpoint,
        address _leveler
    ) NonblockingLzApp(_endpoint) Ownable(msg.sender) {
        // require(_leveler != address(0), "Leveler zero address");
        if (_leveler == address(0)) {
            emit LevelerNotSet("Leveler not set it is zero address");
            _leveler = address(0);
        }else {
            leveler = AlturaNFTLevelerV4(_leveler);
        }
    }

    /**
     * @notice Owner can update the Leveler contract address
     * @param _newLeveler new address of AlturaNFTLevelerV4
     */
    function setLeveler(address _newLeveler) external onlyOwner {
        require(_newLeveler != address(0), "Leveler zero address");
        leveler = AlturaNFTLevelerV4(_newLeveler);
    }

    function _nonblockingLzReceive(
        uint16, // srcChainId
        bytes memory, // srcAddress
        uint64, // nonce
        bytes memory payload
    ) internal override {
        (address user, uint256 tokenId, uint8 rarity) = abi.decode(
            payload,
            (address, uint256, uint8)
        );

        // wrap the bridge-only levelUp in try/catch
        try leveler.levelUpFromBridge(user, tokenId) {
            emit ReceivedAndLeveled(user, tokenId);
        } catch Error(string memory reason) {
            // revert with a reason string
            emit LevelUpFailed(user, tokenId, reason);
        } catch {
            // no reason
            emit LevelUpFailed(user, tokenId, "levelUpFromBridge failed");
        }
    }
}
