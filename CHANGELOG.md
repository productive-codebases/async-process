# Changelog

## v2.0.0

### Added

- :warning: **[breaking-change]** Add an identifier for each function registration. When using the same identifier, **the new registered function(s) replace(s) the previous one(s)**.

- :warning: **[breaking-change]** Add an identifier for predicates functions to mimic to the same behavior as functions registrations. Several predicate functions can now be passed in a single `if()` with a defined identifier. In the same way, if another `if()` predicate is set with the same identifier, **it will override the previous one**.

- Add `deleteFunctionsWhenJobsStarted` option allowing the deletion of registered functions when the jobs are started.

- Add `debug.logFunctionRegistrations` and `debug.logFunctionExecutions` options allowing functions registrations and executions logs. Don't forget to set `DEBUG=AsyncProcess:*` as an environment variable or in your browser's local storage.

- Keep errors thrown by jobs as is.

  Example: If the job is a fetch query and if the response is a 404, the `err` object will be a Response object.

- AsyncProcess instances now accept two more generics, results (`R`) and an error (`E`), allowing to enforce typings of jobs results and jobs exceptions.

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
