const {ethers} = require('ethers');
const EthrDID = require('ethr-did').EthrDID;
const {createVerifiableCredentialJwt, verifyCredential} = require('did-jwt-vc');
const {Resolver} = require('did-resolver');
const {getResolver} = require('ethr-did-resolver');
const {v4: uuidv4} = require('uuid');

const ALCHEMY_API_URL = process.env.ALCHEMY_API_URL;
const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS;
const HOLESKY_CHAIN_ID = 17000;

// In-memory store for building credentials
const buildingCredentials = [];

// We'll keep references here so we don't constantly recreate them
let fixedDidInstance = null;
let randomDidInstance = null;

// DID Resolver for ethr-did
const ethrResolver = getResolver({
    name: 'holesky',
    chainId: HOLESKY_CHAIN_ID,
    rpcUrl: ALCHEMY_API_URL,
    registry: REGISTRY_ADDRESS
});

const didResolver = new Resolver(ethrResolver);

/**
 * createDid:
 *   - If 'privateKey' is provided, create a DID using that private key
 *     and store it in 'fixedDidInstance'.
 *   - If 'privateKey' is not provided, generate a random wallet
 *     and store that DID in 'randomDidInstance'.
 *
 * @param {string} providerUrl - e.g. your Alchemy Holesky testnet URL
 * @param {number} chainId     - e.g. 17000 for Holesky
 * @param {string} [privateKey] - optional. If provided => "fixed" DID
 */
async function createDID(providerUrl, chainId, privateKey) {
    const start = Date.now();

    const provider = new ethers.JsonRpcProvider(providerUrl);

    let didInstance;
    let walletPrivateKey;

    if (privateKey) {
        walletPrivateKey = privateKey;
        const wallet = new ethers.Wallet(walletPrivateKey, provider);
        // Create DID from the given (fixed) private key
        didInstance = new EthrDID({
            identifier: wallet.address,
            privateKey: walletPrivateKey,
            provider,
            chainNameOrId: HOLESKY_CHAIN_ID,
        });
        fixedDidInstance = didInstance.did; // store as "fixed" DID
        console.log(`Owner from predefined wallet`);
        console.log(`DID Owner: `, fixedDidInstance);

    } else {
        // Generate a random DID
        const wallet = ethers.Wallet.createRandom();
        didInstance = new EthrDID({
            identifier: wallet.address,
            privateKey: wallet.privateKey,
            provider,
            chainNameOrId: chainId,
        });
        randomDidInstance = didInstance.did; // store as "random" DID
        walletPrivateKey = wallet.privateKey;
        console.log(`Subject from generated wallet`);
        console.log(`DID Subject: `, randomDidInstance);
    }

    const end = Date.now();
    console.log(`[createDid] Execution time: ${end - start} ms`);

    return {
        did: didInstance.did,
        privateKey: walletPrivateKey, // Return for demonstration; omit in production for security
    };
}

/**
 * Resolve the DID.
 * For demonstration, we only show the "owner" from the registry.
 */
async function resolveDID(did) {

    let didInstance = did;

    const start = Date.now();

    try {
        doc = await didResolver.resolve(didInstance);
        console.log("DID: " + didInstance);
        console.log("DID resolved successfully: " + doc.didDocument);
    } catch (error) {
        console.error(error);
    }

    const end = Date.now();
    console.log(`[resolveFixedDid] Execution time: ${end - start} ms`);

    return {
        didDocument: {
            did: didInstance.did,
            doc,
        },
    };
}

async function revokeDID(did) {

    let didInstance = did;

    const start = Date.now();

    const txReceipt = await didInstance.setOwner(
        "0x000000000000000000000000000000000000dEaD"
    );
    await txReceipt.wait();

    // Clear the local instance
    didInstance = null;

    const end = Date.now();
    console.log(`[revokeDID] Execution time: ${end - start} ms`);

    return {
        transactionHash: txReceipt.hash,
    };
}

/**
 * Issue a building credential referencing IFC for building materials, energy efficiency, etc.
 * - Issuer: didInstances.fixed
 * - Subject: didInstances.random
 */
async function issueBuildingCredential(buildingData) {
    const fixedDid = didInstances.fixed;
    const randomDid = didInstances.random;

    if (!fixedDid) {
        throw new Error("Fixed DID is not initialized. Please create it first.");
    }
    if (!randomDid) {
        throw new Error("Random DID is not initialized. Please create it first.");
    }

    const start = Date.now();

    // Build the credential payload referencing an IFC ontology in @context
    const vcPayload = {
        sub: randomDid.did,
        nbf: Math.floor(Date.now() / 1000),
        vc: {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://standards.buildingsmart.org/IFC/DEV/IFC4_3/RC3/OWL"
            ],
            type: ["VerifiableCredential", "BuildingCredential"],
            credentialSubject: {
                ...buildingData
            }
        }
    };

    // Sign with the fixed DID
    const jwt = await createVerifiableCredentialJwt(vcPayload, {
        issuer: fixedDid.did,
        signer: fixedDid.signer,
        alg: "ES256K-R"
    });

    // Store in-memory
    const vcId = uuidv4();
    buildingCredentials.push({
        id: vcId,
        jwt,
        issuer: fixedDid.did,
        subject: randomDid.did,
        data: buildingData
    });

    const end = Date.now();
    console.log(`[issueBuildingCredential] Execution time: ${end - start} ms`);

    return {
        vcId,
        jwt,
        issuer: fixedDid.did,
        subject: randomDid.did
    };
}

/**
 * Fetch all building credentials from the in-memory store.
 */
function fetchAllBuildingCredentials() {
    const start = Date.now();
    const credentials = [...buildingCredentials];
    const end = Date.now();

    console.log(`[fetchAllBuildingCredentials] Execution time: ${end - start} ms`);
    return credentials;
}

/**
 * Update a building credential by ID (naive approach).
 */
function updateBuildingCredential(vcId, newData) {
    const start = Date.now();

    const index = buildingCredentials.findIndex(vc => vc.id === vcId);
    if (index === -1) {
        throw new Error(`VC with id ${vcId} not found`);
    }

    buildingCredentials[index].data = newData;

    const end = Date.now();
    console.log(`[updateBuildingCredential] Execution time: ${end - start} ms`);

    return buildingCredentials[index];
}

/**
 * Delete a building credential by ID.
 */
function deleteBuildingCredential(vcId) {
    const start = Date.now();

    const index = buildingCredentials.findIndex(vc => vc.id === vcId);
    if (index === -1) {
        throw new Error(`VC with id ${vcId} not found`);
    }

    buildingCredentials.splice(index, 1);

    const end = Date.now();
    console.log(`[deleteBuildingCredential] Execution time: ${end - start} ms`);

    return true;
}

module.exports = {
    createDID,
    resolveDID,
    revokeDID,
    issueBuildingCredential,
    fetchAllBuildingCredentials,
    updateBuildingCredential,
    deleteBuildingCredential
};
