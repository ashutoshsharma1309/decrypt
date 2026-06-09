// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title  SealedBidAuction
/// @notice Vickrey (second-price) sealed-bid auction for ERC-721 NFTs.
///         Phase 1 (Commit): bidders submit keccak256(amount, secret, bidder) + ETH deposit.
///         Phase 2 (Reveal): bidders disclose (amount, secret); contract verifies hash.
///         Finalize: highest revealed bidder wins, pays second-highest revealed bid.
contract SealedBidAuction is IERC721Receiver, ReentrancyGuard {
    enum Phase {
        Inactive,
        Commit,
        Reveal,
        Finalized
    }

    struct Bid {
        bytes32 sealedHash;
        uint256 deposit;
        uint256 revealedAmount;
        bool revealed;
        bool refunded;
    }

    struct Auction {
        address seller;
        address nft;
        uint256 tokenId;
        uint256 commitDeadline;
        uint256 revealDeadline;
        uint256 minBid;
        uint256 minDeposit;
        address highestBidder;
        uint256 highestBid;
        uint256 secondBid;
        Phase phase;
        bool finalized;
        address[] bidders;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => Bid)) public bids;
    uint256 public nextAuctionId;

    // Admin role — only admins can list new auctions. Bidder mechanics remain open to anyone.
    mapping(address => bool) public admins;
    uint256 public adminCount;

    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event AdminTransferred(address indexed from, address indexed to);

    constructor() {
        admins[msg.sender] = true;
        adminCount = 1;
        emit AdminAdded(msg.sender);
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "SealedBidAuction: not admin");
        _;
    }

    function addAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero address");
        require(!admins[newAdmin], "already admin");
        admins[newAdmin] = true;
        adminCount++;
        emit AdminAdded(newAdmin);
    }

    function removeAdmin(address adminToRemove) external onlyAdmin {
        require(adminToRemove != msg.sender, "cannot remove self");
        require(admins[adminToRemove], "not an admin");
        require(adminCount > 1, "cannot remove last admin");
        admins[adminToRemove] = false;
        adminCount--;
        emit AdminRemoved(adminToRemove);
    }

    function isAdmin(address account) external view returns (bool) {
        return admins[account];
    }

    /// @notice Atomically shift admin permission from caller to `newAdmin`.
    ///         Caller loses admin; `newAdmin` gains it. Net adminCount unchanged,
    ///         so this works even when caller is the sole admin.
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero address");
        require(newAdmin != msg.sender, "same admin");
        require(!admins[newAdmin], "already admin");

        admins[newAdmin] = true;
        admins[msg.sender] = false;
        // adminCount is unchanged: +1 for newAdmin, -1 for caller.

        emit AdminAdded(newAdmin);
        emit AdminRemoved(msg.sender);
        emit AdminTransferred(msg.sender, newAdmin);
    }

    event AuctionCreated(
        uint256 indexed id,
        address indexed seller,
        address nft,
        uint256 tokenId,
        uint256 commitDeadline,
        uint256 revealDeadline,
        uint256 minBid
    );
    event BidCommitted(uint256 indexed id, address indexed bidder, bytes32 sealedHash, uint256 deposit);
    event BidRevealed(uint256 indexed id, address indexed bidder, uint256 amount);
    event AuctionFinalized(uint256 indexed id, address winner, uint256 winningPrice);
    event RefundClaimed(uint256 indexed id, address indexed bidder, uint256 amount);
    event AuctionCancelled(uint256 indexed id);

    // ---------------------------------------------------------------------
    // Auction lifecycle
    // ---------------------------------------------------------------------

    function createAuction(
        address nft,
        uint256 tokenId,
        uint256 commitDuration,
        uint256 revealDuration,
        uint256 minBid,
        uint256 minDeposit
    ) external onlyAdmin returns (uint256 id) {
        require(commitDuration > 0, "commit duration zero");
        require(revealDuration > 0, "reveal duration zero");
        require(minDeposit >= minBid, "minDeposit < minBid");

        id = nextAuctionId++;
        Auction storage a = auctions[id];
        a.seller = msg.sender;
        a.nft = nft;
        a.tokenId = tokenId;
        a.commitDeadline = block.timestamp + commitDuration;
        a.revealDeadline = a.commitDeadline + revealDuration;
        a.minBid = minBid;
        a.minDeposit = minDeposit;
        a.phase = Phase.Commit;
        // Initialize secondBid = minBid so a single revealer naturally pays minBid.
        a.secondBid = minBid;

        // Pull NFT into custody. Caller must have approved this contract.
        IERC721(nft).safeTransferFrom(msg.sender, address(this), tokenId);

        emit AuctionCreated(id, msg.sender, nft, tokenId, a.commitDeadline, a.revealDeadline, minBid);
    }

    function commitBid(uint256 id, bytes32 sealedHash) external payable nonReentrant {
        Auction storage a = auctions[id];
        require(a.phase == Phase.Commit, "not commit phase");
        require(block.timestamp <= a.commitDeadline, "commit ended");
        require(msg.value >= a.minDeposit, "deposit < minDeposit");
        require(sealedHash != bytes32(0), "empty hash");
        require(bids[id][msg.sender].sealedHash == bytes32(0), "already committed");

        bids[id][msg.sender] = Bid({
            sealedHash: sealedHash,
            deposit: msg.value,
            revealedAmount: 0,
            revealed: false,
            refunded: false
        });
        a.bidders.push(msg.sender);

        emit BidCommitted(id, msg.sender, sealedHash, msg.value);
    }

    function revealBid(uint256 id, uint256 amount, bytes32 secret) external nonReentrant {
        Auction storage a = auctions[id];

        // Auto-advance phase if commit window has closed.
        if (a.phase == Phase.Commit && block.timestamp > a.commitDeadline) {
            a.phase = Phase.Reveal;
        }
        require(a.phase == Phase.Reveal, "not reveal phase");
        require(block.timestamp <= a.revealDeadline, "reveal ended");

        Bid storage b = bids[id][msg.sender];
        require(b.sealedHash != bytes32(0), "no commit");
        require(!b.revealed, "already revealed");

        bytes32 check = keccak256(abi.encodePacked(amount, secret, msg.sender));
        require(check == b.sealedHash, "invalid reveal");

        require(amount <= b.deposit, "amount exceeds deposit");
        require(amount >= a.minBid, "amount < minBid");

        b.revealed = true;
        b.revealedAmount = amount;

        if (amount > a.highestBid) {
            // Only bump secondBid above its minBid floor on the second real bid.
            if (a.highestBidder != address(0)) {
                a.secondBid = a.highestBid;
            }
            a.highestBid = amount;
            a.highestBidder = msg.sender;
        } else if (amount > a.secondBid) {
            a.secondBid = amount;
        }

        emit BidRevealed(id, msg.sender, amount);
    }

    function finalizeAuction(uint256 id) external nonReentrant {
        Auction storage a = auctions[id];
        require(!a.finalized, "already finalized");
        require(block.timestamp > a.revealDeadline, "reveal not ended");

        a.finalized = true;
        a.phase = Phase.Finalized;

        if (a.highestBidder != address(0)) {
            // Winner pays second-highest (or minBid if only one revealer).
            uint256 winningPrice = a.secondBid;

            // NFT to winner.
            IERC721(a.nft).safeTransferFrom(address(this), a.highestBidder, a.tokenId);

            // Forfeit non-revealers' deposits to the seller.
            uint256 forfeits = 0;
            address[] storage bs = a.bidders;
            for (uint256 i = 0; i < bs.length; i++) {
                Bid storage b = bids[id][bs[i]];
                if (!b.revealed) {
                    forfeits += b.deposit;
                    // Mark refunded so claimRefund returns 0 to non-revealers.
                    b.refunded = true;
                }
            }

            uint256 sellerProceeds = winningPrice + forfeits;
            (bool ok, ) = a.seller.call{value: sellerProceeds}("");
            require(ok, "seller transfer failed");

            emit AuctionFinalized(id, a.highestBidder, winningPrice);
        } else {
            // No valid reveals — return NFT to seller.
            IERC721(a.nft).safeTransferFrom(address(this), a.seller, a.tokenId);
            emit AuctionFinalized(id, address(0), 0);
        }
    }

    function claimRefund(uint256 id) external nonReentrant {
        Auction storage a = auctions[id];
        require(a.finalized, "not finalized");

        Bid storage b = bids[id][msg.sender];
        require(!b.refunded, "already refunded");
        require(b.sealedHash != bytes32(0), "no bid");

        uint256 refund;
        if (msg.sender == a.highestBidder) {
            refund = b.deposit - a.secondBid;
        } else if (b.revealed) {
            refund = b.deposit;
        } else {
            // Should be unreachable: non-revealers have b.refunded = true after finalize.
            refund = 0;
        }

        b.refunded = true;

        if (refund > 0) {
            (bool ok, ) = msg.sender.call{value: refund}("");
            require(ok, "refund transfer failed");
        }

        emit RefundClaimed(id, msg.sender, refund);
    }

    function cancelAuction(uint256 id) external {
        Auction storage a = auctions[id];
        require(msg.sender == a.seller, "not seller");
        require(!a.finalized, "already finalized");
        require(a.bidders.length == 0, "bids exist");
        require(block.timestamp < a.commitDeadline, "commit ended");

        a.finalized = true;
        a.phase = Phase.Finalized;

        IERC721(a.nft).safeTransferFrom(address(this), a.seller, a.tokenId);

        emit AuctionCancelled(id);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getBidders(uint256 id) external view returns (address[] memory) {
        return auctions[id].bidders;
    }

    function biddersCount(uint256 id) external view returns (uint256) {
        return auctions[id].bidders.length;
    }

    /// @notice Computed phase respecting current timestamp (state may lag until next tx).
    function getCurrentPhase(uint256 id) external view returns (Phase) {
        Auction storage a = auctions[id];
        if (a.finalized) return Phase.Finalized;
        if (a.seller == address(0)) return Phase.Inactive;
        if (block.timestamp <= a.commitDeadline) return Phase.Commit;
        if (block.timestamp <= a.revealDeadline) return Phase.Reveal;
        return Phase.Finalized; // post-reveal, awaiting finalize() — UI will show "Awaiting Finalize"
    }

    // ---------------------------------------------------------------------
    // ERC-721 receiver
    // ---------------------------------------------------------------------

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
