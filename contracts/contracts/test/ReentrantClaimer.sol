// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISealedBidAuction {
    function commitBid(uint256 id, bytes32 sealedHash) external payable;
    function revealBid(uint256 id, uint256 amount, bytes32 secret) external;
    function claimRefund(uint256 id) external;
}

/// @notice Test-only contract whose receive() re-enters claimRefund.
contract ReentrantClaimer {
    ISealedBidAuction public auction;
    uint256 public lastId;
    bool public armed;

    constructor(address _auction) {
        auction = ISealedBidAuction(_auction);
    }

    function commit(uint256 id, bytes32 sealedHash) external payable {
        auction.commitBid{value: msg.value}(id, sealedHash);
    }

    function reveal(uint256 id, uint256 amount, bytes32 secret) external {
        auction.revealBid(id, amount, secret);
    }

    function arm() external {
        armed = true;
    }

    function claim(uint256 id) external {
        lastId = id;
        auction.claimRefund(id);
    }

    receive() external payable {
        if (armed) {
            // Try to re-enter. We swallow the revert so the outer call still completes,
            // proving the guard works (the second attempt reverts).
            try auction.claimRefund(lastId) {} catch {}
        }
    }
}
