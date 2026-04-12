const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const verifyAuthToken = require('../middleware/authMiddleware');
const solc = require('solc');

/* ─── helpers ─── */
async function checkMembership(db, userId, tenantId) {
  const snapshot = await db.collection('user_tenants')
    .where('userId', '==', userId)
    .where('tenantId', '==', tenantId)
    .get();
  return !snapshot.empty;
}

function generateSoliditySource(name, symbol, decimalsValue) {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenAsset is ERC20, Ownable {
    uint8 private _customDecimals;

    constructor(
        address initialOwner
    ) ERC20("${name}", "${symbol}") Ownable(initialOwner) {
        _customDecimals = ${decimalsValue};
    }

    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`;
}

// Inline OpenZeppelin sources so solc can resolve imports without filesystem access
function getOpenZeppelinSources() {
  const fs = require('fs');
  const path = require('path');
  const ozBase = path.resolve(__dirname, '..', 'node_modules', '@openzeppelin', 'contracts');

  const files = {
    '@openzeppelin/contracts/token/ERC20/ERC20.sol': path.join(ozBase, 'token', 'ERC20', 'ERC20.sol'),
    '@openzeppelin/contracts/token/ERC20/IERC20.sol': path.join(ozBase, 'token', 'ERC20', 'IERC20.sol'),
    '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol': path.join(ozBase, 'token', 'ERC20', 'extensions', 'IERC20Metadata.sol'),
    '@openzeppelin/contracts/utils/Context.sol': path.join(ozBase, 'utils', 'Context.sol'),
    '@openzeppelin/contracts/access/Ownable.sol': path.join(ozBase, 'access', 'Ownable.sol'),
    '@openzeppelin/contracts/interfaces/draft-IERC6093.sol': path.join(ozBase, 'interfaces', 'draft-IERC6093.sol'),
  };

  const sources = {};
  for (const [key, filePath] of Object.entries(files)) {
    sources[key] = { content: fs.readFileSync(filePath, 'utf8') };
  }
  return sources;
}

function compileSolidity(soliditySource) {
  const ozSources = getOpenZeppelinSources();

  const input = {
    language: 'Solidity',
    sources: {
      'TokenAsset.sol': { content: soliditySource },
      ...ozSources,
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        'TokenAsset.sol': {
          'TokenAsset': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for errors (warnings are OK)
  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    if (fatal.length > 0) {
      throw new Error('Solidity compilation failed: ' + fatal.map(e => e.formattedMessage).join('\n'));
    }
  }

  const contract = output.contracts['TokenAsset.sol']['TokenAsset'];
  if (!contract) throw new Error('Compilation produced no output for TokenAsset.');

  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

/* ═══════════════════════════════════════════════════
   GET /:tenantId — List all tokens for a tenant
   ═══════════════════════════════════════════════════ */
router.get('/:tenantId', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const snap = await db.collection('tokens')
      .where('tenantId', '==', tenantId)
      .get();

    const tokens = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    tokens.sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));

    res.status(200).json(tokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ═══════════════════════════════════════════════════
   POST /:tenantId — Create token (status: pending)
   ═══════════════════════════════════════════════════ */
router.post('/:tenantId', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      name, symbol, decimals, description, walletId,
      mainCurrency, pricePerToken, softCap, hardCap, minInvestment,
    } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    // ── Validate name ──
    const nameStr = typeof name === 'string' ? name.trim() : '';
    if (nameStr.length < 3 || !/^[A-Za-z0-9 ]+$/.test(nameStr)) {
      return res.status(400).json({ error: 'Token name must be at least 3 characters and alphanumeric.' });
    }

    // ── Validate symbol ──
    const symbolStr = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';
    if (symbolStr.length < 2 || symbolStr.length > 8 || !/^[A-Z0-9]+$/.test(symbolStr)) {
      return res.status(400).json({ error: 'Token symbol must be 2-8 alphanumeric characters.' });
    }

    // ── Validate wallet ──
    if (!walletId || typeof walletId !== 'string') {
      return res.status(400).json({ error: 'walletId is required.' });
    }
    const walletDoc = await db.collection('tenant_wallets').doc(walletId).get();
    if (!walletDoc.exists) return res.status(404).json({ error: 'Wallet not found.' });
    const walletData = walletDoc.data();
    if (walletData.tenantId !== tenantId || walletData.status !== 'active') {
      return res.status(403).json({ error: 'Wallet is inactive or does not belong to this organization.' });
    }

    // ── Validate decimals ──
    const dec = decimals === undefined || decimals === '' ? 18 : Number(decimals);
    if (!Number.isInteger(dec) || dec < 0 || dec > 18) {
      return res.status(400).json({ error: 'Decimals must be 0-18.' });
    }

    // ── Validate pricing ──
    const currencyStr = typeof mainCurrency === 'string' ? mainCurrency.trim().toUpperCase() : '';
    if (!currencyStr) return res.status(400).json({ error: 'Main currency is required.' });

    const priceStr = typeof pricePerToken === 'string' ? pricePerToken.trim() : String(pricePerToken ?? '');
    if (!priceStr || !/^\d+(\.\d+)?$/.test(priceStr)) {
      return res.status(400).json({ error: 'Price per token must be a valid number.' });
    }

    const softCapStr = typeof softCap === 'string' ? softCap.trim() : String(softCap ?? '');
    if (softCapStr !== '' && !/^\d+(\.\d+)?$/.test(softCapStr)) {
      return res.status(400).json({ error: 'Soft cap must be a valid number.' });
    }

    const hardCapStr = typeof hardCap === 'string' ? hardCap.trim() : String(hardCap ?? '');
    if (hardCapStr !== '' && !/^\d+(\.\d+)?$/.test(hardCapStr)) {
      return res.status(400).json({ error: 'Hard cap must be a valid number.' });
    }

    const minInvStr = typeof minInvestment === 'string' ? minInvestment.trim() : String(minInvestment ?? '');
    if (minInvStr !== '' && !/^\d+(\.\d+)?$/.test(minInvStr)) {
      return res.status(400).json({ error: 'Minimum investment must be a valid number.' });
    }

    // ── Organization embed ──
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) return res.status(404).json({ error: 'Organization not found.' });
    const tenantData = tenantDoc.data();
    const organization = {
      id: tenantDoc.id,
      name: tenantData.name || 'Unnamed Organization',
      createdAt: tenantData.createdAt || null,
      status: tenantData.status || null,
      ownerId: tenantData.ownerId || null,
    };

    // ── Create with status: pending ──
    const docRef = db.collection('tokens').doc();
    const payload = {
      id: docRef.id,
      tenantId,
      organization,
      walletId,
      name: nameStr,
      symbol: symbolStr,
      decimals: dec,
      description: typeof description === 'string' ? description.trim().slice(0, 200) : '',
      mainCurrency: currencyStr,
      pricePerToken: priceStr,
      softCap: softCapStr,
      hardCap: hardCapStr,
      minInvestment: minInvStr,
      status: 'pending',
      abi: null,
      bytecode: null,
      soliditySource: null,
      contractAddress: null,
      transactionHash: null,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);
    res.status(201).json({ ...payload, id: docRef.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ═══════════════════════════════════════════════════
   POST /:tenantId/:tokenId/compile — Compile contract
   ═══════════════════════════════════════════════════ */
router.post('/:tenantId/:tokenId/compile', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId, tokenId } = req.params;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const tokenRef = db.collection('tokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();
    if (!tokenDoc.exists) return res.status(404).json({ error: 'Token not found.' });

    const tokenData = tokenDoc.data();
    if (tokenData.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Token does not belong to this organization.' });
    }
    if (tokenData.status !== 'pending' && tokenData.status !== 'failed') {
      return res.status(400).json({ error: `Cannot compile a token with status "${tokenData.status}".` });
    }

    // Generate & compile
    const soliditySource = generateSoliditySource(tokenData.name, tokenData.symbol, tokenData.decimals);
    const { abi, bytecode } = compileSolidity(soliditySource);

    await tokenRef.update({
      soliditySource,
      abi: JSON.stringify(abi),
      bytecode,
      status: 'compiled',
      compiledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      id: tokenId,
      status: 'compiled',
      abi,
      bytecode,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Compilation failed.' });
  }
});

/* ═══════════════════════════════════════════════════
   PATCH /:tenantId/:tokenId/deploy — Mark deploying
   ═══════════════════════════════════════════════════ */
router.patch('/:tenantId/:tokenId/deploy', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId, tokenId } = req.params;
    const { transactionHash } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    if (!transactionHash || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({ error: 'Valid transactionHash is required.' });
    }

    const tokenRef = db.collection('tokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();
    if (!tokenDoc.exists) return res.status(404).json({ error: 'Token not found.' });

    const tokenData = tokenDoc.data();
    if (tokenData.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Token does not belong to this organization.' });
    }
    if (tokenData.status !== 'compiled') {
      return res.status(400).json({ error: `Cannot deploy a token with status "${tokenData.status}". Compile first.` });
    }

    await tokenRef.update({
      transactionHash,
      status: 'deploying',
      deployedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ id: tokenId, status: 'deploying', transactionHash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ═══════════════════════════════════════════════════
   PATCH /:tenantId/:tokenId/confirm — Confirm deployed
   ═══════════════════════════════════════════════════ */
router.patch('/:tenantId/:tokenId/confirm', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId, tokenId } = req.params;
    const { contractAddress } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return res.status(400).json({ error: 'Valid contractAddress is required.' });
    }

    const tokenRef = db.collection('tokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();
    if (!tokenDoc.exists) return res.status(404).json({ error: 'Token not found.' });

    const tokenData = tokenDoc.data();
    if (tokenData.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Token does not belong to this organization.' });
    }
    if (tokenData.status !== 'deploying') {
      return res.status(400).json({ error: `Cannot confirm a token with status "${tokenData.status}".` });
    }

    await tokenRef.update({
      contractAddress,
      status: 'deployed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ id: tokenId, status: 'deployed', contractAddress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* ═══════════════════════════════════════════════════
   PATCH /:tenantId/:tokenId/fail — Mark failed
   ═══════════════════════════════════════════════════ */
router.patch('/:tenantId/:tokenId/fail', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId, tokenId } = req.params;
    const { reason } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const tokenRef = db.collection('tokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();
    if (!tokenDoc.exists) return res.status(404).json({ error: 'Token not found.' });

    const tokenData = tokenDoc.data();
    if (tokenData.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Token does not belong to this organization.' });
    }

    await tokenRef.update({
      status: 'failed',
      failReason: typeof reason === 'string' ? reason.slice(0, 300) : 'Unknown error',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ id: tokenId, status: 'failed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
