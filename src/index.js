const path = require('path');
const {
  recorder: {recordSandwormActivity, stopRecordingSandwormActivity, getRecordedActivity},
  files: {loadDependencies, loadConfig, writePermissions, loadPermissions, SANDWORM_PERMISSION_FILE_NAME},
  permissions: {getPermissionsFromActivity, getPackagePermissions, comparePermissions},
  sandworm: {loadSandworm},
  logger,
} = require('sandworm-utils');

const appPath = process.env.SANDWORM_APP_PATH || path.join(__dirname, '..', '..', '..');
const config = loadConfig(appPath);

loadSandworm({config, trustedModules: ['mocha']});

module.exports = {
  mochaHooks: {
    beforeAll(done) {
      logger.log('Starting listener...');
      recordSandwormActivity(
        (err) => {
          logger.log('Error listening for events:', err);
          done(err);
        },
        () => {
          logger.log('Listening for events');
          done();
        },
      );
    },
    afterAll(done) {
      const activity = getRecordedActivity();
      logger.log(`Intercepted ${activity.length} events`);
      stopRecordingSandwormActivity(() => {
        (async () => {
          loadDependencies(appPath, ([devDependencies, prodDependencies]) => {
            const ignoredModules =
              config && Array.isArray(config.ignoredModules) ? config.ignoredModules : [];
            const permissions = getPermissionsFromActivity(activity);

            const currentPermissions = loadPermissions(appPath);
            const newPermissions = getPackagePermissions({
              permissions,
              devDependencies,
              prodDependencies,
              ignoredModules,
            });

            if (!currentPermissions) {
              writePermissions(appPath, newPermissions, () => {
                logger.logTestPluginFirstRunMessage();
                done();
              });
            } else {
              const {changes, messages} = comparePermissions(currentPermissions, newPermissions);

              if (changes.length === 0) {
                logger.success('✔ Permission snapshot matches current test run');
              }

              done(
                changes.length > 0
                  ? new Error(
                      `Sandworm: Permission mismatch:\n${messages.join(
                        '\n',
                      )}\nPlease verify and update the \`${SANDWORM_PERMISSION_FILE_NAME}\` file.`,
                    )
                  : undefined,
              );
            }
          });
        })();
      });
    },
  },
};
