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
  const hasAppleCredentials = 
    process.env.APPLE_ID && 
    process.env.APPLE_ID_PASSWORD && 
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
  console.log(`Apple ID: ${process.env.APPLE_ID}`);
  console.log(`Team ID: ${process.env.APPLE_TEAM_ID}`);

  try {
    await notarize({
      tool: 'notarytool', // Use the new notarization tool (faster)
      appBundleId: 'com.risateam.risa',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    
    console.log(`Successfully notarized ${appName}`);
  } catch (error) {
    console.error('Notarization failed:', error);
    
    // In CI, fail the build if notarization fails
    if (isCI && hasAppleCredentials) {
      throw error;
    }
    
    // In local development, just warn
    console.warn('Continuing without notarization...');
  }
};