// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ▶︎ OpenZeppelin upgradeable base contracts:
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// ▶︎ OpenZeppelin’s IERC20 (non-upgradeable, ABI-compatible):
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ▶︎ Minimal ERC-1155 interface for AlturaNFTV3:
interface IAlturaNFTV3 {
    function balanceOf(
        address account,
        uint256 id
    ) external view returns (uint256);
}

/// @title  AlturaNFTLeveler (Upgradeable version)
/// @notice Allows a single “authorized” wallet to charge a per-level ERC-20 fee and increment
///         an on-chain “level” mapping for any ERC-1155 token ID as long as the target user owns it.
///         Now proxy-compatible. Use OpenZeppelin Upgrades (Transparent or UUPS).
contract AlturaNFTLevelerV2 is Initializable, OwnableUpgradeable {
    /// @notice The AlturaNFTV3 contract we read from
    address public altura;

    /// @notice ERC-20 used for fees
    address public paymentToken;

    /// @notice Base cost (in paymentToken’s smallest units) for level 1
    uint256 private _baseCost;

    /// @notice Only this single address can call `levelUp(...)`
    address public authorized;

    /// @notice Mapping: tokenId → current level
    mapping(uint256 => uint256) public levelOf;

    /// @notice Emitted each time someone levels up
    event LeveledUp(
        address indexed user,
        uint256 indexed tokenId,
        uint256 newLevel
    );

    /// @notice Emitted whenever `baseCost` is changed
    event CostChanged(uint256 newBaseCost);

    /// @notice Emitted whenever `authorized` is rotated
    event AuthorizedChanged(address newAuth);

    /// @notice Restricted to the single “authorized” wallet
    modifier onlyAuthorized() {
        require(msg.sender == authorized, "Not authorized to upgrade");
        _;
    }

    /// @notice Proxy-compatible initializer (replaces constructor)
    /// @param _alturaAddress   The deployed AlturaNFTV3 address
    /// @param _paymentToken    ERC-20 used for fees (zero address = no fee)
    /// @param _initialCost     Base fee in paymentToken units for level 1
    /// @param _authorizedAddr  The one wallet allowed to call levelUp
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

    /// @notice Change which address can call `levelUp`.
    function setAuthorized(address _newAuth) external onlyOwner {
        require(_newAuth != address(0), "Zero address not allowed");
        authorized = _newAuth;
        emit AuthorizedChanged(_newAuth);
    }

    /// @notice Adjust the base ERC-20 fee per level 1.
    function setUpgradeCost(uint256 newBase) external onlyOwner {
        _baseCost = newBase;
        emit CostChanged(newBase);
    }

    /// @notice Read‐only: flat base cost for level 1.
    function getBaseCost() external view returns (uint256) {
        return _baseCost;
    }

    /// @notice Read‐only: actual fee to go from current level → next level for `tokenId`.
    /// @dev actualCost = baseCost * (currentLevel + 1).
    function getUpgradeCost(uint256 tokenId) external view returns (uint256) {
        return _baseCost * (levelOf[tokenId] + 1);
    }

    /// @notice Let the single “authorized” wallet bump a user’s level if they own the NFT.
    /// @notice Let the single “authorized” wallet bump a user’s level if they own the NFT.
    /// @param user    The NFT owner whose token is being leveled.
    /// @param tokenId The AlturaNFTV3 token ID to bump.
    /// @param rarity  1=common, 2=rare, 3=legendary (caller must verify off-chain)
    function levelUp(
        address user,
        uint256 tokenId,
        uint8 rarity
    ) public virtual onlyAuthorized {
        // 1) Verify ownership
        require(
            IAlturaNFTV3(altura).balanceOf(user, tokenId) > 0,
            "Target does not own that NFT"
        );

        // 2) Validate rarity
        require(rarity >= 1 && rarity <= 3, "Invalid rarity");

        // 3) Compute dynamic fee: baseCost × (currentLevel + 1) × rarity
        uint256 cost = _baseCost * (levelOf[tokenId] + 1) * uint256(rarity);

        // 4) Charge payment (if any)
        if (cost > 0 && paymentToken != address(0)) {
            require(
                IERC20(paymentToken).transferFrom(user, address(this), cost),
                "Payment failed"
            );
        }

        // 5) Increment level
        levelOf[tokenId] += 1;
        emit LeveledUp(user, tokenId, levelOf[tokenId]);
    }

    /// @notice Read-only: view the current level of a given tokenId.
    function getLevel(uint256 tokenId) external view returns (uint256) {
        return levelOf[tokenId];
    }

    /// @notice Read-only: get the levels for each ID in `tokenIds[]`.
    function getLevels(
        uint256[] calldata tokenIds
    ) external view returns (uint256[] memory) {
        uint256 n = tokenIds.length;
        uint256[] memory levels = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            levels[i] = levelOf[tokenIds[i]];
        }
        return levels;
    }
}

/// @title  AlturaNFTLevelerV3 (adds maxLevel on top of V2)
contract AlturaNFTLevelerV3 is AlturaNFTLevelerV2 {
    /// @notice Global maximum level any tokenId may reach
    uint256 public maxLevel;

    event MaxLevelChanged(uint256 newMax);

    /// @notice New initializer for the V3 upgrade
    function initializeV3(uint256 _maxLevel) external reinitializer(3) {
        maxLevel = _maxLevel;
        emit MaxLevelChanged(_maxLevel);
    }

    /// @notice Owner can raise (or lower) the global max
    function setMaxLevel(uint256 _newMax) external onlyOwner {
        maxLevel = _newMax;
        emit MaxLevelChanged(_newMax);
    }

    /// @notice Override to enforce the cap and forward rarity
    function levelUp(
        address user,
        uint256 tokenId,
        uint8 rarity
    ) public override onlyAuthorized {
        // Enforce max level
        require(levelOf[tokenId] < maxLevel, "Already at maximum level");
        // Delegate to V2 logic (checks ownership, rarity, fee, increments level)
        super.levelUp(user, tokenId, rarity);
    }
}
