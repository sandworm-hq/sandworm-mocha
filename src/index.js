const Sandworm = require('sandworm');
const path = require('path');
const {
  recordSandwormActivity,
  stopRecordingSandwormActivity,
  getRecordedActivity,
} = require('./recorder');
const {
  loadDependencies,
  loadConfig,
  writePermissions,
  loadPermissions,
  SANDWORM_PERMISSION_FILE_NAME,
} = require('./files');
const {getPermissionsFromActivity, comparePermissions} = require('./permissions');
const logger = require('./logger');

const appPath = process.env.SANDWORM_APP_PATH || path.join(__dirname, '..', '..', '..');
let config;

try {
  config = loadConfig(appPath);
  if (config) {
    logger.log('Config loaded');
  }
} catch (error) {
  logger.log('Error loading config:', error.message);
}

// Load Sandworm
logger.log('Setting up intercepts...');
Sandworm.init({
  devMode: true,
  trustedModules: ['mocha'],
  aliases: config && config.aliases,
});
logger.log('Intercepts ready');

module.exports = {
  mochaHooks: {
    beforeAll(done) {
      logger.log('Starting listener...');
      recordSandwormActivity(
        () => {
          logger.log('Listening for events');
          done();
        },
        (err) => {
          logger.log('Error listening for events:', err);
          done(err);
        },
      );
    },
    afterAll(done) {
      const activity = getRecordedActivity();
      logger.log(`Intercepted ${activity.length} events`);
      stopRecordingSandwormActivity(() => {
        (async () => {
          try {
            const [devDependencies, prodDependencies] = await loadDependencies(appPath);
            const ignoredModules =
              config && Array.isArray(config.ignoredModules) ? config.ignoredModules : [];
            const permissions = getPermissionsFromActivity(activity);

            const newPermissions = permissions
              // Filter out dev dependencies
              .filter(({module}) => {
                const moduleNames = module.split('>');
                const devModules = moduleNames.filter(
                  (name) => devDependencies.includes(name) && !prodDependencies.includes(name),
                );
                return devModules.length === 0;
              })
              // Filter out explicitly ignored modules
              .filter(({module}) => !ignoredModules.includes(module));

            const currentPermissions = loadPermissions(appPath);

            if (!currentPermissions) {
              writePermissions(appPath, newPermissions, () => {
                logger.warn("It looks like this is the first time you're running Sandworm.");
                logger.warn(
                  "A `package-permissions.json` file has been created in your app's root directory, with the per-module permissions detected during your test suite run.",
                );
                logger.warn(
                  'Please audit this file to understand why each item is required, then commit the file to your repository.',
                );
                logger.warn('The next test run will validate permissions against this snapshot.');
                done();
              });
            } else {
              const changes = comparePermissions(currentPermissions, newPermissions);
              const messages = [];

              changes.forEach(({module, type, permission}) => {
                switch (type) {
                  case 'removed-module':
                    messages.push(`  * Existing \`${module}\` module is no longer in use`);
                    break;
                  case 'added-module':
                    messages.push(`  * New module \`${module}\` has been added`);
                    break;
                  case 'removed-permission':
                    messages.push(
                      `  * Permission \`${permission}\` is no longer in use for module \`${module}\``,
                    );
                    break;
                  case 'added-permission':
                    messages.push(
                      `  * Permission \`${permission}\` has been added to module \`${module}\``,
                    );
                    break;
                  default:
                    break;
                }
              });

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
          } catch (error) {
            logger.error(error);
            done(error);
          }
        })();
      });
    },
  },
};
