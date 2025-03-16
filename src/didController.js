const {ethers} = require('ethers');
const EthrDID = require('ethr-did').EthrDID;
const {createVerifiableCredentialJwt} = require('did-jwt-vc');
const {Resolver} = require('did-resolver');
const {getResolver} = require('ethr-did-resolver');
const {v4: uuidv4} = require('uuid');
const {ES256KSigner} = require("did-jwt");

const ALCHEMY_API_URL = process.env.ALCHEMY_API_URL;
const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS;
const HOLESKY_CHAIN_ID = 17000;

// In-memory store for building credentials
const buildingCredentials = [];

// We'll keep references here so we don't constantly recreate them
let ownerDIDInstance = null;
let subjectDIDInstance = null;

let ownerDIDfull = null;
let subjectDIDfull = null;

// DID Resolver for ethr-did
const ethrResolver = getResolver({
    //name: 'holesky',
    chainId: HOLESKY_CHAIN_ID,
    rpcUrl: ALCHEMY_API_URL,
    registry: REGISTRY_ADDRESS
});

const didResolver = new Resolver(ethrResolver);

/**
 * createDid:
 *   - If 'privateKey' is provided, create a DID using that private key
 *     and store it in 'ownerDIDInstance'.
 *   - If 'privateKey' is not provided, generate a random wallet
 *     and store that DID in 'subjectDIDInstance'.
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

        // Create a "signer" from your issuer's private key
        //    - remove the '0x' prefix and pass the raw hex for ES256KSigner
        //    - the second param (true) means we want the "recoveryParam" appended
        const issuerSigner = ES256KSigner(wallet.privateKey.slice(2), true);

        // Create DID from the given (fixed) private key
        didInstance = new EthrDID({
            identifier: wallet.address,
            signer: issuerSigner,
            privateKey: walletPrivateKey,
            provider,
            chainNameOrId: HOLESKY_CHAIN_ID,
            alg: 'ES256K'
        });

        ownerDIDInstance = didInstance.did; // store as "fixed" DID
        ownerDIDfull = didInstance;
        console.log(`Owner from predefined wallet`);
        console.log(`DID Owner: `, ownerDIDfull);

    } else {
        // Generate a random DID
        const wallet = ethers.Wallet.createRandom();
        const subjectSigner = ES256KSigner(wallet.privateKey.slice(2), true);

        didInstance = new EthrDID({
            identifier: wallet.address,
            signer: subjectSigner,
            privateKey: wallet.privateKey,
            provider,
            chainNameOrId: HOLESKY_CHAIN_ID,
            alg: 'ES256K'
        });

        subjectDIDInstance = didInstance.did; // store as "random" DID
        subjectDIDfull = didInstance;
        walletPrivateKey = wallet.privateKey;
        console.log(`Subject from generated wallet`);
        console.log(`DID Subject: `, subjectDIDfull);
        console.log(`DID Subject pk: `, wallet.privateKey);
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

async function revokeDID(did, pkey) {

    //let didInstance = did;
    let privateKey = pkey;
    console.log("PK ", privateKey);

    const provider = new ethers.JsonRpcProvider(ALCHEMY_API_URL);

    const start = Date.now();

    const signer = ES256KSigner(privateKey.slice(2), true);

    const didInstance = new EthrDID({
        identifier: did,
        signer,
        privateKey,
        provider,
        chainNameOrId: HOLESKY_CHAIN_ID,
        registry: REGISTRY_ADDRESS
    });

    const txReceipt = await didInstance.changeOwner('0x000000000000000000000000000000000000dEaD');
    console.log('Transaction hash:', txReceipt);

    // Clear the local instance
    //didInstance = null;

    const end = Date.now();
    console.log(`[revokeDID] Execution time: ${end - start} ms`);

    return txReceipt;
}

/**
 * Issue a building credential referencing IFC for building materials, energy efficiency, etc.
 * - Issuer: didInstances.fixed
 * - Subject: didInstances.random
 */
async function issueBuildingCredential(buildingData, privateKey) {
    if (!ownerDIDfull) {
        throw new Error("Fixed DID (issuer) is not initialized.");
    }
    if (!subjectDIDfull) {
        throw new Error("Random DID (subject) is not initialized.");
    }

    const start = Date.now();
    try {

        // Subject DID
        const subjectDid = subjectDIDfull.did;
        const issuerDid = ownerDIDfull.did;

        // Minimal IFC-like building credential payload
        const credentialPayload = {
            sub: subjectDid,
            nbf: Math.floor(Date.now() / 1000),
            vc: {
                '@context': [
                    'https://www.w3.org/2018/credentials/v1',
                    // Example IFC context
                    'https://example.org/ifc/v1'
                ],
                type: ['VerifiableCredential', 'IFCBuildingCredential'],
                credentialSubject: {
                    buildingData
                }
            }
        };

        // Create the credential JWT
        const vcJwt = await createVerifiableCredentialJwt(credentialPayload, ownerDIDfull);

        //Store in memory
        const vcId = 'vc-' + Date.now();
        buildingCredentials[vcId] = {
            id: vcId,
            credentialPayload,
            jwt: vcJwt,
            subjectDid,
            issuerDid
        };

        const finalVC = buildingCredentials[vcId]

        buildingCredentials.push(finalVC);

        console.log('buildingCredentials ', buildingCredentials[vcId]);

        const end = Date.now();
        console.log(`[issueBuildingCredential] Execution time: ${end - start} ms`);

        return {
            vcId,
            finalVC
        };

    } catch (error) {
        console.error(error);
    }
}

/**
 * Fetch all building credentials from the in-memory store.
 */
function fetchAllBuildingCredentials() {
    const start = Date.now();
    const credentials = [buildingCredentials];

    const end = Date.now();
    console.log(`[fetchAllBuildingCredentials] Execution time: ${end - start} ms`);

    return credentials;
}

/**
 * Update a building credential by ID (naive approach).
 */
function updateBuildingCredential(vcId, newData) {
    const start = Date.now();

    const index = buildingCredentials.findIndex((vc) => vc.id === vcId);
    if (index === -1) {
        throw new Error(`VC with id ${vcId} not found`);
    }
    // Just update the data field
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

    const index = buildingCredentials.findIndex((vc) => vc.id === vcId);
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
