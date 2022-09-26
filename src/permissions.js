const getPermissionsFromActivity = (activity) => {
  const permissions = [];
  activity.forEach(({module, family, method}) => {
    const descriptor = permissions.find(({module: m}) => m === module);
    const methodSlug = `${family}.${method}`;

    if (descriptor) {
      if (!descriptor.permissions.includes(methodSlug)) {
        descriptor.permissions.push(methodSlug);
      }
    } else {
      permissions.push({module, permissions: [methodSlug]});
    }
  });

  return permissions;
};

const comparePermissions = (oldPermissions = [], newPermissions = []) => {
  if (!Array.isArray(oldPermissions) || !Array.isArray(newPermissions)) {
    throw new Error('Sandworm: compared permissions must be Arrays');
  }

  const changes = [];
  const oldModules = oldPermissions.map(({module}) => module);
  const newModules = newPermissions.map(({module}) => module);

  // Removed modules
  oldModules
    .filter((module) => !newModules.includes(module))
    .forEach((module) => changes.push({module, type: 'removed-module'}));
  // Added modules
  newModules
    .filter((module) => !oldModules.includes(module))
    .forEach((module) => changes.push({module, type: 'added-module'}));

  oldPermissions.forEach(({module, permissions: oldModulePermissions}) => {
    const newModule = newPermissions.find(({module: m}) => m === module);
    if (newModule) {
      const newModulePermissions = newModule.permissions;

      // Removed permissions
      oldModulePermissions
        .filter((permission) => !newModulePermissions.includes(permission))
        .forEach((permission) => changes.push({module, permission, type: 'removed-permission'}));
      // Added permissions
      newModulePermissions
        .filter((permission) => !oldModulePermissions.includes(permission))
        .forEach((permission) => changes.push({module, permission, type: 'added-permission'}));
    }
  });

  return changes;
};

module.exports = {
  getPermissionsFromActivity,
  comparePermissions,
};
