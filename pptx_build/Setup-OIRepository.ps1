<#
.SYNOPSIS
    Initialises a GitHub repository with the Operations Intelligence source of truth.

.DESCRIPTION
    Clones or initialises a local git repository, populates it with all Operations
    Intelligence source files, and pushes to the specified GitHub repository. After
    the push, GitHub Copilot users working in that repository will have full context
    about the Operations Intelligence platform, architecture, engine API, and implementation.

.PARAMETER GitHubRepoUrl
    HTTPS URL of the target GitHub repository.
    Defaults to the Operations Intelligence source repository.

.PARAMETER AccessToken
    GitHub Personal Access Token (classic or fine-grained) with Contents:Write permission
    on the target repository. Defaults to the Operations Intelligence access token.

.PARAMETER SourceDirectory
    Optional. Path to the Operations Intelligence source directory (the folder containing
    README.md, architecture/, context/, implementation/, etc.). Defaults to the directory
    containing this script.

.PARAMETER BranchName
    Optional. Branch name to push to. Defaults to "main".

.EXAMPLE
    .\Setup-OIRepository.ps1

.EXAMPLE
    .\Setup-OIRepository.ps1 -BranchName "main" -SourceDirectory "C:\oi-source"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false, HelpMessage = "HTTPS URL of the target GitHub repository")]
    [ValidatePattern('^https://github\.com/.+/.+$')]
    [string]$GitHubRepoUrl = "https://github.com/Infosys-GithubCopilot-backup/Operations-Intelligence-Source",

    [Parameter(Mandatory = $false, HelpMessage = "GitHub Personal Access Token with Contents:Write permission")]
    [string]$AccessToken = "",

    [Parameter(Mandatory = $false, HelpMessage = "Path to the Operations Intelligence source directory")]
    [string]$SourceDirectory = $PSScriptRoot,

    [Parameter(Mandatory = $false, HelpMessage = "Branch name to push to")]
    [string]$BranchName = "main"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[OI] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Assert-GitInstalled {
    try {
        $null = git --version 2>&1
        Write-Success "Git is available"
    }
    catch {
        Write-Fail "Git is not installed or not in PATH. Install Git from https://git-scm.com/ and retry."
        exit 1
    }
}

function Get-AuthenticatedUrl {
    param([string]$Url, [string]$Token)
    # Insert token into HTTPS URL: https://TOKEN@github.com/...
    $Url -replace '^https://', "https://$Token@"
}

function Initialize-WorkDirectory {
    param([string]$Source)

    if (-not (Test-Path $Source)) {
        Write-Fail "Source directory not found: $Source"
        exit 1
    }

    $ReadmePath = Join-Path $Source "README.md"

    if (-not (Test-Path $ReadmePath)) {
        # README.md not present — look for the bundled source zip and extract it
        $SearchDirs = @($Source, (Split-Path $Source -Parent))
        $SourceZip  = $null
        foreach ($Dir in $SearchDirs) {
            $Hit = Get-ChildItem -Path $Dir -Filter "OperationsIntelligence-Source-*.zip" -ErrorAction SilentlyContinue |
                   Select-Object -First 1
            if ($null -ne $Hit) { $SourceZip = $Hit; break }
        }

        if ($null -ne $SourceZip) {
            Write-Step "Source zip located: $($SourceZip.Name)"
            Write-Step "Extracting source zip — this may take a moment..."
            $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("OI_Source_" + [System.IO.Path]::GetRandomFileName())
            Expand-Archive -Path $SourceZip.FullName -DestinationPath $TempDir -Force
            Write-Success "Source zip extracted to: $TempDir"
            $Source    = $TempDir
            $ReadmePath = Join-Path $Source "README.md"
        }
    }

    if (-not (Test-Path $ReadmePath)) {
        Write-Fail "Source directory does not look like an Operations Intelligence source: README.md not found in $Source"
        exit 1
    }

    Write-Success "Source directory validated: $Source"
    return $Source
}

function Set-GitUserConfig {
    $ExistingName  = git config --global user.name 2>&1
    $ExistingEmail = git config --global user.email 2>&1

    if ([string]::IsNullOrWhiteSpace($ExistingName)) {
        git config --global user.name "Operations Intelligence Setup"
        Write-Step "Set git user.name to 'Operations Intelligence Setup'"
    }
    if ([string]::IsNullOrWhiteSpace($ExistingEmail)) {
        git config --global user.email "oi-setup@noreply.github.com"
        Write-Step "Set git user.email to 'oi-setup@noreply.github.com'"
    }
}

function Initialize-GitRepo {
    param([string]$WorkDir)

    Push-Location $WorkDir

    $GitDir = Join-Path $WorkDir ".git"

    if (Test-Path $GitDir) {
        Write-Step "Existing git repository detected"
        $CurrentRemote = git remote get-url origin 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Current remote: $CurrentRemote"
        }
    }
    else {
        Write-Step "Initialising new git repository"
        git init
        if ($LASTEXITCODE -ne 0) { Write-Fail "git init failed"; Pop-Location; exit 1 }
        Write-Success "Git repository initialised"
    }

    Pop-Location
}

function Set-GitRemote {
    param([string]$WorkDir, [string]$AuthUrl)

    Push-Location $WorkDir

    $Remotes = git remote 2>&1
    if ($Remotes -match 'origin') {
        Write-Step "Updating existing 'origin' remote"
        git remote set-url origin $AuthUrl
    }
    else {
        Write-Step "Adding 'origin' remote"
        git remote add origin $AuthUrl
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to configure git remote"
        Pop-Location
        exit 1
    }

    Write-Success "Remote 'origin' configured"
    Pop-Location
}

function Stage-AllFiles {
    param([string]$WorkDir)

    Push-Location $WorkDir

    Write-Step "Staging all source files"
    git add --all
    if ($LASTEXITCODE -ne 0) { Write-Fail "git add failed"; Pop-Location; exit 1 }

    $Status = git status --porcelain 2>&1
    if ([string]::IsNullOrWhiteSpace($Status)) {
        Write-Warn "No changes to commit. Repository may already be up to date."
        Pop-Location
        return $false
    }

    $FileCount = ($Status -split "`n" | Where-Object { $_ -ne "" }).Count
    Write-Success "Staged $FileCount file change(s)"

    Pop-Location
    return $true
}

function New-InitialCommit {
    param([string]$WorkDir, [string]$Branch)

    Push-Location $WorkDir

    Write-Step "Creating commit on branch '$Branch'"

    git checkout -B $Branch 2>&1 | Out-Null

    $CommitMessage = @"
feat: initialise Operations Intelligence source of truth

Complete source of truth for the Operations Intelligence platform —
a ServiceNow scoped application (x_infte_ops_int) enabling Infosys
operations teams to create, govern, and execute process automations
and managed ServiceNow deliverables entirely through natural language.

Includes:
- Architecture specification and data model
- Business context and problem statement
- Implementation source code (engine, portal widget, script includes)
- Engine API reference and coding patterns
- AI instructions for GitHub Copilot
- Operating procedures and reference glossary
"@

    git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "git commit failed"
        Pop-Location
        exit 1
    }

    Write-Success "Commit created"
    Pop-Location
}

function Push-ToRemote {
    param([string]$WorkDir, [string]$AuthUrl, [string]$Branch)

    Push-Location $WorkDir

    Write-Step "Pushing to GitHub (branch: $Branch)"

    $MaxAttempts = 4
    $DelaySeconds = 2

    for ($Attempt = 1; $Attempt -le $MaxAttempts; $Attempt++) {
        git push -u origin $Branch --force
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Push succeeded on attempt $Attempt"
            Pop-Location
            return
        }

        if ($Attempt -lt $MaxAttempts) {
            Write-Warn "Push attempt $Attempt failed. Retrying in ${DelaySeconds}s..."
            Start-Sleep -Seconds $DelaySeconds
            $DelaySeconds = $DelaySeconds * 2
        }
    }

    Write-Fail "Push failed after $MaxAttempts attempts. Verify the access token has Contents:Write permission and the repository URL is correct."
    Pop-Location
    exit 1
}

function Remove-TokenFromHistory {
    param([string]$WorkDir)
    Push-Location $WorkDir
    git remote set-url origin ($GitHubRepoUrl)
    Pop-Location
}

function Write-Summary {
    param([string]$RepoUrl, [string]$Branch)

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Operations Intelligence Repository Setup Complete" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Repository : $RepoUrl" -ForegroundColor Cyan
    Write-Host "  Branch     : $Branch" -ForegroundColor White
    Write-Host ""
    Write-Host "  GitHub Copilot instructions are now active at:" -ForegroundColor White
    Write-Host "  .github/copilot-instructions.md" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Anyone opening this repository with GitHub Copilot will" -ForegroundColor White
    Write-Host "  receive full context about the Operations Intelligence" -ForegroundColor White
    Write-Host "  platform, engine API, architecture, and implementation." -ForegroundColor White
    Write-Host ""
}

# ─── Entry Point ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  Operations Intelligence — Repository Setup" -ForegroundColor Cyan
Write-Host "  Target: $GitHubRepoUrl" -ForegroundColor Gray
Write-Host "  Branch: $BranchName" -ForegroundColor Gray
Write-Host ""

Assert-GitInstalled

$SourceDir   = Initialize-WorkDirectory -Source $SourceDirectory
$AuthUrl     = Get-AuthenticatedUrl -Url $GitHubRepoUrl -Token $AccessToken

Set-GitUserConfig
Initialize-GitRepo    -WorkDir $SourceDir
Set-GitRemote         -WorkDir $SourceDir -AuthUrl $AuthUrl

$HasChanges = Stage-AllFiles -WorkDir $SourceDir

if ($HasChanges) {
    New-InitialCommit -WorkDir $SourceDir -Branch $BranchName
}
else {
    Push-Location $SourceDir
    git checkout -B $BranchName 2>&1 | Out-Null
    Pop-Location
}

Push-ToRemote -WorkDir $SourceDir -AuthUrl $AuthUrl -Branch $BranchName

# Remove token from remote URL in local git config for security
Remove-TokenFromHistory -WorkDir $SourceDir

Write-Summary -RepoUrl $GitHubRepoUrl -Branch $BranchName
