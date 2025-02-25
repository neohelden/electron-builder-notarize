'use strict';

const path = require('path');
const electronNotarize = require('electron-notarize');
const readPkgUp = require('read-pkg-up');
// eslint-disable-next-line import/no-extraneous-dependencies
const util = require('builder-util');

const isEnvTrue = value => {
	// eslint-disable-next-line no-eq-null, eqeqeq
	if (value != null) {
		value = value.trim();
	}

	return value === 'true' || value === '' || value === '1';
};

module.exports = async params => {
	if (params.electronPlatformName !== 'darwin') {
		return;
	}

	if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
		console.log('Skipping because APPLE_ID and/or APPLE_ID_PASSWORD environment varrialbes are missing.');
		return;
	}

	// https://github.com/electron-userland/electron-builder/blob/c11fa1f1033aeb7c378856d7db93369282d363f5/packages/app-builder-lib/src/codeSign/macCodeSign.ts#L22-L49
	if (util.isPullRequest()) {
		if (!isEnvTrue(process.env.CSC_FOR_PULL_REQUEST)) {
			console.log('Skipping notarizing, since app was not signed.');
			return;
		}
	}

	// Only notarize the app on the master branch
	if (
		!isEnvTrue(process.env.CSC_FOR_PULL_REQUEST) && (
			(process.env.CIRCLE_BRANCH && process.env.CIRCLE_BRANCH !== 'master') ||
			(process.env.TRAVIS_BRANCH && process.env.TRAVIS_BRANCH !== 'master')
		)
	) {
		return;
	}

	const {packageJson} = readPkgUp.sync();
	const {appId} = packageJson.build;

	const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);

	console.log(`Notarizing ${appId} found at ${appPath}`);

	await electronNotarize.notarize({
		appBundleId: appId,
		appPath,
		appleId: process.env.APPLE_ID,
		appleIdPassword: process.env.APPLE_ID_PASSWORD
	});

	console.log(`Done notarizing ${appId}`);
};
