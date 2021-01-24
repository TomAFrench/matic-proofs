pragma solidity 0.6.6;

import {MerklePatriciaProof} from "../lib/MerklePatriciaProof.sol";

contract TestMerklePatriciaProof {
    function verify(
        bytes memory value,
        bytes memory encodedPath,
        bytes memory rlpParentNodes,
        bytes32 root
    ) public view returns (bool) {
        return MerklePatriciaProof.verify(value, encodedPath, rlpParentNodes, root);       
    }
}