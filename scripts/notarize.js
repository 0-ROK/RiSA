const path = require('path');

exports.default = async function notarizing(context) {
  // Dynamic import for ES module
  const { notarize } = await import('@electron/notarize');
  const { electronPlatformName, appOutDir } = context;
  
  // Only notarize for macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization - not macOS');
    return;
  }

  // Check if running in CI and has required environment variables
  const isCI = process.env.CI === 'true';
  
  // Debug: Check which environment variables are available (masked for security)
  console.log('Environment check:');
  console.log(`  CI: ${isCI}`);
  console.log(`  APPLE_ID: ${process.env.APPLE_ID ? '***SET***' : 'NOT_SET'}`);
  console.log(`  APPLE_APP_SPECIFIC_PASSWORD: ${process.env.APPLE_APP_SPECIFIC_PASSWORD ? '***SET***' : 'NOT_SET'}`);
  console.log(`  APPLE_TEAM_ID: ${process.env.APPLE_TEAM_ID ? '***SET***' : 'NOT_SET'}`);
  
  const hasAppleCredentials = 
    process.env.APPLE_ID && 
    process.env.APPLE_APP_SPECIFIC_PASSWORD && 
    process.env.APPLE_TEAM_ID;

  if (!hasAppleCredentials) {
    console.log('Skipping notarization - Apple credentials not found');
    if (isCI) {
      console.log('Running in CI without Apple credentials - app will not be notarized');
    }
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing ${appName}...`);
  console.log(`App path: ${appPath}`);
  console.log(`Team ID: ***`);

  try {
    await notarize({
      tool: 'notarytool', // Use the new notarization tool (faster)
      appBundleId: 'com.risateam.risa',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    
    console.log(`Successfully notarized ${appName}`);
  } catch (error) {
    // Log safe error information only (avoid exposing Apple credentials)
    const safeErrorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Notarization failed:', safeErrorMessage);
    
    // In CI, fail the build if notarization fails
    if (isCI && hasAppleCredentials) {
      // Create a safe error to throw (without sensitive details)
      const safeError = new Error(`Notarization failed: ${safeErrorMessage}`);
      throw safeError;
    }
    
    // In local development, just warn
    console.warn('Continuing without notarization...');
  }
};
