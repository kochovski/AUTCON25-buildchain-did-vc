# AUTCON25 Buildchain DID & VC Service

## Overview

This repository contains a simple Node.js service for working with **[Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core/)** and **Verifiable Credentials (VCs)** on an Ethereum‑based network.  It demonstrates how a building owner (issuer) and a building subject can be assigned DIDs using the [ethr-did](https://github.com/decentralized-identity/ethr-did) library and how to issue, update and revoke verifiable credentials that reference building information (e.g., materials, energy efficiency, IFC references).

The service exposes a REST API built on top of Express.  Each endpoint is documented in an OpenAPI/Swagger specification served by `swagger-ui-express` on `/api-docs`:contentReference[oaicite:0]{index=0}.  You can explore and interact with the API in a browser without writing code.

> **Note**: This code is a **proof of concept**. Private keys should never be committed to version control or hard‑coded; use environment variables instead.

## Prerequisites

Before running the service, ensure you have the following installed:

* **Node.js** (v16 or later).  You can verify using `node --version`.
* **npm** package manager (bundled with Node.js).
* An **Alchemy Holesky** or other Ethereum RPC endpoint URL for interacting with the Ethereum testnet.  You will also need a **private key** for the issuer DID (owner) and the **Ethr DID Registry contract address** deployed on your network.

## License

This repository forms part of the research described in “Leveraging IFC Semantics and W3C Decentralized Identifiers in BUILDCHAIN: A Decentralized Digital Building Logbook for Construction and Deep Renovation”. Until the final publication of this work, any reuse of the code (including modification, redistribution or derivation) is strictly forbidden.

After the work has been formally published, commercial use or distribution of this code is permitted only with the prior written consent of the authors. If you wish to build upon or distribute this repository, please contact the authors of the above‑mentioned paper to obtain permission.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/kochovski/AUTCON25-buildchain-did-vc.git
cd AUTCON25-buildchain-did-vc
npm install
