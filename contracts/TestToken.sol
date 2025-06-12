// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice A simple ERC-20 token with pausing and minting by the owner.
///         - Inherits ERC20("TestToken","TTKN")
///         - Inherits ERC20Pausable
///         - Inherits Ownable(initialOwner)
contract TestToken is ERC20, ERC20Pausable, Ownable {
    constructor(address initialOwner)
        ERC20("TestToken", "TTKN")
        Ownable(initialOwner)
    {}

    /// @notice Pause all transfers. Only the owner can call.
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpause transfers. Only the owner can call.
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Mint new tokens. Only the owner can call.
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // --------------------------------------------------------------------
    // Override the ERC-20 / ERC-20Pausable hook `_update`. Both base
    // classes define `_update(address,address,uint256)` so we must override it here.
    //
    // We call `super._update(...)` to include any Pausable logic.
    // --------------------------------------------------------------------
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, amount);
    }
}
