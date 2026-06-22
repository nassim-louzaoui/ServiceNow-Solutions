# Operations Intelligence — Deliverables Package

## Contents

| File | Description |
|---|---|
| `OperationsIntelligence-Deliverables.zip` | Main deliverables archive (see below) |

## OperationsIntelligence-Deliverables.zip Contents

| File | Description |
|---|---|
| `OperationsIntelligence-Source-v6.zip` | Complete source of truth for the Operations Intelligence platform. Push to a GitHub repository using the setup script to enable GitHub Copilot context. |
| `Operations-Intelligence-Overview.pptx` | Executive overview presentation covering environmental context, problem statement, business value, proposed solution, prototype status, and development roadmap. |
| `Setup-OIRepository.ps1` | PowerShell script to initialise a GitHub repository with the Operations Intelligence source of truth. Run from the same directory as the source zip. |

## Setup Instructions

1. Extract `OperationsIntelligence-Deliverables.zip`
2. Place `OperationsIntelligence-Source-v6.zip` in the same directory as `Setup-OIRepository.ps1`
3. Run `.\Setup-OIRepository.ps1` in PowerShell
4. The script will extract the source zip, initialise a git repository, and push to the configured GitHub repository

## Platform

- **Application scope:** `x_infte_ops_int`
- **Platform:** ServiceNow
- **Engine endpoint:** `POST /api/x_infte_ops_int/ops_int_engine/v1`
- **Source repository:** `github.com/Infosys-GithubCopilot-backup/Operations-Intelligence-Source`
