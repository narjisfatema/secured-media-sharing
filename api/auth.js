// --- api/auth.js ---
const express = require('express');
const router = express.Router(); // <--- This creates the modular router
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createAuthMiddleware } = require('@bsv/auth-express-middleware');
const { Wallet } = require('@bsv/sdk'); 

// --- Configuration & Initialization ---

// 1. Environment Variables (Set these in a .env file or environment)
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECURE_DEFAULT_SECRET_123'; 
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'http://localhost:3000'; // Your public API base URL
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// 2. Temporary Challenge Store (Use Redis/DB in production)
const challengeStore = {}; 

// 3. Initialize BSV Wallet Client and Middleware
// This Wallet instance is for server-side key lookups and BRC-103 communication, NOT user funds.
const wallet = new Wallet({ 
    wabServerUrl: 'https://wab-ap-1.bsvb.tech', 
    messageBoxServerUrl: 'https://message-box-ap-1.bsvb.tech'
}); 
const bsvAuthMiddleware = createAuthMiddleware({ wallet }); 

// Apply middleware to enable JSON body parsing for all routes in this router
router.use(express.json()); 

// --- Routes Implementation ---

/**
 * 1. POST /api/auth/start
 * Called by the mobile app to initiate the handshake.
 */
router.post('/start', (req, res) => {
    // 1. Generate a unique challenge (nonce)
    const challenge = crypto.randomBytes(32).toString('hex');
    
    // 2. Define the callback URL (where the wallet will POST the signed message)
    const callbackUrl = `${PUBLIC_API_URL}/api/auth/callback`; 

    // 3. Store the challenge's initial status
    challengeStore[challenge] = { 
        status: 'pending', 
        identityKey: null,
        expiresAt: Date.now() + CHALLENGE_EXPIRY_MS
    }; 
    
    res.json({ 
        challenge, 
        callbackUrl, 
        expiresIn: CHALLENGE_EXPIRY_MS 
    });
});


/**
 * 2. POST /api/auth/callback
 * Called by the BSV Desktop Wallet (or WAB service) after the user signs the challenge.
 * The core verification happens here via the bsvAuthMiddleware.
 */
router.post('/callback', bsvAuthMiddleware, (req, res) => {
    const { identityKey } = req.auth; // Provided by the middleware upon successful verification
    const challenge = req.body.challenge;
    
    const challengeData = challengeStore[challenge];

    if (!challengeData || challengeData.status !== 'pending' || challengeData.expiresAt < Date.now()) {
        return res.status(400).send('Invalid, expired, or already-used challenge.');
    }

    // 1. Authentication successful! Update the challenge status
    challengeStore[challenge].status = 'completed';
    challengeStore[challenge].identityKey = identityKey;
    
    // 2. BRC-103 protocol requires a simple OK response to the wallet/callback service
    res.status(200).send('Signature verified.');
});


/**
 * 3. GET /api/auth/status/:challenge
 * Called by the mobile app (polling) to check if the signature was verified.
 */
router.get('/status/:challenge', (req, res) => {
    const challenge = req.params.challenge;
    const challengeData = challengeStore[challenge];
    
    if (!challengeData || challengeData.expiresAt < Date.now()) {
        // Clean up expired challenge before responding
        if (challengeData) delete challengeStore[challenge]; 
        return res.json({ success: false, status: 'expired' });
    }

    if (challengeData.status === 'completed') {
        // Success: Issue a JWT token for future API access
        const jwtToken = jwt.sign(
            { id: challengeData.identityKey }, 
            JWT_SECRET, 
            { expiresIn: '7d' } 
        );
        
        // Clean up the challenge as it's been used
        delete challengeStore[challenge]; 

        return res.json({ 
            success: true, 
            token: jwtToken,
            identityKey: challengeData.identityKey
        });
        
    } else {
        // Still pending
        return res.json({ 
            success: false, 
            status: 'pending',
            message: 'Waiting for wallet signature.' 
        });
    }
});

module.exports = router;