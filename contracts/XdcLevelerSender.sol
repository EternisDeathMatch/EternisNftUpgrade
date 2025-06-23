// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@layerzerolabs/solidity-examples/contracts/lzApp/interfaces/ILayerZeroEndpoint.sol";
import "./SentinelToken.sol";

contract XdcLevelerSender is Ownable {
    /// @notice LayerZero endpoint on XDC
    ILayerZeroEndpoint public immutable endpoint;

    /// @notice SENT token contract
    SentinelToken public sentinel;

    /// @notice only this address can call burnAndLevel
    address public authorized;
    event AuthorizedChanged(address indexed newAuthorized);

    /// @notice destination chain ID (can be updated)
    uint16 public dstChain;
    event DstChainChanged(uint16 newChain);

    /// @notice receiver address on the destination chain, packed into bytes
    bytes public remoteReceiver;
    event RemoteReceiverChanged(bytes newReceiver);

    /// @notice base mint cost in wei (smallest unit of SENT)
    uint256 public baseCost;
    event BaseCostChanged(uint256 newBaseCost);

    /// @notice maximum level allowed
    uint256 public maxLevel;
    event MaxLevelChanged(uint256 newMaxLevel);

    /// @notice Emitted once we've successfully pulled & burned SENT on XDC
    event Burned(address indexed from, uint256 amount);

    /// @notice Emitted once we've requested a level-up
    event LevelUpRequested(
        address indexed user,
        uint256 indexed tokenId,
        uint8 rarity
    );

    /// @notice Emitted once a LayerZero send succeeds
    event MessageSent(uint16 dstChain, bytes path, bytes payload);

    /// @notice Emitted if the ERC20 call reverts
    event ERC20TransferFailed(string reason);

    /// @notice Emitted if the LayerZero send reverts
    event BridgeSendFailed(string reason);

    modifier onlyAuthorized() {
        require(msg.sender == authorized, "Not authorized");
        _;
    }

    /**
     * @param _lzEndpoint       address of the LayerZero endpoint on XDC
     * @param _sentinelToken    address of your SENT ERC-20 on XDC
     * @param _remoteReceiver   address of the remote receiver contract, as bytes
     * @param _baseCost         base cost in wei (e.g. parseUnits("100",18) for 100 SENT)
     * @param _initialDstChain  initial destination chain ID
     * @param _initialMaxLevel  maximum level you wish to allow
     * @param _initialAuth      the wallet permitted to call burnAndLevel
     */
    constructor(
        address _lzEndpoint,
        address _sentinelToken,
        bytes memory _remoteReceiver,
        uint256 _baseCost,
        uint16 _initialDstChain,
        uint256 _initialMaxLevel,
        address _initialAuth
    ) Ownable(msg.sender) {
        require(_initialAuth != address(0), "zero auth");
        endpoint = ILayerZeroEndpoint(_lzEndpoint);
        sentinel = SentinelToken(_sentinelToken);
        remoteReceiver = _remoteReceiver;
        baseCost = _baseCost;
        dstChain = _initialDstChain;
        maxLevel = _initialMaxLevel;
        authorized = _initialAuth;
    }

    /// @notice Owner can change who is authorized to call burnAndLevel
    function setAuthorized(address _newAuth) external onlyOwner {
        require(_newAuth != address(0), "zero address");
        authorized = _newAuth;
        emit AuthorizedChanged(_newAuth);
    }

    function setDstChain(uint16 _newChain) external onlyOwner {
        dstChain = _newChain;
        emit DstChainChanged(_newChain);
    }

    function setRemoteReceiver(bytes calldata _newReceiver) external onlyOwner {
        remoteReceiver = _newReceiver;
        emit RemoteReceiverChanged(_newReceiver);
    }

    function setBaseCost(uint256 _newBase) external onlyOwner {
        baseCost = _newBase;
        emit BaseCostChanged(_newBase);
    }

    function setSentinel(address _newSentinel) external onlyOwner {
        require(_newSentinel != address(0), "zero address");
        sentinel = SentinelToken(_newSentinel);
    }

    function setMaxLevel(uint256 _newMax) external onlyOwner {
        maxLevel = _newMax;
        emit MaxLevelChanged(_newMax);
    }

    /**
     * @notice Query LayerZero for fee estimates
     */
    function estimateFees(
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee) {
        return
            endpoint.estimateFees(
                dstChain,
                address(this),
                _payload,
                _payInZRO,
                _adapterParams
            );
    }

    /**
     * @notice Only `authorized` can call this.
     * It will:
     * 1) pull `cost = baseCost * (currentLevel+1) * rarity` from *user*’s SENT
     * 2) burn that `cost`
     * 3) send a LayerZero message (fee paid by the caller = authorized wallet)
     *
     * @param user           whose NFT is leveling up (must have approved this contract)
     * @param tokenId        the NFT to level
     * @param rarity         multiplier (1..3)
     * @param currentLevel   user’s on-chain level (must be < maxLevel)
     */
    function burnAndLevel(
        address user,
        uint256 tokenId,
        uint8 rarity,
        uint256 currentLevel
    ) external payable onlyAuthorized {
        require(rarity >= 1 && rarity <= 3, "Invalid rarity");
        require(currentLevel < maxLevel, "Already at max");

        // calculate exact burn amount
        uint256 cost = baseCost * (currentLevel + 1) * uint256(rarity);

        // 1) pull SENT from the *user*
        try sentinel.transferFrom(user, address(this), cost) returns (bool ok) {
            require(ok, "ERC20 returned false");
        } catch Error(string memory reason) {
            emit ERC20TransferFailed(reason);
            revert(reason);
        } catch {
            emit ERC20TransferFailed("ERC20 transfer failed");
            revert();
        }

        // 2) burn it
        try sentinel.burn(cost) {
            /* burned */
        } catch Error(string memory reason) {
            emit ERC20TransferFailed(reason);
            revert(reason);
        } catch {
            emit ERC20TransferFailed("ERC20 burn failed");
            revert();
        }
        emit Burned(user, cost);
        emit LevelUpRequested(user, tokenId, rarity);

        // 3) send cross-chain message (caller supplies msg.value)
        bytes memory payload = abi.encode(user, tokenId, rarity);
        bytes memory path = abi.encodePacked(remoteReceiver, address(this));

        try
            endpoint.send{value: msg.value}(
                dstChain,
                path,
                payload,
                payable(msg.sender),
                address(0),
                bytes("")
            )
        {
            /* success */
        } catch Error(string memory reason) {
            emit BridgeSendFailed(reason);
            revert(reason);
        } catch {
            emit BridgeSendFailed("bridge send failed");
            revert();
        }

        emit MessageSent(dstChain, path, payload);
    }
}
