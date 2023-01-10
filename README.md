# AsyncProcess

Reusable asynchronous processes declarations and actions.

## Motivation

In a web application, it's very common to have to do some asynchronous process (like fetching data) and do actions according to the state of the process (loading, success, error).

Those asynchronous processes are generally written in a promise-chained based (or async await equivalent) with success/error actions declared on the same place that data is fetched. It's usually not optimal as your data layer should not be too coupled with your UI to optimize reusability.

It means it's ofen better to have a layer between your views (let's say your components) and your stores (where data is fetched). This layer is generally composed of functions that will be bound to the user's actions or more generally to events triggered by your components.

`Asyncprocess` offers a way to declare one or several asynchronous processes (what to do), which actions to do on start/success/error, compose with existing declarations, condition the processes according to some predicates, and finally start the process(es).

All with a very functional declaration semantic.

## Prerequisites

Typescript is not mandatory but highly recommended.

## Installation

```bash
npm install @productive-codebases/async-process
```

## Core concepts

### Basic example

```ts
function fetchUsers() {
  // here some logic to fetch users and save them somewhere
  // store.save('users', fetch('/api/users'))
}

function fetchRoles() {
  // here some logic to fetch roles and save them somewhere
  // store.save('roles', fetch('/api/roles'))
}

function showSpinner() {
  // here some logic to change the state of your app in order to show the spinner
}

function hideSpinner() {
  // here some logic to change the state of your app in order to hide the spinner
}

function showError(err: Error) {
  // here some logic to change the state of your app in order to display the error
}

// declare a new AsyncProcess instance with the identifier "initUsersPage"
AsyncProcess.instance('initUsersPage', ['optionalIdentifier'])
  // declare a "process" to execute, that could be several asynchronous task(s), here fetch users and roles
  .do([fetchUsers, fetchRoles])
  // call the `showSpinner` function before fetching users
  .onStart(showSpinner)
  // call the `hideSpinner` function when the process is done and if successful
  .onSuccess(hideSpinner)
  // call the `showError` function when the process is done and if it fails
  .onError(showError)
  // start the async process
  .start()
```

It's important to note that nothing is happening unless the `start` function is called.

### AsyncProcess' singleton design

In order to retrieve the same `AsyncProcess` declarations accross your application, `AsyncProcess` is an unique singleton that saves all instances.

Each instance are referenced via an identifer and optional sub identifiers.

The first identifier can be typed, typically by using an union of different string values, allowing to retrieve your instances in a safe way. Optional sub identifiers can be used for uuid or any arguments that identify your async process more precisely.

### Typed identifiers

In order to type the main identifier of your `AsyncProcess` instances, you can create an alias of the `AsyncProcess.instance` function which accepts an optional generic:

```ts
type AsyncProcessTestIdentifier = 'initUsersPage' | 'initRolesPage'

const getAsyncProcessInstance =
  AsyncProcess.instance<AsyncProcessTestIdentifier>

// 'initUsersPage' is necessarily a value of the union `AsyncProcessTestIdentifier`
getAsyncProcessInstance('initUsersPage')
  // .do(...)
  .start()
```

Now, by using the `getAsyncProcessInstance` function everywhere in your codebase, you are sure to pass a valid identifier and avoid typos.

### Predicates

#### Concept

`AsyncProcess` supports the passing of a predicate functions allowing to start or not the declared process.

The type `PredicateFn<T>` can be used to enforce the typing of your predicate functions:

```ts
function isUsersNotYetFetched(
  // store is your storage implementation and could be anything
  store: Store
): PredicateFn<AsyncProcessTestIdentifier> {
  return (/* asyncProcess instance is passed here */) => {
    return store.users.length === 0
  }
}

getAsyncProcessInstance('initUsersPage')
  // .do(...)
  .if(isUsersNotYetFetched(store))
  .start()
```

You can add as many predicate functions as you want, all need to be resolved as a `Promise<boolean>` to trigger the process:

```ts
getAsyncProcessInstance('initUsersPage')
  // .do(...)
  .if(asyncProcess => somethingToDo())
  .if(usersNotYetFetched())
  .if(isFeatureFlagEnabled())
  .start()
```

#### `olderThan` predicate

This predicate is exposed in the library and can be used as an example of a more flexible way to keep data in "cache" (by not starting the process).

For example, to avoid to fetch users during 60 seconds, you can use the predicate as it:

```ts
import { olderThan, cancelOlderThanDelay } from 'asyncprocess'

getAsyncProcessInstance('initUsersPage')
  // the process is a `fetchUsers` function that should save users somewhere in a store
  .do(fetchUsers)
  // Avoid calling process during 60 seconds
  .if(olderThan(60))
  .start()
```

If you need to invalid the delay, you can use the `cancelOlderThanDelay` function:

```ts
cancelOlderThanDelay('initUsersPage')
```

It's interesting to note that [predicate implementation](./src/AsyncProcess/predicates/olderThan.ts) leverages on some metadata (the delay) saved in the `AsyncProcess` instance, retrieved thanks to the singleton design.

### Composition

`AsyncProcess` supports composition by merging the functions of existing instances. It is very useful to mutalize behaviors between `AsyncProcess` instances.

#### `withLogs` composite function

This composite function is exposed in the library and allows to log the start / success / error events:

```ts
const logger = console.log

getAsyncProcessInstance('initUsersPage')
  .do(fetchUsers)
  .compose(withLogs(logger))
  .start()
```

#### Composite functions and optional identifiers

To manage the unicity of composite functions in each AsyncProcess instance, you can leverage metadata saved in the AsyncProcess and use it as an optional identifier.

It allows guarantees that composite functions can't be registered twice except if it is intentional. For example:

```ts
getAsyncProcessInstance('initUsersPage')
  .do(fetchUsers)
  .compose(withLogs(logger))
  .compose(withLogs(logger, 'optionalIdentifierToAddASecondLogger'))
  .start()
```

See [`withLogs`](https://github.com/productive-codebases/async-process/blob/main/src/AsyncProcess/composers/withLogs.ts) implementation for reference.

## Live example

TODO
