# Mocha Sandworm Plugin

Security Snapshot Testing Inside Your Mocha Test Suite 🪱

---

[![NPM][npm-version-image]][npm-version-url]
[![License][license-image]][license-url]
[![Maintainability][cc-image]][cc-url]

## TL;DR
* This plugin uses [Sandworm](https://github.com/sandworm-hq/sandworm-js) to intercept all potentially harmful Node and browser APIs, like using the file system or the network.
* Sandworm also knows what modules are responsible for each call.
* Based on your test suite activity, this plugin will generate a `package-permissions.json` file in your app's root directory, containing a list of all sensitive methods invoked, grouped by [caller path](https://docs.sandworm.dev/#caller-module-paths).
* Subsequent runs of your test suite will also match the resulting permissions against the saved snapshot and trigger an error if there have been any changes in your app's security profile.

## Why
* This will give you an out-of-the-box security profile for both your app and your dependencies, based on the dynamic analysis of code executed by your test runner.
* Simple obfuscation techniques can confuse static analysis tools, but Sandworm will always intercept risky calls at runtime.
* The generated security profile will help you understand the inner workings of your app and dependencies, and be aware of potential vulnerabilities.
* The security profile will act as a snapshot that each test suite run will match against. This will raise the alarm if you add or remove code or dependencies that do sensitive things and signal that an audit is due.
* If you choose to, you can start enforcing the permissions in production mode using Sandworm.

## Setting Up

Install the plugin:

```bash
npm install --save-dev sandworm-mocha # or yarn add --dev sandworm-mocha
```

Then add `--require sandworm-mocha` to your mocha command arguments. This will load Sandworm and set up recording events before your tests start.

Next, you'll probably want to exclude calls made by your test code from the output, since you only want to capture your core app's security profile. To do this, create a `.sandworm.config.json` file in your app's root, containing one or more of the following attributes:

* `aliases`
  * Use this to give an alias to some of your root code, based on the file path

* `ignoredModules`
  * Use this to exclude specific modules from the output

> **Note**
> Read more about aliases in [Sandworm's docs](https://docs.sandworm.dev/#aliases).

> **Note**
> Dev dependencies are always excluded from the output.

For example, to exclude test code and fixtures from [Express](https://github.com/expressjs/express), you could use the following configuration:

```json
{
  "aliases": [
    {"path": "express/test", "name": "test"},
    {"path": "express/examples", "name": "test"}
  ],
  "ignoredModules": ["test"]
}
```

You're now ready for the initial run, that will output the `package-permissions.json` security snapshot in your app's root. When running your test suite, you should now see Sandworm booting up in the console logs:

```
[🪱 Sandworm]: Setting up intercepts...
[🪱 Sandworm]: Intercepts ready
[🪱 Sandworm]: Starting listener...
[🪱 Sandworm]: Listening for events
```

After the tests end, you should see Sandworm reporting on the number of events it has captured:

```
[🪱 Sandworm]: Intercepted 2672 events
```

You should now also see a new `package-permissions.json` file in your app's root directory, containing an array of permission descriptor objects that each have the following attributes:

* `module` - the module or caller path name responsible for invoking sensitive methods
* `permissions` - an array of strings representing each invoked method, e.g., `fs.readFile`.

At this point, you should take your time to audit this file, and make sure each permission makes sense and represents an operation that's critical to your app's functionality. Once that's done, commit it to your repository. This will become the snapshot that future test suite runs match against.

Whenever adding or removing code or dependencies that use sensitive methods, you'll need to manually update this file to reflect the changes (or remove it and run the test suite again to have it automatically regenerated).

[npm-version-image]: https://img.shields.io/npm/v/sandworm-mocha?style=flat-square
[npm-version-url]: https://www.npmjs.com/package/sandworm-mocha
[license-image]: https://img.shields.io/npm/l/sandworm-mocha?style=flat-square
[license-url]: https://github.com/sandworm-hq/sandworm-mocha/blob/main/LICENSE
[cc-image]: https://api.codeclimate.com/v1/badges/d5c5cb5a62ff51bdc873/maintainability
[cc-url]: https://codeclimate.com/github/sandworm-hq/sandworm-mocha/maintainability
