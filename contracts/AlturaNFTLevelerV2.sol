// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAlturaNFTV3 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

contract AlturaNFTLevelerV2 is Initializable, OwnableUpgradeable {
    address public altura;
    address public paymentToken;
    uint256 private _baseCost;
    address public authorized;
    mapping(uint256 => uint256) public levelOf;

    event LeveledUp(address indexed user, uint256 indexed tokenId, uint256 newLevel);
    event CostChanged(uint256 newBaseCost);
    event AuthorizedChanged(address newAuth);

    modifier onlyAuthorized() {
        require(msg.sender == authorized, "Not authorized to upgrade");
        _;
    }

    function initialize(
        address _alturaAddress,
        address _paymentToken,
        uint256 _initialCost,
        address _authorizedAddr
    ) public initializer {
        require(_alturaAddress != address(0), "Invalid Altura address");
        require(_authorizedAddr != address(0), "Invalid authorized address");

        __Ownable_init(msg.sender);

        altura = _alturaAddress;
        paymentToken = _paymentToken;
        _baseCost = _initialCost;
        authorized = _authorizedAddr;
    }

    function setAuthorized(address _newAuth) external onlyOwner {
        require(_newAuth != address(0), "Zero address not allowed");
        authorized = _newAuth;
        emit AuthorizedChanged(_newAuth);
    }

    function setUpgradeCost(uint256 newBase) external onlyOwner {
        _baseCost = newBase;
        emit CostChanged(newBase);
    }

    function getBaseCost() external view returns (uint256) {
        return _baseCost;
    }

    function getUpgradeCost(uint256 tokenId) external view returns (uint256) {
        return _baseCost * (levelOf[tokenId] + 1);
    }

    function levelUp(
        address user,
        uint256 tokenId,
        uint8 rarity
    ) public virtual onlyAuthorized {
        require(IAlturaNFTV3(altura).balanceOf(user, tokenId) > 0, "Target does not own that NFT");
        require(rarity >= 1 && rarity <= 3, "Invalid rarity");

        uint256 cost = _baseCost * (levelOf[tokenId] + 1) * uint256(rarity);
        if (cost > 0 && paymentToken != address(0)) {
            require(IERC20(paymentToken).transferFrom(user, address(this), cost), "Payment failed");
        }

        levelOf[tokenId] += 1;
        emit LeveledUp(user, tokenId, levelOf[tokenId]);
    }

    function getLevel(uint256 tokenId) external view returns (uint256) {
        return levelOf[tokenId];
    }

    function getLevels(uint256[] calldata tokenIds) external view returns (uint256[] memory) {
        uint256 n = tokenIds.length;
        uint256[] memory levels = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            levels[i] = levelOf[tokenIds[i]];
        }
        return levels;
    }
}
