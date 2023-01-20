# Changelog

## v2.0.0

### Added

- :warning: **[breaking-change]** Add an identifier for each function registration. When using a same identifier, **the new registered function(s) replace(s) the previous one(s)**.

- :warning: **[breaking-change]** Add an identifier for predicates functions to mimic to same behavior as functions registrations. Several predicate functions can now be passed in a single `if()` with a defined identifier. In the same way, if an another `if()` predicate is set with the same identifier, **it will override the previous one**.

- Add an option `deleteFunctionsWhenJobsStarted` allowing to delete the registered functions when the jobs are started.

- Add an option `debug.logFunctionRegistrations` and `debug.logFunctionExecutions` to debug functions registrations and executions. Don't forget to set `DEBUG=AsyncProcess:*` as an environment variable or in your browser's localstorage.

## v1.2.0

### Added

- Support multiple predicate functions.
- Add an optional identifier in `withLogs` composite function to support multiple logging.

## v1.1.0

### Added

- Expose `withLogs` composer.
- Expose `olderThan` predicate.

## v1.0.0

### Added

Initial release.
