// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AlturaNFTLevelerV3.sol";

contract AlturaNFTLevelerV4 is AlturaNFTLevelerV3 {
    address public bridgeAgent;
    event BridgeAgentChanged(address indexed newAgent);

    function initializeV4(address _bridgeAgent) external reinitializer(3) {
        // require(_bridgeAgent != address(0), "zero bridgeAgent");
        bridgeAgent = _bridgeAgent;
        emit BridgeAgentChanged(_bridgeAgent);
    }

    function setBridgeAgent(address _bridgeAgent) external onlyOwner {
        require(_bridgeAgent != address(0), "zero bridgeAgent");
        bridgeAgent = _bridgeAgent;
        emit BridgeAgentChanged(_bridgeAgent);
    }

    function levelUpFromBridge(
        address user,
        uint256 tokenId
    ) external {
        require(msg.sender == bridgeAgent, "caller not bridge");

        levelOf[tokenId] += 1;
        emit LeveledUp(user, tokenId, levelOf[tokenId]);
    }
}
