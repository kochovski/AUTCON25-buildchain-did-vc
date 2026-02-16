# AUTCON25 Buildchain DID & VC Service

## Overview

This repository contains a simple Node.js service for working with **[Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core/)** and **Verifiable Credentials (VCs)** on an Ethereum‑based network.  It demonstrates how a building owner (issuer) and a building subject can be assigned DIDs using the [ethr-did](https://github.com/decentralized-identity/ethr-did) library and how to issue, update and revoke verifiable credentials that reference building information (e.g., materials, energy efficiency, IFC references).

The service exposes a REST API built on top of Express.  Each endpoint is documented in an OpenAPI/Swagger specification served by `swagger-ui-express` on `/api-docs`:contentReference[oaicite:0]{index=0}.  You can explore and interact with the API in a browser without writing code.

> **Note**: This code is a **proof of concept**.  It stores credentials only in memory and is not suitable for production use without additional persistence, error handling and security hardening.  Private keys should never be committed to version control or hard‑coded; use environment variables instead.

## Prerequisites

Before running the service, ensure you have the following installed:

* **Node.js** (v16 or later).  You can verify using `node --version`.
* **npm** package manager (bundled with Node.js).
* An **Alchemy Holesky** or other Ethereum RPC endpoint URL for interacting with the Ethereum testnet.  You will also need a **private key** for the issuer DID (owner) and the **Ethr DID Registry contract address** deployed on your network.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/kochovski/AUTCON25-buildchain-did-vc.git
cd AUTCON25-buildchain-did-vc
npm install
