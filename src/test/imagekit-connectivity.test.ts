import dotenv from 'dotenv';
import ImageKit from 'imagekit';

dotenv.config();

async function testImageKitConnectivity() {
  console.log('=== IMAGEKIT CONNECTIVITY & HEALTH TEST ===');

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  console.log(`IMAGEKIT_PUBLIC_KEY: ${publicKey ? 'CONFIGURED (' + publicKey.substring(0, 8) + '***)' : 'MISSING'}`);
  console.log(`IMAGEKIT_PRIVATE_KEY: ${privateKey ? 'CONFIGURED (*** HIDDEN ***)' : 'MISSING'}`);
  console.log(`IMAGEKIT_URL_ENDPOINT: ${urlEndpoint ? 'CONFIGURED (' + urlEndpoint + ')' : 'MISSING'}`);

  if (!publicKey || !privateKey || !urlEndpoint) {
    console.log('RESULT: ImageKit environment variables are missing. Connectivity test skipped.');
    process.exit(1);
  }

  const imagekit = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });

  try {
    // 1. Verify token & signature generation
    const authParams = imagekit.getAuthenticationParameters();
    console.log('ImageKit Authentication Parameters:', {
      token: authParams.token ? 'GENERATED' : 'FAILED',
      expire: authParams.expire,
      signature: authParams.signature ? 'VALID_HMAC' : 'MISSING',
    });

    // 2. Perform lightweight ping/list to ImageKit Media Library API
    const listRes = await imagekit.listFiles({ limit: 1 });
    console.log('ImageKit API Connection:', Array.isArray(listRes) ? 'SUCCESS (Array response)' : listRes);

    console.log('RESULT: ImageKit connectivity SUCCESSful!');
    process.exit(0);
  } catch (err: any) {
    console.error('RESULT: ImageKit API authentication/connectivity FAILED:', err.message || err);
    process.exit(1);
  }
}

testImageKitConnectivity();
