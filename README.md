# Mongoose Aggregate Helper

`Mongoose Aggregate Helper` is a library that simplifies the process of creating complex aggregation pipelines with Mongoose, the MongoDB object modeling tool designed to work in an asynchronous environment.

## Features

- Fluent API for building MongoDB aggregation pipelines.
- Supports joins with automatic ObjectId conversion, matches, sorts, limits, skips, groups, and project stages.
- Type-safe queries with TypeScript support.
- Simplifies complex aggregations with method chaining.
- Convenient counting of documents in a pipeline with optional aliasing.

## Installation

```bash
npm install mongoose-aggregate-helper
# or
yarn add mongoose-aggregate-helper
```

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js
- Mongoose installed in your project

## Usage

Here's a quick example to get you started:

```javascript
import aggregate from 'mongoose-aggregate-helper';

// Your Mongoose model
import MyModel from './models/myModel';

// Creating an aggregation pipeline
const aggregateBuilder = aggregate(MyModel)
  .join({
    collection: 'relatedCollection',
    link: ['#localField', 'foreignField'], // '#' indicates conversion to ObjectId
    select: 'field1 field2',
    populate: 'joinedData', // Optional, renames the joined data
    preserveNullAndEmptyArrays: false // Optional, controls the behavior of $unwind
  })
  .match({ status: 'active' })
  .sort({ createdAt: -1 })
  .limit(10)
  .select('field3 field4'); // Optional, selects specific fields

const count = await aggregateBuilder.count('activeCount'); // Returns the count with an alias
const result = await aggregateBuilder.exec(); // Returns the aggregated documents
```

## API Reference

### `join(config)`

- `config.collection`: The name of the collection to join.
- `config.link`: An array with the local and foreign field names. Prefix the local field with '#' to convert to ObjectId.
- `config.select`: The fields to select from the joined collection.
- `config.populate`: Optional. If true, uses the local field name. If a string, uses that string as the new field name.
- `config.preserveNullAndEmptyArrays`: Optional. Controls the behavior of the `$unwind` stage.

### `match<U>(condition)`

- `condition`: The match condition.

### `sort(config)`

- `config`: An object specifying the fields to sort by and their sort order.

### `limit(count)`

- `count`: The maximum number of documents to return.

### `skip(count)`

- `count`: The number of documents to skip.

### `group(config)`

- `config`: The configuration for the group stage.

### `select(fields)`

- `fields`: The fields to include in the results. Can be a space-separated string (e.g., 'field1 field2') or an object specifying the inclusion of fields (e.g., `{ field1: 1, field2: 1 }`). If not called, all fields are included by default.

### `count(as)`

- `as`: Optional. The alias for the count field. Defaults to `total`.

### `exec()`

- Executes the aggregate pipeline and returns the result.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## Acknowledgements

- [Mongoose 5 or above](https://mongoosejs.com/)
- [MongoDB 4 or above](https://www.mongodb.com/)

## Peer Dependencies

This library requires Mongoose to be installed in your project. If you haven't already installed Mongoose, you can add it with the following command:

```bash
npm install mongoose
```
