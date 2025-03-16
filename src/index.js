require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const {
    createDID,
    resolveDID,
    revokeDID,
    issueBuildingCredential,
    fetchAllBuildingCredentials,
    updateBuildingCredential,
    deleteBuildingCredential
} = require('./didController');

const PORT = process.env.PORT || 3000;
const ALCHEMY_API_URL = process.env.ALCHEMY_API_URL;
const FIXED_PRIVATE_KEY = process.env.FIXED_PRIVATE_KEY;
const HOLESKY_CHAIN_ID = 17000; // Holesky testnet chainId (example)

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// =========================
// Swagger Setup
// =========================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// =========================
// Routes
// =========================

// 1a. Create DID from fixed private key
app.post('/did/owner', async (req, res) => {
    try {
        const result = await createDID(ALCHEMY_API_URL, HOLESKY_CHAIN_ID, FIXED_PRIVATE_KEY);
        res.status(200).json({
            message: 'DID created successfully',
            did: result.did
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.message});
    }
});

// 1b. Create DID from random wallet key
app.post('/did/subject', async (req, res) => {
    try {
        const result = await createDID(ALCHEMY_API_URL, HOLESKY_CHAIN_ID, null);
        res.status(200).json({
            message: 'DID created successfully',
            did: result.did
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.message});
    }
});

// 2. Resolve DID
app.get('/did/resolve', async (req, res) => {
    try {
        const {address} = req.query;
        if (!address) {
            res.status(400).json({error: 'Missing address query param'});
        } else {
            const result = await resolveDID(address);
            res.status(200).json({
                message: 'DID resolved successfully',
                didDocument: result.didDocument
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.message});
    }
});

// 3. Revoke DID
app.delete('/did/revoke', async (req, res) => {
    try {
        const {address} = req.query;
        if (!address) {
            res.status(400).json({error: 'Missing address query param'});
        } else {
            const result = await revokeDID(address);
            res.status(200).json({
                message: 'DID revoked successfully',
                transactionHash: result.transactionHash
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.message});
    }
});

// 6. Issue a verifiable credential
app.post('/vc', async (req, res) => {
    try {
        const buildingData = req.body;
        const result = await issueBuildingCredential(buildingData, FIXED_PRIVATE_KEY);

        res.status(200).json({
            message: 'Building credential issued',
            result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: error.message});
    }
});

// Fetch all VCs
app.get('/vc', (req, res) => {
    try {
        const credentials = fetchAllBuildingCredentials();
        res.status(200).json({
            message: 'Building credentials fetched successfully',
            credentials
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: error.message});
    }
});

// Update a specific VC by ID
app.put('/vc/:id', (req, res) => {
    try {
        const vcId = req.params.id;
        const newData = req.body;
        const updatedVC = updateBuildingCredential(vcId, newData);

        res.status(200).json({
            message: 'Building credential updated',
            credential: updatedVC
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: error.message});
    }
});

// Delete a specific VC by ID
app.delete('/vc/:id', (req, res) => {
    try {
        const vcId = req.params.id;
        deleteBuildingCredential(vcId);

        res.status(200).json({
            message: 'Building credential deleted'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: error.message});
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger running on:  http://localhost:${PORT}/api-docs/`);
});
