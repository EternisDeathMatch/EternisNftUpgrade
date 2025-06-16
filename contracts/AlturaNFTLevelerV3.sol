// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AlturaNFTLevelerV2.sol";

contract AlturaNFTLevelerV3 is AlturaNFTLevelerV2 {
    uint256 public maxLevel;
    event MaxLevelChanged(uint256 newMax);

    function initializeV3(uint256 _maxLevel) external reinitializer(2) {
        maxLevel = _maxLevel;
        emit MaxLevelChanged(_maxLevel);
    }

    function setMaxLevel(uint256 _newMax) external onlyOwner {
        maxLevel = _newMax;
        emit MaxLevelChanged(_newMax);
    }

    function levelUp(
        address user,
        uint256 tokenId,
        uint8 rarity
    ) public override onlyAuthorized {
        require(levelOf[tokenId] < maxLevel, "Already at maximum level");
        super.levelUp(user, tokenId, rarity);
    }
}
