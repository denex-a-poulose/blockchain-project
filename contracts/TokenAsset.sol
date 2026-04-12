// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenAsset is ERC20, Ownable {
    uint8 private _customDecimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimalsValue,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _customDecimals = decimalsValue;
    }

    // Override the default 18 decimals from OpenZeppelin if the user selected something else
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }

    // Secure minting function restricted to the core Treasury Wallet
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
