// ============================================================
// SUPERSEDED — DO NOT RUN THIS SCRIPT
// ============================================================
// This script has been replaced by the two-script workflow below.
//
// WHY IT WAS SUPERSEDED:
//   This script created Script Includes (AppLogger, AppUtils, AppConfig)
//   that are NOT part of the Operations Intelligence architecture.
//   Running it would create orphaned artifacts in your scoped application
//   that conflict with the actual build.
//
// CORRECT WORKFLOW:
//
//   STEP 1  — Run  01_bootstrap_api_access.js
//             (Creates service account + outputs API credentials)
//             Share the output in this session.
//             Claude then builds the entire solution via REST API.
//
//   STEP 2  — After the build completes, run  02_verify_implementation.js
//             (Verifies all artifacts were created correctly)
//             Share the output to confirm build completeness.
//
// ============================================================
// If you accidentally ran this script, the following artifacts
// were created in your scope and should be manually deleted:
//   - Script Include: AppLogger
//   - Script Include: AppUtils
//   - Script Include: AppConfig
//   - System Property: {scope}.debug_mode
//   - System Property: {scope}.version
//   - System Property: {scope}.initialized
// ============================================================

gs.print('');
gs.print('!! This script is SUPERSEDED. Do not run it. !!');
gs.print('');
gs.print('Run 01_bootstrap_api_access.js instead.');
gs.print('See script header for full instructions.');
gs.print('');
